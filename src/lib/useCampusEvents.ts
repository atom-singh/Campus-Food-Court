"use client";

import { useEffect, useRef } from "react";

export type CampusEventPayload = {
  type: string;
  campusId: string;
  outletId: string;
  employeeId?: string;
  payload: unknown;
  ts: number;
};

export function useCampusEvents(
  onEvent: (event: CampusEventPayload) => void,
  opts?: { outletId?: string }
) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(() => {
    const url = opts?.outletId
      ? `/api/events/stream?outletId=${encodeURIComponent(opts.outletId)}`
      : "/api/events/stream";
    const source = new EventSource(url);

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as CampusEventPayload;
        handlerRef.current(data);
      } catch {
        // ignore malformed/heartbeat messages
      }
    };

    return () => source.close();
  }, [opts?.outletId]);
}
