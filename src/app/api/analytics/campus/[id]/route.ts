import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || user.role !== "CAMPUS_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const outlets = await prisma.outlet.findMany({
    where: { campusId: id },
    include: { orders: true },
  });

  const summary = outlets.map((o) => {
    const completed = o.orders.filter((x) => x.status === "COMPLETED");
    const active = o.orders.filter((x) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(x.status));
    return {
      outletId: o.id,
      name: o.name,
      isOpen: o.isOpen,
      isPaused: o.isPaused,
      totalOrders: o.orders.length,
      activeOrders: active.length,
      revenue: completed.reduce((s, x) => s + x.totalAmount, 0),
    };
  });

  return NextResponse.json({
    outlets: summary,
    totals: {
      revenue: summary.reduce((s, o) => s + o.revenue, 0),
      orders: summary.reduce((s, o) => s + o.totalOrders, 0),
      activeOrders: summary.reduce((s, o) => s + o.activeOrders, 0),
    },
  });
}
