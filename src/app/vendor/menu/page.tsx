import { getSession } from "@/lib/auth";
import MenuManager from "./MenuManager";

export default async function VendorMenuPage() {
  const user = await getSession();
  return <MenuManager outletId={user!.outletId!} canEdit={user!.role === "OUTLET_MANAGER"} />;
}
