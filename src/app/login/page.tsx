import { prisma } from "@/lib/prisma";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const users = await prisma.user.findMany({
    include: { outlet: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const groups: Record<string, typeof users> = {
    CAMPUS_ADMIN: [],
    OUTLET_MANAGER: [],
    KITCHEN_STAFF: [],
    EMPLOYEE: [],
  };
  for (const u of users) groups[u.role]?.push(u);

  return <LoginClient groups={groups} />;
}
