import { Mail, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Request, ConversationMessage, NotificationEvent } from "@/types";

interface RequestTimelineProps {
  req: Request;
  tenantName?: string;
}

export function RequestTimeline({ req, tenantName = "Tenant" }: RequestTimelineProps) {
  type Node = { kind: "msg"; data: ConversationMessage } | { kind: "notif"; data: NotificationEvent };
  const nodes: Node[] = [
    ...(req.conversation_history || []).map((m) => ({ kind: "msg" as const, data: m })),
    ...(req.notifications_sent || []).map((n) => ({ kind: "notif" as const, data: n })),
  ];

  return (
    <div className="border-t border-white/10 px-5 py-6">
      <div className="relative pl-6">
        <div
          className="absolute left-2 top-1 bottom-1 w-px"
          style={{ background: "linear-gradient(180deg, rgba(126,200,227,0.7), rgba(126,200,227,0.15))", boxShadow: "0 0 10px rgba(126,200,227,0.6)" }}
        />
        <ul className="space-y-4">
          {nodes.map((n, i) => (
            <li key={i} className="relative">
              <span
                className="absolute -left-[18px] top-2 h-2.5 w-2.5 rounded-full bg-ranting-sky"
                style={{ boxShadow: "0 0 10px rgba(126,200,227,0.9)" }}
              />
              {n.kind === "msg" ? (
                <div className="flex items-start gap-2">
                  <Avatar name={n.data.role === "ai" ? "Ranting Chant" : tenantName} size={24} glow={false} />
                  <div className="glass-panel max-w-[80%] px-3 py-2 text-xs text-ranting-ice">
                    <div className="mb-0.5 text-[10px] uppercase tracking-wider text-ranting-muted">
                      {n.data.role === "ai" ? "AI" : tenantName} · {new Date(n.data.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </div>
                    {n.data.message}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-ranting-muted">
                  {n.data.type === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  <span className="text-ranting-ice/80">{n.data.type.toUpperCase()}</span>
                  <span>·</span>
                  <span>to {n.data.recipient}</span>
                  <span>·</span>
                  <span>{new Date(n.data.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                  {n.data.summary && <span className="ml-1 text-ranting-ice/70">— {n.data.summary}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
