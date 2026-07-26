"use client";

import { useEffect, useMemo, useState } from "react";
import { useCampusEvents } from "@/lib/useCampusEvents";
import { SLOT_LABELS, FULFILLMENT_LABELS } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/ui";

type OrderItem = { nameSnapshot: string; priceSnapshot: number; quantity: number };
type Order = {
  id: string;
  status: string;
  slotType: string;
  fulfillmentType: string;
  desiredTime: string;
  totalAmount: number;
  etaMinutes: number;
  notes: string;
  createdAt: string;
  employee: { name: string };
  items: OrderItem[];
};

const COLUMNS: { key: string; label: string; tint: string }[] = [
  { key: "PLACED", label: "New", tint: "border-t-blue-400" },
  { key: "ACCEPTED", label: "Accepted", tint: "border-t-neutral-400" },
  { key: "PREPARING", label: "Preparing", tint: "border-t-amber-400" },
  { key: "READY", label: "Ready for pickup", tint: "border-t-emerald-400" },
  { key: "HANDED_OVER", label: "Handed over", tint: "border-t-purple-400" },
];

function minutesAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  return Math.floor(diff / 60000);
}

export default function LiveOrdersBoard({ outletId }: { outletId: string }) {
  const { show } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [delayingId, setDelayingId] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(10);

  async function load() {
    const res = await fetch(`/api/orders?outletId=${outletId}&active=true`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const interval = setInterval(load, 15000); // fallback polling if SSE drops
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  useCampusEvents(
    (event) => {
      if (event.type === "order.placed") {
        show("New order received", "info");
        load();
      }
      if (event.type === "order.status_changed") load();
    },
    { outletId }
  );

  async function updateStatus(orderId: string, status: string, extra?: Record<string, unknown>) {
    setBusyId(orderId);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      show(data.error ?? "Could not update order", "error");
    }
    load();
  }

  const grouped = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const o of orders) {
      if (map[o.status]) map[o.status].push(o);
    }
    return map;
  }, [orders]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Live Orders</h1>
        <span className="text-xs text-neutral-400">Auto-refreshes in real time</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className={`bg-neutral-100/70 rounded-2xl p-3 min-h-[220px] border-t-4 ${col.tint}`}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-sm text-neutral-700">{col.label}</h3>
              <span className="text-xs bg-white shadow-sm rounded-full px-2 py-0.5 font-medium text-neutral-600">
                {loading ? "…" : grouped[col.key].length}
              </span>
            </div>
            <div className="space-y-3">
              {loading && (
                <>
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </>
              )}
              {!loading &&
                grouped[col.key].map((o) => {
                  const age = minutesAgo(o.createdAt);
                  const overdue = col.key === "PLACED" && age >= 2;
                  return (
                    <div
                      key={o.id}
                      className={`rounded-xl border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md ${
                        overdue ? "border-red-400 ring-2 ring-red-100" : "border-neutral-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm text-neutral-900">{o.employee.name}</p>
                        <span className="text-xs text-neutral-400">{age}m ago</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {SLOT_LABELS[o.slotType]} · {FULFILLMENT_LABELS[o.fulfillmentType]}
                        {o.desiredTime ? ` · ${o.desiredTime}` : ""}
                      </p>
                      <ul className="text-xs mt-2 text-neutral-700 space-y-0.5">
                        {o.items.map((it, idx) => (
                          <li key={idx}>
                            {it.quantity} × {it.nameSnapshot}
                          </li>
                        ))}
                      </ul>
                      {o.notes && (
                        <p className="text-xs italic text-neutral-500 mt-1.5 bg-neutral-50 rounded px-1.5 py-1">
                          &quot;{o.notes}&quot;
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="font-semibold text-sm text-neutral-900">₹{o.totalAmount}</span>
                        <span className="text-xs text-neutral-500">ETA {o.etaMinutes}m</span>
                      </div>

                      {overdue && (
                        <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                          <span>⚠</span> Unactioned for {age} min
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {col.key === "PLACED" && (
                          <>
                            <button
                              disabled={busyId === o.id}
                              onClick={() => updateStatus(o.id, "ACCEPTED")}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              disabled={busyId === o.id}
                              onClick={() => setRejectingId(o.id)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              disabled={busyId === o.id}
                              onClick={() => setDelayingId(o.id)}
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
                            >
                              Delay
                            </button>
                          </>
                        )}
                        {col.key === "ACCEPTED" && (
                          <button
                            disabled={busyId === o.id}
                            onClick={() => updateStatus(o.id, "PREPARING")}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                          >
                            Start preparing
                          </button>
                        )}
                        {col.key === "PREPARING" && (
                          <button
                            disabled={busyId === o.id}
                            onClick={() => updateStatus(o.id, "READY")}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                          >
                            Mark ready
                          </button>
                        )}
                        {col.key === "READY" && (
                          <button
                            disabled={busyId === o.id}
                            onClick={() => updateStatus(o.id, "HANDED_OVER")}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                          >
                            Handed over
                          </button>
                        )}
                        {col.key === "HANDED_OVER" && (
                          <button
                            disabled={busyId === o.id}
                            onClick={() => updateStatus(o.id, "COMPLETED")}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>

                      {rejectingId === o.id && (
                        <div className="mt-2 flex gap-1.5">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (item unavailable...)"
                            className="border border-neutral-200 rounded-lg px-2 py-1 text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-red-100"
                          />
                          <button
                            onClick={() => {
                              updateStatus(o.id, "REJECTED", { reason: rejectReason || "Rejected by outlet" });
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white font-medium"
                          >
                            Confirm
                          </button>
                        </div>
                      )}

                      {delayingId === o.id && (
                        <div className="mt-2 flex gap-1.5 items-center">
                          <input
                            type="number"
                            min={1}
                            value={delayMinutes}
                            onChange={(e) => setDelayMinutes(Number(e.target.value))}
                            className="border border-neutral-200 rounded-lg px-2 py-1 text-xs w-16"
                          />
                          <span className="text-xs text-neutral-500">min ETA</span>
                          <button
                            onClick={() => {
                              updateStatus(o.id, o.status, { etaMinutes: delayMinutes });
                              setDelayingId(null);
                              show(`ETA updated to ${delayMinutes} min`, "info");
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-amber-600 text-white font-medium"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              {!loading && grouped[col.key].length === 0 && (
                <p className="text-xs text-neutral-400 text-center py-6">No orders</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
