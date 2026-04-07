import { emitToRole } from "./socket";

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Hint connected managers to refetch /api/reports aggregates (manager dashboard).
 * Debounced so bursts (e.g. two notification events for one action) emit once.
 */
export function scheduleManagerReportsInvalidate(): void {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    emitToRole("manager", "reports:data-changed", { t: Date.now() });
  }, 400);
}
