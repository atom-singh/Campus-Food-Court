import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import type { MealSlotDoc, OutletDoc } from "@/lib/firestoreTypes";

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

  const ref = db.collection("mealSlots").doc(slotId);
  await ref.update(allowed);
  const slot = { id: slotId, ...((await ref.get()).data() as MealSlotDoc) };

  const outletDoc = await db.collection("outlets").doc(id).get();
  if (outletDoc.exists) {
    publishEvent({
      type: "meal_slot.toggled",
      campusId: (outletDoc.data() as OutletDoc).campusId,
      outletId: id,
      payload: { slotId: slot.id, type: slot.type, isActive: slot.isActive },
    });
  }

  return NextResponse.json({ slot });
}
