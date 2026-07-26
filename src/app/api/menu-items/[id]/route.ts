import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN", "KITCHEN_STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Kitchen staff may only toggle sold-out status; managers/admins can edit everything.
  const managerFields = ["name", "description", "price", "isVeg", "isPublished", "imageEmoji", "categoryId"];
  const allowed: Record<string, unknown> = {};
  if (user.role === "KITCHEN_STAFF") {
    if ("isSoldOut" in body) allowed.isSoldOut = body.isSoldOut;
  } else {
    for (const key of [...managerFields, "isSoldOut"]) {
      if (key in body) allowed[key] = key === "price" ? Number(body[key]) : body[key];
    }
  }

  const item = await prisma.menuItem.update({ where: { id }, data: allowed });
  const outlet = await prisma.outlet.findUnique({ where: { id: item.outletId } });

  publishEvent({
    type: "menu_item.availability_changed",
    campusId: outlet?.campusId ?? "",
    outletId: item.outletId,
    payload: { itemId: item.id, isSoldOut: item.isSoldOut, isPublished: item.isPublished, price: item.price },
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user || !["OUTLET_MANAGER", "CAMPUS_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const outlet = await prisma.outlet.findUnique({ where: { id: item.outletId } });
  await prisma.addOn.deleteMany({ where: { menuItemId: id } });
  await prisma.menuItem.delete({ where: { id } });

  publishEvent({
    type: "menu_item.updated",
    campusId: outlet?.campusId ?? "",
    outletId: item.outletId,
    payload: { itemId: id, action: "deleted" },
  });

  return NextResponse.json({ ok: true });
}
