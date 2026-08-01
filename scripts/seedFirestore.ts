import "dotenv/config";
import { db } from "../src/lib/firebaseAdmin";

type SlotType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";

async function deleteCollection(name: string) {
  const snap = await db.collection(name).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

async function main() {
  for (const c of ["orders", "menuItems", "menuCategories", "mealSlots", "users", "outlets", "campuses"]) {
    await deleteCollection(c);
  }

  const campusRef = await db
    .collection("campuses")
    .add({ name: "Greenfield Tech Park", location: "SEZ Block C, Bengaluru", createdAt: new Date().toISOString() });
  const campusId = campusRef.id;

  const adminRef = await db.collection("users").add({
    name: "Asha Rao",
    email: "admin@campus.demo",
    role: "CAMPUS_ADMIN",
    campusId,
    outletId: null,
    createdAt: new Date().toISOString(),
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
    const outletRef = await db.collection("outlets").add({
      campusId,
      name: o.name,
      cuisineTags: o.cuisineTags,
      isOpen: true,
      isPaused: false,
      pauseReason: null,
      openTime: "07:00",
      closeTime: "22:00",
      maxConcurrentOrders: 15,
      createdAt: new Date().toISOString(),
    });
    const outletId = outletRef.id;

    const usedSlots = [...new Set(o.items.map((i) => i.slot))];
    const slotIdByType = new Map<SlotType, string>();
    for (const slotType of usedSlots) {
      const slotRef = await db.collection("mealSlots").add({
        outletId,
        type: slotType,
        startTime: slotWindows[slotType].start,
        endTime: slotWindows[slotType].end,
        isActive: true,
        capacity: 40,
      });
      slotIdByType.set(slotType, slotRef.id);
    }

    const categoryIdByName = new Map<string, string>();
    let sortOrder = 0;
    for (const item of o.items) {
      if (!categoryIdByName.has(item.cat)) {
        const catRef = await db.collection("menuCategories").add({
          outletId,
          name: item.cat,
          sortOrder: sortOrder++,
        });
        categoryIdByName.set(item.cat, catRef.id);
      }
    }

    for (const item of o.items) {
      const slotId = slotIdByType.get(item.slot);
      await db.collection("menuItems").add({
        outletId,
        categoryId: categoryIdByName.get(item.cat),
        name: item.name,
        description: "",
        price: item.price,
        isVeg: !item.name.toLowerCase().includes("chicken"),
        allergenTags: "",
        isPublished: true,
        isSoldOut: false,
        imageEmoji: item.emoji,
        slotIds: slotId ? [slotId] : [],
        addOns: [],
        createdAt: new Date().toISOString(),
      });
    }

    await db.collection("users").add({
      name: `${o.name} Manager`,
      email: `manager${idx + 1}@vendor.demo`,
      role: "OUTLET_MANAGER",
      campusId,
      outletId,
      createdAt: new Date().toISOString(),
    });
    await db.collection("users").add({
      name: `${o.name} Kitchen Staff`,
      email: `kitchen${idx + 1}@vendor.demo`,
      role: "KITCHEN_STAFF",
      campusId,
      outletId,
      createdAt: new Date().toISOString(),
    });
  }

  const employeeNames = ["Ravi Kumar", "Priya Singh", "John Mathew"];
  for (const [idx, name] of employeeNames.entries()) {
    await db.collection("users").add({
      name,
      email: `employee${idx + 1}@corp.demo`,
      role: "EMPLOYEE",
      campusId,
      outletId: null,
      createdAt: new Date().toISOString(),
    });
  }

  console.log("Seed complete.");
  const adminSnap = await adminRef.get();
  console.log("Campus admin:", adminSnap.data()?.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
