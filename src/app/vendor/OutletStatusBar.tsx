"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type OutletLite = {
  id: string;
  name: string;
  isOpen: boolean;
  isPaused: boolean;
  pauseReason: string | null;
};

export default function OutletStatusBar({
  outlet,
  canControl,
}: {
  outlet: OutletLite;
  canControl: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showPauseForm, setShowPauseForm] = useState(false);

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true);
    const res = await fetch(`/api/outlets/${outlet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setShowPauseForm(false);
    setReason("");
    if (res.ok) show(message, "success");
    else show("Could not update outlet status", "error");
    router.refresh();
  }

  const closed = !outlet.isOpen || outlet.isPaused;

  return (
    <div
      className={`border-b px-4 py-2.5 flex items-center justify-between text-sm ${
        closed ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <div className="mx-auto max-w-6xl w-full flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`relative flex w-2.5 h-2.5`}>
            {!closed && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${closed ? "bg-red-500" : "bg-emerald-500"}`} />
          </span>
          <span className="font-semibold text-neutral-900">{outlet.name}</span>
          <span className="text-neutral-500">
            {closed
              ? outlet.isPaused
                ? `Paused${outlet.pauseReason ? ` — ${outlet.pauseReason}` : ""}`
                : "Closed"
              : "Open & accepting orders"}
          </span>
        </div>

        {canControl && (
          <div className="flex items-center gap-2">
            {!outlet.isOpen ? (
              <button
                disabled={busy}
                onClick={() => patch({ isOpen: true, isPaused: false, pauseReason: null }, "Outlet reopened")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors"
              >
                Open outlet
              </button>
            ) : outlet.isPaused ? (
              <button
                disabled={busy}
                onClick={() => patch({ isPaused: false, pauseReason: null }, "Orders resumed")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors"
              >
                Resume orders
              </button>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={() => setShowPauseForm((v) => !v)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 font-medium disabled:opacity-50 hover:bg-amber-50 transition-colors"
                >
                  Pause temporarily
                </button>
                <button
                  disabled={busy}
                  onClick={() => patch({ isOpen: false }, "Outlet closed")}
                  className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 font-medium disabled:opacity-50 hover:bg-red-50 transition-colors"
                >
                  Close outlet
                </button>
              </>
            )}
            {showPauseForm && (
              <div className="flex items-center gap-1.5">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (e.g. kitchen overloaded)"
                  className="border border-neutral-200 rounded-lg px-2 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
                <button
                  onClick={() => patch({ isPaused: true, pauseReason: reason || "Temporarily paused" }, "Outlet paused")}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
