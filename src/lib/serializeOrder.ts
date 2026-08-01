import type { OrderDoc, OrderStatusEventLine } from "@/lib/firestoreTypes";

type TimestampLike = { toDate?: () => Date } | string | undefined;

function toIso(value: TimestampLike) {
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return value as string;
}

export function serializeOrder(id: string, data: OrderDoc) {
  return {
    id,
    ...data,
    outlet: { name: data.outletName },
    employee: { name: data.employeeName },
    createdAt: toIso(data.createdAt as unknown as TimestampLike),
    updatedAt: toIso(data.updatedAt as unknown as TimestampLike),
    statusEvents: (data.statusEvents ?? []).map((e: OrderStatusEventLine) => ({
      ...e,
      createdAt: toIso(e.createdAt as unknown as TimestampLike),
    })),
  };
}
