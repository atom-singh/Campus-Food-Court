import { getSession } from "@/lib/auth";
import CampusOverview from "./CampusOverview";

export default async function AdminPage() {
  const user = await getSession();
  return <CampusOverview campusId={user!.campusId} />;
}
