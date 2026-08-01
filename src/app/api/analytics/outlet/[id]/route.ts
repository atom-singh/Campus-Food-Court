import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "KITCHEN_STAFF", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const ordersSnap = await db.collection("orders").where("outletId", "==", id).get();
  const orders = ordersSnap.docs.map((d) => d.data());

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const cancelledOrRejected = orders.filter((o) => ["CANCELLED", "REJECTED"].includes(o.status));

  const totalRevenue = completed.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrders = orders.length;
  const cancellationRate = totalOrders ? cancelledOrRejected.length / totalOrders : 0;

  const bySlot: Record<string, number> = {};
  for (const o of orders) {
    bySlot[o.slotType] = (bySlot[o.slotType] ?? 0) + 1;
  }

  const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of completed) {
    for (const item of o.items ?? []) {
      const cur = itemCounts.get(item.menuItemId) ?? { name: item.nameSnapshot, qty: 0, revenue: 0 };
      cur.qty += item.quantity;
      cur.revenue += item.quantity * item.priceSnapshot;
      itemCounts.set(item.menuItemId, cur);
    }
  }
  const topItems = [...itemCounts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    completedOrders: completed.length,
    cancellationRate,
    ordersBySlot: bySlot,
    topItems,
  });
}
