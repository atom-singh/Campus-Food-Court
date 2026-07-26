import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import { NEXT_STATUS } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "KITCHEN_STAFF", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status, reason, etaMinutes } = await req.json();

  const order = await prisma.order.findUnique({ where: { id }, include: { outlet: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (user.role !== "CAMPUS_ADMIN" && user.outletId !== order.outletId) {
    return NextResponse.json({ error: "Not your outlet" }, { status: 403 });
  }

  const isDelayOnly = status === order.status;
  const allowedNext = NEXT_STATUS[order.status] ?? [];
  if (!isDelayOnly && !allowedNext.includes(status)) {
    return NextResponse.json(
      { error: `Cannot move order from ${order.status} to ${status}` },
      { status: 409 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      rejectReason: status === "REJECTED" ? reason ?? "" : order.rejectReason,
      etaMinutes: etaMinutes ?? order.etaMinutes,
      statusEvents: {
        create: {
          status,
          note: isDelayOnly ? `Delayed — new ETA ${etaMinutes ?? order.etaMinutes} min${reason ? `: ${reason}` : ""}` : reason ?? "",
        },
      },
    },
    include: { items: true, outlet: true, employee: true, statusEvents: { orderBy: { createdAt: "asc" } } },
  });

  publishEvent({
    type: "order.status_changed",
    campusId: order.outlet.campusId,
    outletId: order.outletId,
    employeeId: order.employeeId,
    payload: { order: updated },
  });

  return NextResponse.json({ order: updated });
}
