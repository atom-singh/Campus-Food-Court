import { PrismaClient, SlotType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderStatusEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.mealSlot.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.campus.deleteMany();

  const campus = await prisma.campus.create({
    data: { name: "Greenfield Tech Park", location: "SEZ Block C, Bengaluru" },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Asha Rao",
      email: "admin@campus.demo",
      role: "CAMPUS_ADMIN",
      campusId: campus.id,
    },
  });

  const outletsData = [
    {
      name: "Spice Route Kitchen",
      cuisineTags: "Indian,North Indian,Curries",
      items: [
        { cat: "Breakfast", name: "Masala Dosa", price: 90, slot: "BREAKFAST" as SlotType, emoji: "🥞" },
        { cat: "Breakfast", name: "Idli Sambar (4pc)", price: 70, slot: "BREAKFAST" as SlotType, emoji: "🍚" },
        { cat: "Main Course", name: "Paneer Butter Masala + Rice", price: 180, slot: "LUNCH" as SlotType, emoji: "🍛" },
        { cat: "Main Course", name: "Dal Tadka Thali", price: 150, slot: "LUNCH" as SlotType, emoji: "🍱" },
        { cat: "Main Course", name: "Chicken Curry + Rice", price: 210, slot: "DINNER" as SlotType, emoji: "🍗" },
        { cat: "Snacks", name: "Samosa (2pc)", price: 40, slot: "SNACKS" as SlotType, emoji: "🥟" },
      ],
    },
    {
      name: "Green Bowl Cafe",
      cuisineTags: "Salads,Healthy,Continental",
      items: [
        { cat: "Breakfast", name: "Avocado Toast", price: 130, slot: "BREAKFAST" as SlotType, emoji: "🥑" },
        { cat: "Breakfast", name: "Overnight Oats", price: 100, slot: "BREAKFAST" as SlotType, emoji: "🥣" },
        { cat: "Bowls", name: "Grilled Chicken Caesar Bowl", price: 220, slot: "LUNCH" as SlotType, emoji: "🥗" },
        { cat: "Bowls", name: "Quinoa Veg Power Bowl", price: 190, slot: "LUNCH" as SlotType, emoji: "🥙" },
        { cat: "Bowls", name: "Pasta Primavera", price: 200, slot: "DINNER" as SlotType, emoji: "🍝" },
        { cat: "Snacks", name: "Fruit & Nut Cup", price: 80, slot: "SNACKS" as SlotType, emoji: "🍇" },
      ],
    },
    {
      name: "Wok & Roll",
      cuisineTags: "Asian,Chinese,Noodles",
      items: [
        { cat: "Breakfast", name: "Veg Steamed Momos", price: 90, slot: "BREAKFAST" as SlotType, emoji: "🥟" },
        { cat: "Mains", name: "Chicken Fried Rice", price: 190, slot: "LUNCH" as SlotType, emoji: "🍚" },
        { cat: "Mains", name: "Veg Hakka Noodles", price: 160, slot: "LUNCH" as SlotType, emoji: "🍜" },
        { cat: "Mains", name: "Kung Pao Chicken + Rice", price: 220, slot: "DINNER" as SlotType, emoji: "🍲" },
        { cat: "Snacks", name: "Crispy Corn", price: 90, slot: "SNACKS" as SlotType, emoji: "🌽" },
      ],
    },
  ];

  const slotWindows: Record<SlotType, { start: string; end: string }> = {
    BREAKFAST: { start: "07:00", end: "10:30" },
    LUNCH: { start: "12:00", end: "15:00" },
    SNACKS: { start: "16:00", end: "18:00" },
    DINNER: { start: "19:00", end: "22:00" },
  };

  for (const [idx, o] of outletsData.entries()) {
    const outlet = await prisma.outlet.create({
      data: {
        campusId: campus.id,
        name: o.name,
        cuisineTags: o.cuisineTags,
        openTime: "07:00",
        closeTime: "22:00",
        maxConcurrentOrders: 15,
      },
    });

    const usedSlots = new Set(o.items.map((i) => i.slot));
    for (const slotType of usedSlots) {
      await prisma.mealSlot.create({
        data: {
          outletId: outlet.id,
          type: slotType,
          startTime: slotWindows[slotType].start,
          endTime: slotWindows[slotType].end,
          isActive: true,
          capacity: 40,
        },
      });
    }

    const categoryMap = new Map<string, string>();
    let sortOrder = 0;
    for (const item of o.items) {
      if (!categoryMap.has(item.cat)) {
        const cat = await prisma.menuCategory.create({
          data: { outletId: outlet.id, name: item.cat, sortOrder: sortOrder++ },
        });
        categoryMap.set(item.cat, cat.id);
      }
    }

    for (const item of o.items) {
      const slot = await prisma.mealSlot.findUnique({
        where: { outletId_type: { outletId: outlet.id, type: item.slot } },
      });
      await prisma.menuItem.create({
        data: {
          outletId: outlet.id,
          categoryId: categoryMap.get(item.cat)!,
          name: item.name,
          price: item.price,
          imageEmoji: item.emoji,
          isVeg: !item.name.toLowerCase().includes("chicken"),
          slots: slot ? { connect: [{ id: slot.id }] } : undefined,
        },
      });
    }

    // Staff for this outlet
    await prisma.user.create({
      data: {
        name: `${o.name} Manager`,
        email: `manager${idx + 1}@vendor.demo`,
        role: "OUTLET_MANAGER",
        campusId: campus.id,
        outletId: outlet.id,
      },
    });
    await prisma.user.create({
      data: {
        name: `${o.name} Kitchen Staff`,
        email: `kitchen${idx + 1}@vendor.demo`,
        role: "KITCHEN_STAFF",
        campusId: campus.id,
        outletId: outlet.id,
      },
    });
  }

  // Employees
  const employeeNames = ["Ravi Kumar", "Priya Singh", "John Mathew"];
  for (const [idx, name] of employeeNames.entries()) {
    await prisma.user.create({
      data: {
        name,
        email: `employee${idx + 1}@corp.demo`,
        role: "EMPLOYEE",
        campusId: campus.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Campus admin:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
