import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const outlets = await prisma.outlet.findMany({
    where: { campusId: user.campusId },
    include: {
      mealSlots: true,
      _count: { select: { orders: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ outlets });
}
