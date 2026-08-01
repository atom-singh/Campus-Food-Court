import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import type { OutletDoc, MealSlotDoc, MenuCategoryDoc, MenuItemDoc } from "@/lib/firestoreTypes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const outletDoc = await db.collection("outlets").doc(id).get();
  if (!outletDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [slotsSnap, categoriesSnap, itemsSnap] = await Promise.all([
    db.collection("mealSlots").where("outletId", "==", id).get(),
    db.collection("menuCategories").where("outletId", "==", id).get(),
    db.collection("menuItems").where("outletId", "==", id).get(),
  ]);

  const mealSlots = slotsSnap.docs.map((s) => ({ id: s.id, ...(s.data() as MealSlotDoc) }));
  const slotById = new Map(mealSlots.map((s) => [s.id, s]));

  const items = itemsSnap.docs.map((d) => {
    const data = d.data() as MenuItemDoc;
    const slotIds = data.slotIds ?? [];
    return {
      id: d.id,
      ...data,
      slots: slotIds
        .map((sid) => slotById.get(sid))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({ id: s.id, type: s.type })),
    };
  });

  const categories = categoriesSnap.docs
    .map((c) => ({ id: c.id, ...(c.data() as MenuCategoryDoc) }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      ...c,
      items: items.filter((i) => i.categoryId === c.id),
    }));

  const outlet = {
    id: outletDoc.id,
    ...(outletDoc.data() as OutletDoc),
    mealSlots,
    categories,
  };

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

  const ref = db.collection("outlets").doc(id);
  await ref.update(allowed);
  const outlet = { id, ...((await ref.get()).data() as OutletDoc) };

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
