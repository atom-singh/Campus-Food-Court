import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const snap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snap.empty) {
    return NextResponse.json({ error: "Unknown demo account" }, { status: 404 });
  }

  const doc = snap.docs[0];
  const user = { id: doc.id, ...doc.data() };

  await setSessionCookie(doc.id);
  return NextResponse.json({ user });
}
