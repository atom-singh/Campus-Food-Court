import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AnalyticsView from "./AnalyticsView";

export default async function VendorAnalyticsPage() {
  const user = await getSession();
  if (user!.role !== "OUTLET_MANAGER") redirect("/vendor");
  return <AnalyticsView outletId={user!.outletId!} />;
}
