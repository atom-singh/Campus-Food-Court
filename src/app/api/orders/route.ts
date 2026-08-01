import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import { serializeOrder } from "@/lib/serializeOrder";
import type { OutletDoc, MealSlotDoc, MenuItemDoc, OrderDoc } from "@/lib/firestoreTypes";

const TERMINAL = ["COMPLETED", "REJECTED", "CANCELLED"];

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const mine = searchParams.get("mine");
  const activeOnly = searchParams.get("active") === "true";

  let query: FirebaseFirestore.Query = db.collection("orders");
  if (user.role === "EMPLOYEE" || mine === "true") {
    query = query.where("employeeId", "==", user.id);
  } else if (outletId) {
    query = query.where("outletId", "==", outletId);
  } else if (user.outletId) {
    query = query.where("outletId", "==", user.outletId);
  } else {
    query = query.where("campusId", "==", user.campusId);
  }

  // Sorting/filtering happens in memory rather than via orderBy/not-in so this
  // never needs a Firestore composite index at this app's order volume.
  const snap = await query.get();
  let orders = snap.docs
    .map((d) => serializeOrder(d.id, d.data() as OrderDoc))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (activeOnly) {
    orders = orders.filter((o) => !TERMINAL.includes(o.status));
  }

  return NextResponse.json({ orders: orders.slice(0, 100) });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can place orders" }, { status: 403 });
  }

  const body = await req.json();
  const { outletId, fulfillmentType, slotType, desiredTime, notes, items } = body as {
    outletId: string;
    fulfillmentType: string;
    slotType: string;
    desiredTime: string;
    notes?: string;
    items: { menuItemId: string; quantity: number }[];
  };

  if (!outletId || !items?.length) {
    return NextResponse.json({ error: "outletId and items are required" }, { status: 400 });
  }

  const outletDoc = await db.collection("outlets").doc(outletId).get();
  if (!outletDoc.exists) return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
  const outlet = outletDoc.data() as OutletDoc;
  if (!outlet.isOpen || outlet.isPaused) {
    return NextResponse.json({ error: "Outlet is currently not accepting orders" }, { status: 409 });
  }

  const slotsSnap = await db.collection("mealSlots").where("outletId", "==", outletId).get();
  const slot = slotsSnap.docs.map((s) => s.data() as MealSlotDoc).find((s) => s.type === slotType);
  if (!slot || !slot.isActive) {
    return NextResponse.json({ error: "Selected meal slot is not available" }, { status: 409 });
  }

  const outletOrdersSnap = await db.collection("orders").where("outletId", "==", outletId).get();
  const activeCount = outletOrdersSnap.docs.filter((d) => !TERMINAL.includes((d.data() as OrderDoc).status)).length;
  if (activeCount >= outlet.maxConcurrentOrders) {
    return NextResponse.json(
      { error: "Outlet is at capacity for this slot. Please try again shortly." },
      { status: 409 }
    );
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItemDocs = await Promise.all(menuItemIds.map((id) => db.collection("menuItems").doc(id).get()));
  const menuItems = menuItemDocs.map((d) => (d.exists ? { id: d.id, ...(d.data() as MenuItemDoc) } : null));

  for (const reqItem of items) {
    const mi = menuItems.find((m) => m?.id === reqItem.menuItemId);
    if (!mi || mi.isSoldOut || !mi.isPublished || mi.outletId !== outletId) {
      return NextResponse.json(
        { error: `Item "${mi?.name ?? reqItem.menuItemId}" is no longer available` },
        { status: 409 }
      );
    }
  }

  const totalAmount = items.reduce((sum, reqItem) => {
    const mi = menuItems.find((m) => m?.id === reqItem.menuItemId)!;
    return sum + mi.price * reqItem.quantity;
  }, 0);

  const now = FieldValue.serverTimestamp();
  const orderData = {
    outletId,
    campusId: outlet.campusId,
    outletName: outlet.name,
    employeeId: user.id,
    employeeName: user.name,
    fulfillmentType,
    slotType,
    desiredTime: desiredTime ?? "",
    status: "PLACED",
    etaMinutes: 15,
    totalAmount,
    rejectReason: null,
    notes: notes ?? "",
    items: items.map((reqItem) => {
      const mi = menuItems.find((m) => m?.id === reqItem.menuItemId)!;
      return {
        menuItemId: mi.id,
        nameSnapshot: mi.name,
        priceSnapshot: mi.price,
        quantity: reqItem.quantity,
        addOnsSnapshot: "",
      };
    }),
    statusEvents: [{ status: "PLACED", note: "Order placed by employee", createdAt: new Date().toISOString() }],
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection("orders").add(orderData);
  const created = await ref.get();
  const order = serializeOrder(ref.id, created.data() as OrderDoc);

  publishEvent({
    type: "order.placed",
    campusId: outlet.campusId,
    outletId,
    employeeId: user.id,
    payload: { order },
  });

  return NextResponse.json({ order }, { status: 201 });
}
