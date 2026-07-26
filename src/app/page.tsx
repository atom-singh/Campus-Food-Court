import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "EMPLOYEE") redirect("/employee");
  if (user.role === "CAMPUS_ADMIN") redirect("/admin");
  redirect("/vendor");
}
