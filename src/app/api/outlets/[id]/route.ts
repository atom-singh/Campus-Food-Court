import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const outlet = await prisma.outlet.findUnique({
    where: { id },
    include: {
      mealSlots: true,
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            include: { addOns: true, slots: true },
          },
        },
      },
    },
  });

  if (!outlet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ outlet });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  for (const key of [
    "name",
    "isOpen",
    "isPaused",
    "pauseReason",
    "openTime",
    "closeTime",
    "maxConcurrentOrders",
  ]) {
    if (key in body) allowed[key] = body[key];
  }

  const outlet = await prisma.outlet.update({ where: { id }, data: allowed });

  publishEvent({
    type: "outlet.status_changed",
    campusId: outlet.campusId,
    outletId: outlet.id,
    payload: {
      isOpen: outlet.isOpen,
      isPaused: outlet.isPaused,
      pauseReason: outlet.pauseReason,
    },
  });

  return NextResponse.json({ outlet });
}
