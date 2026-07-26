"use client";

import { useEffect, useState } from "react";
import { SLOT_LABELS } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Skeleton } from "@/components/ui";

type MealSlot = { id: string; type: string; startTime: string; endTime: string; isActive: boolean; capacity: number };
type Outlet = {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  maxConcurrentOrders: number;
  mealSlots: MealSlot[];
};

export default function TimingManager({ outletId }: { outletId: string }) {
  const { show } = useToast();
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/outlets/${outletId}`);
    const data = await res.json();
    setOutlet(data.outlet);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  async function toggleSlot(slot: MealSlot) {
    await fetch(`/api/outlets/${outletId}/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !slot.isActive }),
    });
    show(
      !slot.isActive ? `${SLOT_LABELS[slot.type]} turned on` : `${SLOT_LABELS[slot.type]} turned off for today`,
      "success"
    );
    load();
  }

  async function updateSlot(slot: MealSlot, changes: Partial<MealSlot>) {
    await fetch(`/api/outlets/${outletId}/slots/${slot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    show(`${SLOT_LABELS[slot.type]} updated`, "success");
    load();
  }

  async function saveOutletTiming(changes: Partial<Outlet>) {
    setSaving(true);
    await fetch(`/api/outlets/${outletId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    setSaving(false);
    show("Store settings saved", "success");
    load();
  }

  if (!outlet) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Store Timing &amp; Meal Slots</h1>

      <div className="border border-neutral-200 rounded-2xl bg-white p-5 mb-6 shadow-sm">
        <h3 className="font-semibold text-neutral-900 mb-3">Store hours &amp; capacity</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-600">Opens at</label>
            <input
              type="time"
              defaultValue={outlet.openTime}
              onBlur={(e) => saveOutletTiming({ openTime: e.target.value })}
              className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Closes at</label>
            <input
              type="time"
              defaultValue={outlet.closeTime}
              onBlur={(e) => saveOutletTiming({ closeTime: e.target.value })}
              className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">
              Max concurrent active orders (capacity cap)
            </label>
            <input
              type="number"
              min={1}
              defaultValue={outlet.maxConcurrentOrders}
              onBlur={(e) => saveOutletTiming({ maxConcurrentOrders: Number(e.target.value) })}
              className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>
        </div>
        {saving && <p className="text-xs text-neutral-400 mt-2">Saving…</p>}
      </div>

      <div className="border border-neutral-200 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-neutral-900 mb-3">Meal slots</h3>
        <div className="space-y-3">
          {outlet.mealSlots.map((slot) => (
            <div
              key={slot.id}
              className={`flex flex-wrap items-center gap-3 border rounded-xl p-3.5 transition-colors ${
                slot.isActive ? "border-neutral-200" : "border-neutral-200 bg-neutral-50"
              }`}
            >
              <span className="font-medium w-24 text-neutral-900">{SLOT_LABELS[slot.type]}</span>
              <input
                type="time"
                defaultValue={slot.startTime}
                onBlur={(e) => updateSlot(slot, { startTime: e.target.value })}
                className="border border-neutral-200 rounded-lg px-2 py-1 text-sm"
              />
              <span className="text-neutral-400 text-sm">to</span>
              <input
                type="time"
                defaultValue={slot.endTime}
                onBlur={(e) => updateSlot(slot, { endTime: e.target.value })}
                className="border border-neutral-200 rounded-lg px-2 py-1 text-sm"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500">Cap</span>
                <input
                  type="number"
                  min={1}
                  defaultValue={slot.capacity}
                  onBlur={(e) => updateSlot(slot, { capacity: Number(e.target.value) })}
                  className="border border-neutral-200 rounded-lg px-2 py-1 text-sm w-16"
                />
              </div>
              <button
                onClick={() => toggleSlot(slot)}
                className={`ml-auto text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  slot.isActive
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {slot.isActive ? "Turn off for today" : "Turn on"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
