import { NextRequest, NextResponse } from "next/server";
import { db, FieldValue } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import { NEXT_STATUS } from "@/lib/types";
import { serializeOrder } from "@/lib/serializeOrder";
import type { OrderDoc } from "@/lib/firestoreTypes";

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

  const ref = db.collection("orders").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = snap.data() as OrderDoc;

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

  const nextEtaMinutes = etaMinutes ?? order.etaMinutes;
  const newEvent = {
    status,
    note: isDelayOnly
      ? `Delayed — new ETA ${nextEtaMinutes} min${reason ? `: ${reason}` : ""}`
      : reason ?? "",
    createdAt: new Date().toISOString(),
  };

  await ref.update({
    status,
    rejectReason: status === "REJECTED" ? reason ?? "" : order.rejectReason,
    etaMinutes: nextEtaMinutes,
    statusEvents: FieldValue.arrayUnion(newEvent),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedSnap = await ref.get();
  const updated = serializeOrder(id, updatedSnap.data() as OrderDoc);

  publishEvent({
    type: "order.status_changed",
    campusId: order.campusId,
    outletId: order.outletId,
    employeeId: order.employeeId,
    payload: { order: updated },
  });

  return NextResponse.json({ order: updated });
}
