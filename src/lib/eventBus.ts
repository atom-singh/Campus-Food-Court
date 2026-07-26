export type CampusEvent = {
  type:
    | "order.placed"
    | "order.status_changed"
    | "order.cancelled"
    | "menu_item.availability_changed"
    | "menu_item.updated"
    | "meal_slot.toggled"
    | "outlet.status_changed";
  campusId: string;
  outletId: string;
  employeeId?: string;
  payload: unknown;
  ts: number;
};

type Listener = (event: CampusEvent) => void;

const globalForBus = globalThis as unknown as { __busListeners?: Set<Listener> };

const listeners = globalForBus.__busListeners ?? new Set<Listener>();
globalForBus.__busListeners = listeners;

export function publishEvent(event: Omit<CampusEvent, "ts">) {
  const full: CampusEvent = { ...event, ts: Date.now() };
  for (const listener of listeners) {
    try {
      listener(full);
    } catch {
      // ignore broken subscriber
    }
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
