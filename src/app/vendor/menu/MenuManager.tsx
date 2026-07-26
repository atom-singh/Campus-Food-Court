"use client";

import { useEffect, useState } from "react";
import { useCampusEvents } from "@/lib/useCampusEvents";
import { SLOT_LABELS } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { Badge, Skeleton } from "@/components/ui";

type MealSlot = { id: string; type: string; isActive: boolean };
type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isSoldOut: boolean;
  isPublished: boolean;
  imageEmoji: string;
  categoryId: string;
  slots: { id: string; type: string }[];
};
type Category = { id: string; name: string; items: MenuItem[] };
type Outlet = { id: string; mealSlots: MealSlot[]; categories: Category[] };

export default function MenuManager({ outletId, canEdit }: { outletId: string; canEdit: boolean }) {
  const { show } = useToast();
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "", isVeg: true, emoji: "🍽️", slotIds: [] as string[] });

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

  useCampusEvents(
    (event) => {
      if (["menu_item.availability_changed", "menu_item.updated", "meal_slot.toggled"].includes(event.type)) {
        load();
      }
    },
    { outletId }
  );

  async function toggleSoldOut(item: MenuItem) {
    await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSoldOut: !item.isSoldOut }),
    });
    show(!item.isSoldOut ? `${item.name} marked sold out` : `${item.name} is available again`, "success");
    load();
  }

  async function togglePublished(item: MenuItem) {
    await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.isPublished }),
    });
    load();
  }

  async function updatePrice(item: MenuItem, price: string) {
    const num = Number(price);
    if (Number.isNaN(num) || num <= 0) return;
    await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: num }),
    });
    show(`Price updated to ₹${num}`, "success");
    load();
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Remove "${item.name}" from the menu?`)) return;
    await fetch(`/api/menu-items/${item.id}`, { method: "DELETE" });
    show(`${item.name} removed`, "info");
    load();
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    await fetch(`/api/outlets/${outletId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });
    setNewCategoryName("");
    load();
  }

  async function addItem(categoryId: string) {
    if (!form.name.trim() || !form.price) return;
    await fetch(`/api/outlets/${outletId}/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        name: form.name,
        price: form.price,
        description: form.description,
        isVeg: form.isVeg,
        imageEmoji: form.emoji,
        slotIds: form.slotIds,
      }),
    });
    show(`${form.name} added to menu`, "success");
    setForm({ name: "", price: "", description: "", isVeg: true, emoji: "🍽️", slotIds: [] });
    setAddingItemFor(null);
    load();
  }

  if (!outlet) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Menu &amp; Stock</h1>
        {!canEdit && (
          <span className="text-xs text-neutral-500 bg-neutral-100 rounded-full px-3 py-1">
            Kitchen staff can mark items sold out. Contact your outlet manager for menu/price changes.
          </span>
        )}
      </div>

      {canEdit && (
        <div className="mb-6 flex gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name (e.g. Beverages)"
            className="border border-neutral-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
          <button
            onClick={addCategory}
            className="text-sm px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 font-medium transition-colors"
          >
            Add category
          </button>
        </div>
      )}

      <div className="space-y-6">
        {outlet.categories.map((cat) => (
          <div key={cat.id} className="border border-neutral-200 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-neutral-900">{cat.name}</h3>
              {canEdit && (
                <button
                  onClick={() => setAddingItemFor(addingItemFor === cat.id ? null : cat.id)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 font-medium transition-colors"
                >
                  + Add item
                </button>
              )}
            </div>

            {addingItemFor === cat.id && (
              <div className="mb-4 border border-dashed border-neutral-300 rounded-xl p-3.5 space-y-2 bg-neutral-50">
                <div className="grid sm:grid-cols-4 gap-2">
                  <input
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="border border-neutral-200 rounded-lg px-2 py-1.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Price ₹"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="border border-neutral-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Emoji"
                    value={form.emoji}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="border border-neutral-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <input
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="border border-neutral-200 rounded-lg px-2 py-1.5 text-sm w-full"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={form.isVeg}
                      onChange={(e) => setForm((f) => ({ ...f, isVeg: e.target.checked }))}
                    />
                    Veg
                  </label>
                  {outlet.mealSlots.map((s) => (
                    <label key={s.id} className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={form.slotIds.includes(s.id)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            slotIds: e.target.checked
                              ? [...f.slotIds, s.id]
                              : f.slotIds.filter((id) => id !== s.id),
                          }))
                        }
                      />
                      {SLOT_LABELS[s.type]}
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => addItem(cat.id)}
                  className="text-xs px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                  Save item
                </button>
              </div>
            )}

            <div className="divide-y divide-neutral-100">
              {cat.items.map((item) => (
                <div key={item.id} className="py-3 flex items-center gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center text-lg">
                    {item.imageEmoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${!item.isPublished ? "text-neutral-400" : "text-neutral-900"}`}>
                        {item.name}
                      </p>
                      <div className="flex gap-1">
                        {item.slots.map((s) => (
                          <span key={s.id} className="text-[10px] bg-neutral-100 text-neutral-500 rounded-full px-1.5 py-0.5">
                            {SLOT_LABELS[s.type]}
                          </span>
                        ))}
                      </div>
                      {!item.isPublished && <Badge tone="neutral">Draft</Badge>}
                    </div>
                    {canEdit ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-neutral-500">₹</span>
                        <input
                          defaultValue={item.price}
                          onBlur={(e) => updatePrice(item, e.target.value)}
                          className="border border-neutral-200 rounded px-1.5 py-0.5 text-xs w-20 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">₹{item.price}</p>
                    )}
                  </div>

                  <button
                    onClick={() => toggleSoldOut(item)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      item.isSoldOut
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {item.isSoldOut ? "Sold out" : "Mark sold out"}
                  </button>

                  {canEdit && (
                    <>
                      <button
                        onClick={() => togglePublished(item)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
                      >
                        {item.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
              {cat.items.length === 0 && <p className="text-xs text-neutral-400 py-3">No items in this category yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
