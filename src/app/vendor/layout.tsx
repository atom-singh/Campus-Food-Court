import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import { db } from "@/lib/firebaseAdmin";
import type { OutletDoc } from "@/lib/firestoreTypes";
import OutletStatusBar from "./OutletStatusBar";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!["OUTLET_MANAGER", "KITCHEN_STAFF"].includes(user.role)) redirect("/");
  if (!user.outletId) redirect("/login");

  const outletDoc = await db.collection("outlets").doc(user.outletId).get();
  if (!outletDoc.exists) redirect("/login");
  const outlet = { id: outletDoc.id, ...(outletDoc.data() as OutletDoc) };

  const links = [{ href: "/vendor", label: "Live Orders" }];
  if (user.role === "OUTLET_MANAGER") {
    links.push(
      { href: "/vendor/menu", label: "Menu & Stock" },
      { href: "/vendor/timing", label: "Timing & Slots" },
      { href: "/vendor/analytics", label: "Analytics" }
    );
  } else {
    links.push({ href: "/vendor/menu", label: "Stock" });
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <NavBar user={{ name: user.name, role: user.role }} links={links} />
      <OutletStatusBar
        outlet={{
          id: outlet.id,
          name: outlet.name,
          isOpen: outlet.isOpen,
          isPaused: outlet.isPaused,
          pauseReason: outlet.pauseReason,
        }}
        canControl={user.role === "OUTLET_MANAGER"}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
