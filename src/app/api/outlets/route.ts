import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import type { OutletDoc, MealSlotDoc } from "@/lib/firestoreTypes";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const outletsSnap = await db.collection("outlets").where("campusId", "==", user.campusId).get();

  const outlets = await Promise.all(
    outletsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as OutletDoc) }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (o) => {
        const slotsSnap = await db.collection("mealSlots").where("outletId", "==", o.id).get();
        return {
          ...o,
          mealSlots: slotsSnap.docs.map((s) => ({ id: s.id, ...(s.data() as MealSlotDoc) })),
        };
      })
  );

  return NextResponse.json({ outlets });
}
