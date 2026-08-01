import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import type { MenuItemDoc, OutletDoc } from "@/lib/firestoreTypes";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN", "KITCHEN_STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Kitchen staff may only toggle sold-out status; managers/admins can edit everything.
  const managerFields = ["name", "description", "price", "isVeg", "isPublished", "imageEmoji", "categoryId"];
  const allowed: Record<string, unknown> = {};
  if (user.role === "KITCHEN_STAFF") {
    if ("isSoldOut" in body) allowed.isSoldOut = body.isSoldOut;
  } else {
    for (const key of [...managerFields, "isSoldOut"]) {
      if (key in body) allowed[key] = key === "price" ? Number(body[key]) : body[key];
    }
  }

  const ref = db.collection("menuItems").doc(id);
  await ref.update(allowed);
  const item = { id, ...((await ref.get()).data() as MenuItemDoc) };
  const outletDoc = await db.collection("outlets").doc(item.outletId).get();

  publishEvent({
    type: "menu_item.availability_changed",
    campusId: outletDoc.exists ? (outletDoc.data() as OutletDoc).campusId : "",
    outletId: item.outletId,
    payload: { itemId: item.id, isSoldOut: item.isSoldOut, isPublished: item.isPublished, price: item.price },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const ref = db.collection("menuItems").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = snap.data()!;
  const outletDoc = await db.collection("outlets").doc(item.outletId).get();
  await ref.delete();

  publishEvent({
    type: "menu_item.updated",
    campusId: outletDoc.exists ? outletDoc.data()!.campusId : "",
    outletId: item.outletId,
    payload: { itemId: id, action: "deleted" },
  });

  return NextResponse.json({ ok: true });
}
