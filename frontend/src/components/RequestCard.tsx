import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { RequestTypeBadge, StatusBadge, UrgencyBadge } from "@/components/Badges";
import { getRequestTypeLabel } from "@/types";
import type { Request } from "@/types";

interface RequestCardProps {
  req: Request;
  open: boolean;
  onToggle: () => void;
  tenantName?: string;
}

export function RequestCard({ req, open, onToggle, tenantName = "Tenant" }: RequestCardProps) {
  const createdDate = new Date(req.created_at).toLocaleDateString();

  return (
    <article className="glass-panel overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-start gap-4 p-5 text-left">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-ranting-ice">{getRequestTypeLabel(req.type)}</h2>
            <RequestTypeBadge type={req.type} />
            <StatusBadge status={req.status} />
            <UrgencyBadge urgency={req.urgency} />
          </div>
          <p className="mb-3 text-sm text-ranting-muted">{req.description}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-ranting-muted">Created {createdDate}</span>
            {req.involved_parties && req.involved_parties.length > 0 && (
              <span className="text-[11px] text-ranting-muted">{req.involved_parties.length} party(s) involved</span>
            )}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-ranting-sky transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </article>
  );
}
