import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TimingManager from "./TimingManager";

export default async function VendorTimingPage() {
  const user = await getSession();
  if (user!.role !== "OUTLET_MANAGER") redirect("/vendor");
  return <TimingManager outletId={user!.outletId!} />;
}
