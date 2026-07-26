import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, slotId } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  for (const key of ["isActive", "startTime", "endTime", "capacity"]) {
    if (key in body) allowed[key] = body[key];
  }

  const slot = await prisma.mealSlot.update({
    where: { id: slotId },
    data: allowed,
  });

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (outlet) {
    publishEvent({
      type: "meal_slot.toggled",
      campusId: outlet.campusId,
      outletId: id,
      payload: { slotId: slot.id, type: slot.type, isActive: slot.isActive },
    });
  }

  return NextResponse.json({ slot });
}
