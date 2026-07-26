import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import NavBar from "@/components/NavBar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "CAMPUS_ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <NavBar user={{ name: user.name, role: user.role }} links={[{ href: "/admin", label: "Campus Overview" }]} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
