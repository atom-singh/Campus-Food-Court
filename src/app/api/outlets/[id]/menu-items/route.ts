import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const { categoryId, name, description, price, isVeg, imageEmoji, slotIds } = body;
  if (!categoryId || !name || price === undefined) {
    return NextResponse.json({ error: "categoryId, name, price are required" }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: {
      outletId: id,
      categoryId,
      name,
      description: description ?? "",
      price: Number(price),
      isVeg: isVeg ?? true,
      imageEmoji: imageEmoji ?? "🍽️",
      isPublished: true,
      slots: slotIds?.length ? { connect: slotIds.map((sid: string) => ({ id: sid })) } : undefined,
    },
    include: { slots: true, addOns: true },
  });

  const outlet = await prisma.outlet.findUnique({ where: { id } });
  if (outlet) {
    publishEvent({
      type: "menu_item.updated",
      campusId: outlet.campusId,
      outletId: id,
      payload: { itemId: item.id, action: "created" },
    });
  }

  return NextResponse.json({ item }, { status: 201 });
}
