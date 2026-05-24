import { Check, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import type { Request } from "@/types";

interface RequestTableProps {
  requests: Request[];
  onRowClick: (request: Request) => void;
  onApprove: (id: string) => void;
}

export function RequestTable({ requests, onRowClick, onApprove }: RequestTableProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="grid grid-cols-[1.4fr_1fr_1.2fr_0.7fr_1fr_0.8fr_0.9fr] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-ranting-muted">
        <div>Type</div><div>Tenant</div><div>Property</div><div>Urgency</div><div>Status</div><div>Created</div><div>Actions</div>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto">
        {requests.map((r) => (
          <li
            key={r.id}
            onClick={() => onRowClick(r)}
            className={`grid cursor-pointer grid-cols-[1.4fr_1fr_1.2fr_0.7fr_1fr_0.8fr_0.9fr] items-center gap-3 border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/[0.05] ${
              r.status === "escalated" ? "left-glow-escalated" : r.urgency === "high" ? "left-glow-high" : ""
            }`}
          >
            <div className="font-medium text-ranting-ice">{r.type}</div>
            <div className="flex items-center gap-2 text-ranting-ice/85">
              <Avatar name={r.tenant_name || "Tenant"} size={22} glow={false} />
              <span className="truncate">{r.tenant_name || "Tenant"}</span>
            </div>
            <div className="text-ranting-muted truncate">{r.property}</div>
            <div><UrgencyBadge urgency={r.urgency} /></div>
            <div><StatusBadge status={r.status} /></div>
            <div className="text-xs text-ranting-muted">{new Date(r.created_at).toLocaleDateString()}</div>
            <div onClick={(e) => e.stopPropagation()}>
              {r.status === "pending_approval" ? (
                <button onClick={() => onApprove(r.id)} className="glossy-btn-green inline-flex items-center gap-1 px-2.5 py-1 text-xs">
                  <Check className="h-3 w-3" /> Approve
                </button>
              ) : (
                <button onClick={() => onRowClick(r)} className="glossy-btn-ghost px-2.5 py-1 text-xs">View</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
