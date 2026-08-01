import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const { categoryId, name, description, price, isVeg, imageEmoji, slotIds } = body;
  if (!categoryId || !name || price === undefined) {
    return NextResponse.json({ error: "categoryId, name, price are required" }, { status: 400 });
  }

  const data = {
    outletId: id,
    categoryId,
    name,
    description: description ?? "",
    price: Number(price),
    isVeg: isVeg ?? true,
    allergenTags: "",
    isPublished: true,
    isSoldOut: false,
    imageEmoji: imageEmoji ?? "🍽️",
    slotIds: slotIds ?? [],
    addOns: [],
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection("menuItems").add(data);

  const slotsSnap = slotIds?.length
    ? await db.collection("mealSlots").where("outletId", "==", id).get()
    : null;
  const slots = slotsSnap
    ? slotsSnap.docs
        .filter((s) => slotIds.includes(s.id))
        .map((s) => ({ id: s.id, type: s.data().type }))
    : [];

  const item = { id: ref.id, ...data, slots };

  const outletDoc = await db.collection("outlets").doc(id).get();
  if (outletDoc.exists) {
    publishEvent({
      type: "menu_item.updated",
      campusId: outletDoc.data()!.campusId,
      outletId: id,
      payload: { itemId: item.id, action: "created" },
    });
  }

  return NextResponse.json({ item }, { status: 201 });
}
