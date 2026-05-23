import { Link } from "react-router-dom";
import { useState } from "react";
import { Plus, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import { requests, type RequestItem } from "@/data/mockData";

const myRequests = requests.filter((r) => ["REQ-1001", "REQ-1005", "REQ-1004"].includes(r.id));

export default function DashboardPage() {
  const [expanded, setExpanded] = useState<string | null>("REQ-1001");

  return (
    <main className="mx-auto min-h-screen max-w-[960px] px-5 py-8">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Logo size="sm" className="mb-3" />
          <h1 className="underline-glow text-3xl font-semibold tracking-tight text-ranting-ice">My Requests</h1>
        </div>
        <Link to="/chat" className="glossy-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </header>

      <div className="space-y-4">
        {myRequests.map((r) => (
          <RequestCard key={r.id} req={r} open={expanded === r.id} onToggle={() => setExpanded(expanded === r.id ? null : r.id)} />
        ))}
      </div>
    </main>
  );
}

function RequestCard({ req, open, onToggle }: { req: RequestItem; open: boolean; onToggle: () => void }) {
  return (
    <article className="glass-panel overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-start gap-4 p-5 text-left">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-ranting-ice">{req.type}</h2>
            <StatusBadge status={req.status} />
            <UrgencyBadge urgency={req.urgency} />
          </div>
          <p className="mb-3 text-sm text-ranting-muted">{req.description}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-ranting-muted">Created {req.createdLabel}</span>
            <div className="flex -space-x-2">
              {req.parties.map((p) => (
                <div key={p.id} title={`${p.name} · ${p.role}`}>
                  <Avatar name={p.name} size={26} glow={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-ranting-sky transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <Timeline req={req} />}
    </article>
  );
}

function Timeline({ req }: { req: RequestItem }) {
  type Node = { kind: "msg"; data: typeof req.conversation[number] } | { kind: "notif"; data: typeof req.notifications[number] };
  const nodes: Node[] = [
    ...req.conversation.map((m) => ({ kind: "msg" as const, data: m })),
    ...req.notifications.map((n) => ({ kind: "notif" as const, data: n })),
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
                  <Avatar name={n.data.role === "ai" ? "Ranting Chant" : req.tenantName} size={24} glow={false} />
                  <div className="glass-panel max-w-[80%] px-3 py-2 text-xs text-ranting-ice">
                    <div className="mb-0.5 text-[10px] uppercase tracking-wider text-ranting-muted">
                      {n.data.role === "ai" ? "AI" : req.tenantName} · {n.data.timestamp}
                    </div>
                    {n.data.text}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-ranting-muted">
                  {n.data.channel === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  <span className="text-ranting-ice/80">{n.data.channel.toUpperCase()}</span>
                  <span>·</span>
                  <span>to {n.data.recipient}</span>
                  <span>·</span>
                  <span>{n.data.timestamp}</span>
                  <span className="ml-1 text-ranting-ice/70">— {n.data.summary}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
