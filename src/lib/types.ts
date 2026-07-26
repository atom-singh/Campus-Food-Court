export const SLOT_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACKS: "Snacks",
};

export const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PREPARING: "Preparing",
  READY: "Ready for pickup",
  HANDED_OVER: "Handed over",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const NEXT_STATUS: Record<string, string[]> = {
  PLACED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["HANDED_OVER"],
  HANDED_OVER: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
  DESK_DELIVERY: "Desk delivery",
  DELIVERY_POINT: "Delivery point",
};
