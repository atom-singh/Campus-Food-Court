"use client";

import { useEffect, useState } from "react";
import { SLOT_LABELS } from "@/lib/types";
import { StatCard, Skeleton, EmptyState } from "@/components/ui";

type Analytics = {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancellationRate: number;
  ordersBySlot: Record<string, number>;
  topItems: { name: string; qty: number; revenue: number }[];
};

export default function AnalyticsView({ outletId }: { outletId: string }) {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch(`/api/analytics/outlet/${outletId}`)
      .then((r) => r.json())
      .then(setData);
  }, [outletId]);

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const maxSlotCount = Math.max(1, ...Object.values(data.ordersBySlot));

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Analytics</h1>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total revenue" value={`₹${data.totalRevenue.toFixed(0)}`} accent="success" />
        <StatCard label="Total orders" value={data.totalOrders} />
        <StatCard label="Completed" value={data.completedOrders} accent="success" />
        <StatCard
          label="Cancellation rate"
          value={`${(data.cancellationRate * 100).toFixed(0)}%`}
          accent={data.cancellationRate > 0.15 ? "danger" : "neutral"}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="border border-neutral-200 rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-3">Orders by meal slot (peak demand)</h3>
          <div className="space-y-2.5">
            {Object.entries(data.ordersBySlot).map(([slot, count]) => (
              <div key={slot} className="flex items-center gap-2">
                <span className="text-xs w-20 text-neutral-600">{SLOT_LABELS[slot] ?? slot}</span>
                <div className="flex-1 bg-neutral-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-neutral-700 to-neutral-900 h-3 rounded-full transition-all"
                    style={{ width: `${(count / maxSlotCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs w-6 text-right text-neutral-700 font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-neutral-200 rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-3">Top selling items</h3>
          {data.topItems.length === 0 ? (
            <EmptyState icon="📊" title="No completed orders yet" description="Sales data appears once orders complete." />
          ) : (
            <ol className="space-y-2.5">
              {data.topItems.map((item, idx) => (
                <li key={item.name} className="flex justify-between text-sm items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {item.name} <span className="text-neutral-400">× {item.qty}</span>
                  </span>
                  <span className="font-medium text-neutral-900">₹{item.revenue.toFixed(0)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
