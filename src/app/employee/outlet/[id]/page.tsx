"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCampusEvents } from "@/lib/useCampusEvents";
import { SLOT_LABELS, FULFILLMENT_LABELS } from "@/lib/types";
import { Badge, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";

type MealSlot = { id: string; type: string; startTime: string; endTime: string; isActive: boolean };
type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isSoldOut: boolean;
  isPublished: boolean;
  imageEmoji: string;
  slots: { id: string; type: string }[];
};
type Category = { id: string; name: string; items: MenuItem[] };
type Outlet = {
  id: string;
  name: string;
  isOpen: boolean;
  isPaused: boolean;
  pauseReason: string | null;
  mealSlots: MealSlot[];
  categories: Category[];
};

type CartLine = { menuItemId: string; name: string; price: number; quantity: number };

export default function OutletMenuPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [activeSlot, setActiveSlot] = useState<string>("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [fulfillmentType, setFulfillmentType] = useState("PICKUP");
  const [desiredTime, setDesiredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/outlets/${id}`);
    const data = await res.json();
    setOutlet(data.outlet);
    setActiveSlot((prev) => {
      if (prev) return prev;
      const firstActive = data.outlet?.mealSlots.find((s: MealSlot) => s.isActive);
      return firstActive?.type ?? data.outlet?.mealSlots[0]?.type ?? "";
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useCampusEvents(
    (event) => {
      if (
        ["menu_item.availability_changed", "menu_item.updated", "meal_slot.toggled", "outlet.status_changed"].includes(
          event.type
        )
      ) {
        load();
      }
    },
    { outletId: id }
  );

  const currentSlotMeta = outlet?.mealSlots.find((s) => s.type === activeSlot);
  const closed = !outlet || !outlet.isOpen || outlet.isPaused;

  const visibleItems = useMemo(() => {
    if (!outlet) return [] as { category: string; items: MenuItem[] }[];
    return outlet.categories
      .map((c) => ({
        category: c.name,
        items: c.items.filter((i) => i.isPublished && i.slots.some((s) => s.type === activeSlot)),
      }))
      .filter((c) => c.items.length > 0);
  }, [outlet, activeSlot]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    });
  }

  function changeQty(menuItemId: string, delta: number) {
    setCart((prev) => {
      const line = prev[menuItemId];
      if (!line) return prev;
      const nextQty = line.quantity + delta;
      const copy = { ...prev };
      if (nextQty <= 0) delete copy[menuItemId];
      else copy[menuItemId] = { ...line, quantity: nextQty };
      return copy;
    });
  }

  const cartLines = Object.values(cart);
  const total = cartLines.reduce((s, l) => s + l.price * l.quantity, 0);

  async function placeOrder() {
    setError("");
    if (!cartLines.length) return;
    setPlacing(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId: id,
        fulfillmentType,
        slotType: activeSlot,
        desiredTime,
        notes,
        items: cartLines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      }),
    });
    const data = await res.json();
    setPlacing(false);
    if (!res.ok) {
      const message = data.error ?? "Could not place order. Please try again.";
      setError(message);
      show(message, "error");
      load();
      return;
    }
    show("Order placed! Track it under My Orders.", "success");
    router.push("/employee/orders");
  }

  if (!outlet) {
    return (
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full" />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{outlet.name}</h1>
        {closed && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="font-bold">⚠</span>
            <span>
              This outlet is currently {outlet?.isPaused ? "paused" : "closed"}
              {outlet?.pauseReason ? ` — ${outlet.pauseReason}` : ""}. You can browse the menu but cannot place an
              order right now.
            </span>
          </p>
        )}

        <div className="mt-5 flex gap-2 flex-wrap">
          {outlet.mealSlots.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSlot(s.type)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeSlot === s.type
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                  : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
              } ${!s.isActive ? "opacity-50" : ""}`}
            >
              {SLOT_LABELS[s.type]} {!s.isActive && "· unavailable"}
            </button>
          ))}
        </div>
        {currentSlotMeta && (
          <p className="text-xs text-neutral-500 mt-2">
            Serving window: {currentSlotMeta.startTime}–{currentSlotMeta.endTime}
            {!currentSlotMeta.isActive && " · Vendor has currently turned off ordering for this slot"}
          </p>
        )}

        <div className="mt-6 space-y-8">
          {visibleItems.length === 0 && (
            <p className="text-neutral-500 py-8 text-center">No items available for this meal slot right now.</p>
          )}
          {visibleItems.map((cat) => (
            <div key={cat.category}>
              <h3 className="font-semibold text-neutral-800 mb-3">{cat.category}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {cat.items.map((item) => {
                  const disabled = closed || item.isSoldOut || !currentSlotMeta?.isActive;
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-3.5 flex items-start gap-3 bg-white transition-shadow ${
                        disabled ? "opacity-60 border-neutral-200" : "border-neutral-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="w-11 h-11 shrink-0 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-xl">
                        {item.imageEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block w-2.5 h-2.5 border rounded-sm shrink-0 ${
                              item.isVeg ? "border-emerald-600 bg-emerald-500" : "border-red-600 bg-red-500"
                            }`}
                          />
                          <p className="font-medium text-neutral-900 truncate">{item.name}</p>
                        </div>
                        {item.description && (
                          <p className="text-xs text-neutral-500 mt-0.5">{item.description}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-semibold text-neutral-900">₹{item.price}</span>
                          {item.isSoldOut ? (
                            <Badge tone="danger">Sold out</Badge>
                          ) : cart[item.id] ? (
                            <div className="flex items-center gap-2 bg-neutral-100 rounded-full px-1 py-1">
                              <button
                                onClick={() => changeQty(item.id, -1)}
                                className="w-6 h-6 rounded-full bg-white shadow-sm hover:bg-neutral-50 font-medium"
                              >
                                −
                              </button>
                              <span className="text-sm w-4 text-center font-medium">{cart[item.id].quantity}</span>
                              <button
                                onClick={() => addToCart(item)}
                                disabled={disabled}
                                className="w-6 h-6 rounded-full bg-white shadow-sm hover:bg-neutral-50 font-medium disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={disabled}
                              className="text-sm px-3.5 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-40 font-medium transition-colors"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="border border-neutral-200 rounded-2xl p-5 bg-white h-fit sticky top-24 shadow-sm">
        <h3 className="font-semibold text-neutral-900 mb-3">Your order</h3>
        {cartLines.length === 0 ? (
          <p className="text-sm text-neutral-500">Cart is empty. Add items from the menu to get started.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {cartLines.map((l) => (
                <div key={l.menuItemId} className="flex justify-between text-sm">
                  <span className="text-neutral-700">
                    {l.quantity} × {l.name}
                  </span>
                  <span className="font-medium text-neutral-900">₹{l.price * l.quantity}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-neutral-200 pt-2 flex justify-between font-semibold text-neutral-900">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            <div className="pt-1 space-y-2.5">
              <div>
                <label className="text-xs font-medium text-neutral-600">Fulfillment</label>
                <select
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                >
                  {Object.entries(FULFILLMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600">Pickup / delivery time</label>
                <input
                  type="time"
                  value={desiredTime}
                  onChange={(e) => setDesiredTime(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400"
                  placeholder="e.g. less spicy"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                <span className="font-bold shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={placing || closed || !currentSlotMeta?.isActive}
              className="w-full mt-1 bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {placing ? "Placing order…" : `Place order · ₹${total} (mock payment)`}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
