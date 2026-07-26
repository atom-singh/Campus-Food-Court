"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCampusEvents } from "@/lib/useCampusEvents";
import { SLOT_LABELS } from "@/lib/types";
import { Badge, EmptyState, Skeleton } from "@/components/ui";

type MealSlot = { id: string; type: string; startTime: string; endTime: string; isActive: boolean };
type Outlet = {
  id: string;
  name: string;
  cuisineTags: string;
  isOpen: boolean;
  isPaused: boolean;
  pauseReason: string | null;
  mealSlots: MealSlot[];
};

const CUISINE_STYLE: Record<string, { emoji: string; gradient: string }> = {
  Indian: { emoji: "🍛", gradient: "from-orange-400 to-amber-500" },
  "North Indian": { emoji: "🍛", gradient: "from-orange-400 to-amber-500" },
  Curries: { emoji: "🍛", gradient: "from-orange-400 to-amber-500" },
  Salads: { emoji: "🥗", gradient: "from-emerald-400 to-teal-500" },
  Healthy: { emoji: "🥗", gradient: "from-emerald-400 to-teal-500" },
  Continental: { emoji: "🥗", gradient: "from-emerald-400 to-teal-500" },
  Asian: { emoji: "🥡", gradient: "from-rose-400 to-pink-500" },
  Chinese: { emoji: "🥡", gradient: "from-rose-400 to-pink-500" },
  Noodles: { emoji: "🥡", gradient: "from-rose-400 to-pink-500" },
};
const DEFAULT_STYLE = { emoji: "🍴", gradient: "from-neutral-400 to-neutral-500" };

function styleFor(tags: string) {
  const key = Object.keys(CUISINE_STYLE).find((k) => tags.includes(k));
  return key ? CUISINE_STYLE[key] : DEFAULT_STYLE;
}

export default function EmployeeBrowsePage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | string>("all");

  async function load() {
    const res = await fetch("/api/outlets");
    const data = await res.json();
    setOutlets(data.outlets ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  useCampusEvents((event) => {
    if (event.type === "outlet.status_changed" || event.type === "meal_slot.toggled") {
      load();
    }
  });

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    outlets.forEach((o) => o.cuisineTags.split(",").forEach((t) => set.add(t.trim())));
    return Array.from(set).filter(Boolean).slice(0, 6);
  }, [outlets]);

  const openCount = outlets.filter((o) => o.isOpen && !o.isPaused).length;

  const filtered = outlets.filter((o) => {
    const matchesQuery =
      query.trim() === "" ||
      o.name.toLowerCase().includes(query.toLowerCase()) ||
      o.cuisineTags.toLowerCase().includes(query.toLowerCase());
    const matchesFilter =
      filter === "all" || (filter === "open" ? o.isOpen && !o.isPaused : o.cuisineTags.includes(filter));
    return matchesQuery && matchesFilter;
  });

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 py-10 sm:px-10 sm:py-12 mb-8 shadow-xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Good appetite 👋</h1>
          <p className="text-neutral-300 mt-2 max-w-lg">
            Outlets at Greenfield Tech Park — availability updates live as vendors change it.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {openCount} outlet{openCount === 1 ? "" : "s"} open now
            </span>
            <span className="text-sm text-neutral-400">{outlets.length} total on campus</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search outlets or cuisines..."
            className="w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[{ key: "all", label: "All" }, { key: "open", label: "Open now" }, ...cuisines.map((c) => ({ key: c, label: c }))].map(
            (opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`shrink-0 text-sm font-medium px-3.5 py-2 rounded-xl border transition-colors ${
                  filter === opt.key
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {opt.label}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-neutral-200 p-5 bg-white space-y-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-1.5 mt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : outlets.length === 0 ? (
        <EmptyState icon="🍽️" title="No outlets configured yet" />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No outlets match your search" description="Try a different keyword or filter." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => {
            const closed = !o.isOpen || o.isPaused;
            const { emoji, gradient } = styleFor(o.cuisineTags);
            return (
              <Link
                key={o.id}
                href={closed ? "#" : `/employee/outlet/${o.id}`}
                aria-disabled={closed}
                className={`group relative rounded-2xl border p-5 bg-white transition-all duration-200 ${
                  closed
                    ? "border-neutral-200 opacity-60 cursor-not-allowed pointer-events-none"
                    : "border-neutral-200 hover:border-transparent hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
                <div className="flex items-start justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-sm`}
                  >
                    {emoji}
                  </div>
                  <Badge tone={closed ? "danger" : "success"}>
                    {closed ? (o.isPaused ? "Paused" : "Closed") : "Open now"}
                  </Badge>
                </div>
                <h2 className="font-semibold text-lg mt-3.5 text-neutral-900 group-hover:text-neutral-950">
                  {o.name}
                </h2>
                <p className="text-sm text-neutral-500 mt-0.5">{o.cuisineTags.split(",").join(" · ")}</p>
                {closed && o.pauseReason && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-md px-2 py-1">{o.pauseReason}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {o.mealSlots.map((s) => (
                    <span
                      key={s.id}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        s.isActive
                          ? "bg-neutral-50 text-neutral-600 border-neutral-200"
                          : "bg-neutral-50 text-neutral-300 border-neutral-100 line-through"
                      }`}
                    >
                      {SLOT_LABELS[s.type]}
                    </span>
                  ))}
                </div>
                {!closed && (
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-neutral-400 group-hover:text-neutral-900 transition-colors">
                    View menu
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
