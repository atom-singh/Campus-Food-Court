"use client";

import { useEffect, useMemo, useState } from "react";
import { useCampusEvents } from "@/lib/useCampusEvents";
import { STATUS_LABELS, SLOT_LABELS, FULFILLMENT_LABELS } from "@/lib/types";
import { EmptyState, Skeleton, Badge } from "@/components/ui";

type StatusEvent = { status: string; note: string; createdAt: string };
type OrderItem = { nameSnapshot: string; priceSnapshot: number; quantity: number };
type Order = {
  id: string;
  status: string;
  slotType: string;
  fulfillmentType: string;
  desiredTime: string;
  totalAmount: number;
  etaMinutes: number;
  rejectReason: string | null;
  createdAt: string;
  outlet: { name: string };
  items: OrderItem[];
  statusEvents: StatusEvent[];
};

const STAGES = ["PLACED", "ACCEPTED", "PREPARING", "READY", "HANDED_OVER", "COMPLETED"];
const STAGE_META: Record<string, { icon: string; short: string }> = {
  PLACED: { icon: "📝", short: "Placed" },
  ACCEPTED: { icon: "👍", short: "Accepted" },
  PREPARING: { icon: "🍳", short: "Preparing" },
  READY: { icon: "🛎️", short: "Ready" },
  HANDED_OVER: { icon: "🤝", short: "Handed over" },
  COMPLETED: { icon: "✅", short: "Done" },
};

const AVATAR_TONES = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Stepper({ order }: { order: Order }) {
  const currentIdx = STAGES.indexOf(order.status);
  return (
    <div className="mt-5 flex items-start">
      {STAGES.map((stage, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        const upcoming = idx > currentIdx;
        return (
          <div key={stage} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                      ? "bg-white border-emerald-500 text-emerald-600 ring-4 ring-emerald-100"
                      : "bg-white border-neutral-200 text-neutral-300"
                }`}
              >
                {done ? "✓" : STAGE_META[stage].icon}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  upcoming ? "text-neutral-300" : active ? "text-emerald-700" : "text-neutral-500"
                }`}
              >
                {STAGE_META[stage].short}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full ${idx < currentIdx ? "bg-emerald-500" : "bg-neutral-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const isTerminalBad = ["REJECTED", "CANCELLED"].includes(order.status);
  const isDone = order.status === "COMPLETED";

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
        isTerminalBad ? "border-red-200" : "border-neutral-200"
      }`}
    >
      <div className={`h-1 ${isTerminalBad ? "bg-red-400" : isDone ? "bg-emerald-400" : "bg-gradient-to-r from-emerald-400 to-emerald-500"}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-base font-semibold ${toneFor(
                order.outlet.name
              )}`}
            >
              {order.outlet.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 truncate">{order.outlet.name}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {SLOT_LABELS[order.slotType]} · {FULFILLMENT_LABELS[order.fulfillmentType]}
                {order.desiredTime ? ` · ${order.desiredTime}` : ""}
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                #{order.id.slice(-6).toUpperCase()} · placed {timeAgo(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-neutral-900">₹{order.totalAmount}</p>
            {!isTerminalBad && (
              <Badge tone={isDone ? "success" : "info"}>{STATUS_LABELS[order.status]}</Badge>
            )}
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {order.items.map((i, idx) => (
            <span
              key={idx}
              className="text-xs bg-neutral-50 border border-neutral-100 text-neutral-600 rounded-full pl-1 pr-2.5 py-1 flex items-center gap-1.5"
            >
              <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-semibold flex items-center justify-center">
                {i.quantity}
              </span>
              {i.nameSnapshot}
            </span>
          ))}
        </div>

        {isTerminalBad ? (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 flex items-start gap-2">
            <span className="font-bold">✕</span>
            <span>
              Order {order.status === "REJECTED" ? "rejected by the outlet" : "cancelled"}
              {order.rejectReason ? `: ${order.rejectReason}` : ""}
            </span>
          </div>
        ) : (
          <>
            <Stepper order={order} />
            {!isDone && (
              <p className="text-xs text-neutral-400 mt-2 text-right">ETA ~{order.etaMinutes} min</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function EmployeeOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");

  async function load() {
    const res = await fetch("/api/orders?mine=true");
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  useCampusEvents((event) => {
    if (event.type === "order.status_changed" || event.type === "order.placed") {
      load();
    }
  });

  const { active, past } = useMemo(() => {
    const activeList = orders.filter((o) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(o.status));
    const pastList = orders.filter((o) => ["COMPLETED", "REJECTED", "CANCELLED"].includes(o.status));
    return { active: activeList, past: pastList };
  }, [orders]);

  const visible = tab === "active" ? active : past;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-neutral-900">My Orders</h1>
          {active.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <span className="relative flex w-1.5 h-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Updates automatically as the outlet processes your order.</p>

      <div className="flex gap-1 p-1 bg-neutral-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setTab("active")}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
            tab === "active" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Active {active.length > 0 && `(${active.length})`}
        </button>
        <button
          onClick={() => setTab("past")}
          className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
            tab === "past" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Past {past.length > 0 && `(${past.length})`}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="border border-neutral-200 rounded-2xl p-5 bg-white space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={tab === "active" ? "🧾" : "📭"}
          title={tab === "active" ? "No active orders" : "No past orders"}
          description={
            tab === "active"
              ? "Head to Browse to explore outlets and place your first order — it'll show up here instantly."
              : "Completed, rejected, and cancelled orders will appear here."
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
