import { cookies } from "next/headers";
import { db } from "@/lib/firebaseAdmin";

const SESSION_COOKIE = "cfd_session_user_id";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "OUTLET_MANAGER" | "KITCHEN_STAFF" | "CAMPUS_ADMIN";
  campusId: string;
  outletId: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const userId = store.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const snap = await db.collection("users").doc(userId).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  return {
    id: snap.id,
    name: data.name,
    email: data.email,
    role: data.role,
    campusId: data.campusId,
    outletId: data.outletId ?? null,
  };
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
