import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { publishEvent } from "@/lib/eventBus";
import type { FulfillmentType, SlotType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const mine = searchParams.get("mine");

  const where: Record<string, unknown> = {};
  if (user.role === "EMPLOYEE" || mine === "true") {
    where.employeeId = user.id;
  } else if (outletId) {
    where.outletId = outletId;
  } else if (user.outletId) {
    where.outletId = user.outletId;
  } else {
    // Campus admin with no outlet filter: all outlets in their campus
    where.outlet = { campusId: user.campusId };
  }

  const activeOnly = searchParams.get("active");
  if (activeOnly === "true") {
    where.status = { notIn: ["COMPLETED", "REJECTED", "CANCELLED"] };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      outlet: true,
      employee: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can place orders" }, { status: 403 });
  }

  const body = await req.json();
  const { outletId, fulfillmentType, slotType, desiredTime, notes, items } = body as {
    outletId: string;
    fulfillmentType: FulfillmentType;
    slotType: SlotType;
    desiredTime: string;
    notes?: string;
    items: { menuItemId: string; quantity: number }[];
  };

  if (!outletId || !items?.length) {
    return NextResponse.json({ error: "outletId and items are required" }, { status: 400 });
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    include: { mealSlots: true },
  });
  if (!outlet) return NextResponse.json({ error: "Outlet not found" }, { status: 404 });
  if (!outlet.isOpen || outlet.isPaused) {
    return NextResponse.json({ error: "Outlet is currently not accepting orders" }, { status: 409 });
  }

  const slot = outlet.mealSlots.find((s) => s.type === slotType);
  if (!slot || !slot.isActive) {
    return NextResponse.json({ error: "Selected meal slot is not available" }, { status: 409 });
  }

  const activeCount = await prisma.order.count({
    where: { outletId, status: { notIn: ["COMPLETED", "REJECTED", "CANCELLED"] } },
  });
  if (activeCount >= outlet.maxConcurrentOrders) {
    return NextResponse.json(
      { error: "Outlet is at capacity for this slot. Please try again shortly." },
      { status: 409 }
    );
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } });

  for (const reqItem of items) {
    const mi = menuItems.find((m) => m.id === reqItem.menuItemId);
    if (!mi || mi.isSoldOut || !mi.isPublished || mi.outletId !== outletId) {
      return NextResponse.json(
        { error: `Item "${mi?.name ?? reqItem.menuItemId}" is no longer available` },
        { status: 409 }
      );
    }
  }

  const totalAmount = items.reduce((sum, reqItem) => {
    const mi = menuItems.find((m) => m.id === reqItem.menuItemId)!;
    return sum + mi.price * reqItem.quantity;
  }, 0);

  const order = await prisma.order.create({
    data: {
      outletId,
      employeeId: user.id,
      fulfillmentType,
      slotType,
      desiredTime: desiredTime ?? "",
      notes: notes ?? "",
      totalAmount,
      status: "PLACED",
      items: {
        create: items.map((reqItem) => {
          const mi = menuItems.find((m) => m.id === reqItem.menuItemId)!;
          return {
            menuItemId: mi.id,
            nameSnapshot: mi.name,
            priceSnapshot: mi.price,
            quantity: reqItem.quantity,
          };
        }),
      },
      statusEvents: { create: { status: "PLACED", note: "Order placed by employee" } },
    },
    include: { items: true, outlet: true, employee: true, statusEvents: true },
  });

  publishEvent({
    type: "order.placed",
    campusId: outlet.campusId,
    outletId: outlet.id,
    employeeId: user.id,
    payload: { order },
  });

  return NextResponse.json({ order }, { status: 201 });
}
