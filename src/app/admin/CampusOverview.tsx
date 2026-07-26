"use client";

import { useEffect, useState } from "react";
import { useCampusEvents } from "@/lib/useCampusEvents";
import { useToast } from "@/components/Toast";
import { Badge, StatCard, Skeleton } from "@/components/ui";

type OutletSummary = {
  outletId: string;
  name: string;
  isOpen: boolean;
  isPaused: boolean;
  totalOrders: number;
  activeOrders: number;
  revenue: number;
};

type Analytics = {
  outlets: OutletSummary[];
  totals: { revenue: number; orders: number; activeOrders: number };
};

export default function CampusOverview({ campusId }: { campusId: string }) {
  const { show } = useToast();
  const [data, setData] = useState<Analytics | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/analytics/campus/${campusId}`);
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  useCampusEvents((event) => {
    if (["order.placed", "order.status_changed", "outlet.status_changed"].includes(event.type)) {
      load();
    }
  });

  async function forceClose(outletId: string, name: string, close: boolean) {
    setBusyId(outletId);
    await fetch(`/api/outlets/${outletId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(close ? { isOpen: false } : { isOpen: true, isPaused: false, pauseReason: null }),
    });
    setBusyId(null);
    show(close ? `${name} force-closed` : `${name} reopened`, close ? "info" : "success");
    load();
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-80" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Campus Overview — Greenfield Tech Park</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Campus-wide revenue" value={`₹${data.totals.revenue.toFixed(0)}`} accent="success" />
        <StatCard label="Total orders" value={data.totals.orders} />
        <StatCard label="Active orders right now" value={data.totals.activeOrders} accent="warning" />
      </div>

      <div className="border border-neutral-200 rounded-2xl bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Outlet</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-right px-5 py-3 font-medium">Active orders</th>
              <th className="text-right px-5 py-3 font-medium">Total orders</th>
              <th className="text-right px-5 py-3 font-medium">Revenue</th>
              <th className="text-right px-5 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.outlets.map((o) => {
              const closed = !o.isOpen || o.isPaused;
              return (
                <tr key={o.outletId} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-neutral-900">{o.name}</td>
                  <td className="px-5 py-3">
                    <Badge tone={closed ? "danger" : "success"}>{closed ? (o.isPaused ? "Paused" : "Closed") : "Open"}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-700">{o.activeOrders}</td>
                  <td className="px-5 py-3 text-right text-neutral-700">{o.totalOrders}</td>
                  <td className="px-5 py-3 text-right font-medium text-neutral-900">₹{o.revenue.toFixed(0)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      disabled={busyId === o.outletId}
                      onClick={() => forceClose(o.outletId, o.name, o.isOpen)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        o.isOpen
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {o.isOpen ? "Force close" : "Reopen"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
