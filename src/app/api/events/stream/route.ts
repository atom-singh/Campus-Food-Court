import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { subscribe, type CampusEvent } from "@/lib/eventBus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const outletFilter = searchParams.get("outletId");

  const encoder = new TextEncoder();
  let unsubscribe: () => void;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: CampusEvent) => {
        if (event.campusId !== user.campusId) return;
        if (user.role === "EMPLOYEE" && event.employeeId && event.employeeId !== user.id) {
          if (!["menu_item.availability_changed", "menu_item.updated", "meal_slot.toggled", "outlet.status_changed"].includes(event.type)) {
            return;
          }
        }
        if (outletFilter && event.outletId !== outletFilter) return;
        if (
          !outletFilter &&
          user.outletId &&
          ["OUTLET_MANAGER", "KITCHEN_STAFF"].includes(user.role) &&
          event.outletId !== user.outletId
        ) {
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      unsubscribe = subscribe(send);
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
