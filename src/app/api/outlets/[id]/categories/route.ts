import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const countSnap = await db.collection("menuCategories").where("outletId", "==", id).count().get();
  const data = { outletId: id, name, sortOrder: countSnap.data().count };
  const ref = await db.collection("menuCategories").add(data);
  const category = { id: ref.id, ...data };

  return NextResponse.json({ category }, { status: 201 });
}
