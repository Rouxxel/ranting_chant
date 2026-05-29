import { cn } from "@/lib/utils";
import { getRequestTypeLabel } from "@/types";
import type { RequestType, Status, Urgency } from "@/types";

const statusLabel: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
  pending_approval: "Pending Approval",
  pending_review: "Pending Review",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        `glow-${status}`,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency, className }: { urgency: Urgency; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        `urg-${urgency}`,
        className
      )}
    >
      {urgency}
    </span>
  );
}

export function RequestTypeBadge({ type, className }: { type: RequestType | string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-ranting-sky/25 bg-ranting-sky/10 px-2.5 py-0.5 text-[10px] font-semibold text-ranting-ice",
        className
      )}
    >
      {getRequestTypeLabel(type)}
    </span>
  );
}
