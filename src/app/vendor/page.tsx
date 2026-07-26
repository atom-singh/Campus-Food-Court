import { getSession } from "@/lib/auth";
import LiveOrdersBoard from "./LiveOrdersBoard";

export default async function VendorOrdersPage() {
  const user = await getSession();
  return <LiveOrdersBoard outletId={user!.outletId!} />;
}
