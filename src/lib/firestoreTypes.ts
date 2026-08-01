export type Role = "EMPLOYEE" | "OUTLET_MANAGER" | "KITCHEN_STAFF" | "CAMPUS_ADMIN";
export type SlotType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
export type FulfillmentType = "PICKUP" | "DINE_IN" | "DESK_DELIVERY" | "DELIVERY_POINT";
export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "HANDED_OVER"
  | "COMPLETED"
  | "CANCELLED";

export type OutletDoc = {
  campusId: string;
  name: string;
  cuisineTags: string;
  isOpen: boolean;
  isPaused: boolean;
  pauseReason: string | null;
  openTime: string;
  closeTime: string;
  maxConcurrentOrders: number;
  createdAt: string;
};

export type MealSlotDoc = {
  outletId: string;
  type: SlotType;
  startTime: string;
  endTime: string;
  isActive: boolean;
  capacity: number;
};

export type MenuCategoryDoc = {
  outletId: string;
  name: string;
  sortOrder: number;
};

export type MenuItemDoc = {
  outletId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  allergenTags: string;
  isPublished: boolean;
  isSoldOut: boolean;
  imageEmoji: string;
  slotIds: string[];
  addOns: { name: string; price: number }[];
  createdAt: string;
};

export type OrderItemLine = {
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  addOnsSnapshot: string;
};

export type OrderStatusEventLine = {
  status: OrderStatus;
  note: string;
  createdAt: string;
};

export type OrderDoc = {
  outletId: string;
  campusId: string;
  outletName: string;
  employeeId: string;
  employeeName: string;
  fulfillmentType: FulfillmentType;
  slotType: SlotType;
  desiredTime: string;
  status: OrderStatus;
  etaMinutes: number;
  totalAmount: number;
  rejectReason: string | null;
  notes: string;
  items: OrderItemLine[];
  statusEvents: OrderStatusEventLine[];
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};
