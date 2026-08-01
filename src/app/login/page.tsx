import { db } from "@/lib/firebaseAdmin";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const [usersSnap, outletsSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("outlets").get(),
  ]);

  const outletNames = new Map(outletsSnap.docs.map((d) => [d.id, d.data().name as string]));

  const users = usersSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        email: data.email,
        role: data.role,
        outlet: data.outletId ? { name: outletNames.get(data.outletId) ?? "" } : null,
      };
    })
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  const groups: Record<string, typeof users> = {
    CAMPUS_ADMIN: [],
    OUTLET_MANAGER: [],
    KITCHEN_STAFF: [],
    EMPLOYEE: [],
  };
  for (const u of users) groups[u.role]?.push(u);

  return <LoginClient groups={groups} />;
}
