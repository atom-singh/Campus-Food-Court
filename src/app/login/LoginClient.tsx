"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";

type OutletLite = { name: string } | null;
type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: "CAMPUS_ADMIN" | "OUTLET_MANAGER" | "KITCHEN_STAFF" | "EMPLOYEE";
  outlet: OutletLite;
};

const ROLE_META: Record<
  DemoUser["role"],
  { label: string; blurb: string; landing: string; icon: string }
> = {
  EMPLOYEE: {
    label: "Employee",
    blurb: "Browse outlets, order food, track live status",
    landing: "/employee",
    icon: "🎫",
  },
  OUTLET_MANAGER: {
    label: "Outlet Manager",
    blurb: "Menu, pricing, timing, staff, analytics",
    landing: "/vendor",
    icon: "🧑‍🍳",
  },
  KITCHEN_STAFF: {
    label: "Kitchen Staff",
    blurb: "Live order queue, accept/reject, stage updates",
    landing: "/vendor",
    icon: "🔥",
  },
  CAMPUS_ADMIN: {
    label: "Campus Admin",
    blurb: "Cross-outlet oversight, force-close, campus-wide stats",
    landing: "/admin",
    icon: "🏢",
  },
};

const ROLE_ORDER: DemoUser["role"][] = ["EMPLOYEE", "OUTLET_MANAGER", "KITCHEN_STAFF", "CAMPUS_ADMIN"];

const FEATURES = [
  { icon: "⚡", title: "Live order sync", text: "Orders, statuses, and menu changes propagate in real time across every screen." },
  { icon: "🏬", title: "Multi-vendor, one campus", text: "Each outlet manages its own menu and queue, with campus-wide oversight for admins." },
  { icon: "📊", title: "Built-in analytics", text: "Peak-hour demand, top items, and revenue — no spreadsheets required." },
];

export default function LoginClient({
  groups,
}: {
  groups: Record<string, DemoUser[]>;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [activeRole, setActiveRole] = useState<DemoUser["role"]>("EMPLOYEE");
  const [loading, setLoading] = useState<string | null>(null);

  async function login(user: DemoUser) {
    setLoading(user.id);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    setLoading(null);
    if (!res.ok) {
      show("Login failed. Try again.", "error");
      return;
    }
    show(`Welcome, ${user.name.split(" ")[0]}!`, "success");
    router.push(ROLE_META[user.role].landing);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,420px)_1fr] bg-white">
      {/* Branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white px-10 py-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-lg">🍽️</span>
            <span className="font-semibold tracking-tight">Campus Food Court</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-10 leading-tight">
            One platform for every
            <br />
            outlet on campus.
          </h1>
          <p className="text-slate-400 mt-3 text-sm max-w-xs">
            Greenfield Tech Park — SEZ Block C, Bengaluru. Ordering, kitchen operations, and campus oversight,
            unified.
          </p>
        </div>

        <div className="relative space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                {f.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-xs text-slate-500">MVP demo build · mock authentication</p>
      </div>

      {/* Login panel */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center text-lg">
              🍽️
            </span>
            <span className="font-semibold tracking-tight text-slate-900">Campus Food Court</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to continue</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Select a role to see a seeded demo account — no password required for this MVP.
          </p>

          <div className="mt-7 flex gap-1 p-1 bg-slate-100 rounded-xl">
            {ROLE_ORDER.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-1 text-xs sm:text-sm font-medium px-2 py-2 rounded-lg transition-colors ${
                  activeRole === role
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {ROLE_META[role].label}
              </button>
            ))}
          </div>

          <div className="mt-1.5">
            <p className="text-xs text-slate-400 mt-3 mb-3">{ROLE_META[activeRole].blurb}</p>

            <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {(groups[activeRole] ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-slate-900 text-white text-sm font-semibold flex items-center justify-center">
                      {u.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {u.email}
                        {u.outlet ? ` · ${u.outlet.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => login(u)}
                    disabled={loading === u.id}
                    className="shrink-0 rounded-lg bg-slate-900 text-white px-3.5 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {loading === u.id ? "…" : "Sign in"}
                  </button>
                </div>
              ))}
              {(groups[activeRole] ?? []).length === 0 && (
                <p className="text-sm text-slate-400 px-4 py-6 text-center">No demo accounts for this role yet.</p>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-6 text-center">
            This is a demo build. In production, sign-in would use your corporate SSO / campus access credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
