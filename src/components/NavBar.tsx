"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ROLE_TONE: Record<string, string> = {
  EMPLOYEE: "bg-emerald-100 text-emerald-700",
  OUTLET_MANAGER: "bg-orange-100 text-orange-700",
  KITCHEN_STAFF: "bg-amber-100 text-amber-700",
  CAMPUS_ADMIN: "bg-purple-100 text-purple-700",
};

export default function NavBar({
  user,
  links,
}: {
  user: { name: string; role: string };
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initial = user.name.trim().charAt(0).toUpperCase();

  return (
    <header className="border-b border-neutral-200/80 bg-white/85 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <span className="flex items-center gap-2 font-bold text-neutral-900 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-base">
              🍽️
            </span>
            <span className="hidden sm:inline">Campus Food Court</span>
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 text-sm font-semibold flex items-center justify-center">
              {initial}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium text-neutral-800">{user.name}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_TONE[user.role] ?? "bg-neutral-100 text-neutral-600"}`}>
                {user.role.replace("_", " ")}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
