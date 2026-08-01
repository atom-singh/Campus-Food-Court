import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";
import type { OutletDoc, OrderDoc } from "@/lib/firestoreTypes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || user.role !== "CAMPUS_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const [outletsSnap, ordersSnap] = await Promise.all([
    db.collection("outlets").where("campusId", "==", id).get(),
    db.collection("orders").where("campusId", "==", id).get(),
  ]);

  const orders = ordersSnap.docs.map((d) => d.data() as OrderDoc);

  const summary = outletsSnap.docs.map((d) => {
    const o = { id: d.id, ...(d.data() as OutletDoc) };
    const outletOrders = orders.filter((x) => x.outletId === o.id);
    const completed = outletOrders.filter((x) => x.status === "COMPLETED");
    const active = outletOrders.filter((x) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(x.status));
    return {
      outletId: o.id,
      name: o.name,
      isOpen: o.isOpen,
      isPaused: o.isPaused,
      totalOrders: outletOrders.length,
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
