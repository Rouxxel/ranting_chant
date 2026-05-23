import { useMemo, useState } from "react";
import { X, Mail, MessageCircle, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import { requests as seedRequests, type RequestItem, type Status, type Urgency } from "@/data/mockData";
import { getSession } from "@/lib/session";

export default function ManagementPage() {
  const session = getSession();
  const managerName = session?.name ?? "Alex Morgan";

  const [rows, setRows] = useState<RequestItem[]>(seedRequests);
  const [statusF, setStatusF] = useState<Status | "all">("all");
  const [urgencyF, setUrgencyF] = useState<Urgency | "all">("all");
  const [propertyF, setPropertyF] = useState<string>("all");
  const [selected, setSelected] = useState<RequestItem | null>(null);

  const properties = useMemo(() => Array.from(new Set(seedRequests.map((r) => r.property))), []);

  const filtered = rows.filter((r) =>
    (statusF === "all" || r.status === statusF) &&
    (urgencyF === "all" || r.urgency === urgencyF) &&
    (propertyF === "all" || r.property === propertyF)
  );

  const stats = useMemo(() => ({
    total: rows.length,
    escalated: rows.filter((r) => r.status === "escalated").length,
    pendingApproval: rows.filter((r) => r.status === "pending_approval").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
  }), [rows]);

  function approve(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "in_progress" } : r)));
    if (selected?.id === id) setSelected({ ...selected, status: "in_progress" });
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-5 py-6">
      {/* Header */}
      <header className="glass-panel mb-5 flex items-center justify-between px-5 py-4">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-ranting-ice">{managerName}</div>
            <div className="text-[11px] text-ranting-muted">Property Manager</div>
          </div>
          <Avatar name={managerName} size={40} />
        </div>
      </header>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Requests" value={stats.total} accent="sky" />
        <StatCard label="Escalated" value={stats.escalated} accent="red" />
        <StatCard label="Pending Approval" value={stats.pendingApproval} accent="purple" />
        <StatCard label="Resolved" value={stats.resolved} accent="green" />
      </div>

      {/* Filters */}
      <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-ranting-muted">Filter</span>
        <Select value={statusF} onChange={(v) => setStatusF(v as Status | "all")} options={[
          ["all", "All statuses"], ["pending", "Pending"], ["in_progress", "In Progress"], ["escalated", "Escalated"],
          ["pending_approval", "Pending Approval"], ["pending_review", "Pending Review"], ["resolved", "Resolved"],
        ]} />
        <Select value={urgencyF} onChange={(v) => setUrgencyF(v as Urgency | "all")} options={[
          ["all", "All urgencies"], ["low", "Low"], ["medium", "Medium"], ["high", "High"],
        ]} />
        <Select value={propertyF} onChange={(v) => setPropertyF(v)} options={[
          ["all", "All properties"], ...properties.map((p) => [p, p] as [string, string]),
        ]} />
        <span className="ml-auto text-xs text-ranting-muted">{filtered.length} of {rows.length}</span>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_1.2fr_0.7fr_1fr_0.8fr_0.9fr] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-ranting-muted">
          <div>Type</div><div>Tenant</div><div>Property</div><div>Urgency</div><div>Status</div><div>Created</div><div>Actions</div>
        </div>
        <ul className="max-h-[60vh] overflow-y-auto">
          {filtered.map((r) => (
            <li
              key={r.id}
              onClick={() => setSelected(r)}
              className={`grid cursor-pointer grid-cols-[1.4fr_1fr_1.2fr_0.7fr_1fr_0.8fr_0.9fr] items-center gap-3 border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/[0.05] ${
                r.status === "escalated" ? "left-glow-escalated" : r.urgency === "high" ? "left-glow-high" : ""
              }`}
            >
              <div className="font-medium text-ranting-ice">{r.type}</div>
              <div className="flex items-center gap-2 text-ranting-ice/85">
                <Avatar name={r.tenantName} size={22} glow={false} />
                <span className="truncate">{r.tenantName}</span>
              </div>
              <div className="text-ranting-muted truncate">{r.property}</div>
              <div><UrgencyBadge urgency={r.urgency} /></div>
              <div><StatusBadge status={r.status} /></div>
              <div className="text-xs text-ranting-muted">{r.createdLabel}</div>
              <div onClick={(e) => e.stopPropagation()}>
                {r.status === "pending_approval" ? (
                  <button onClick={() => approve(r.id)} className="glossy-btn-green inline-flex items-center gap-1 px-2.5 py-1 text-xs">
                    <Check className="h-3 w-3" /> Approve
                  </button>
                ) : (
                  <button onClick={() => setSelected(r)} className="glossy-btn-ghost px-2.5 py-1 text-xs">View</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Detail panel */}
      {selected && <DetailPanel req={selected} onClose={() => setSelected(null)} onApprove={() => approve(selected.id)} />}
    </main>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "sky" | "red" | "purple" | "green" }) {
  const map = {
    sky: "rgba(126,200,227,0.55)",
    red: "rgba(239,68,68,0.6)",
    purple: "rgba(168,85,247,0.55)",
    green: "rgba(34,197,94,0.55)",
  } as const;
  return (
    <div className="glass-panel relative overflow-hidden px-5 py-4">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl" style={{ background: map[accent] }} />
      <div className="text-[11px] uppercase tracking-wider text-ranting-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ranting-ice text-glow-sky">{value}</div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="aero-input px-3 py-1.5 text-xs"
      style={{ colorScheme: "dark" }}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v} className="bg-ranting-deep text-ranting-ice">{l}</option>
      ))}
    </select>
  );
}

function DetailPanel({ req, onClose, onApprove }: { req: RequestItem; onClose: () => void; onApprove: () => void }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <aside
        className="glass-panel-strong fixed right-0 top-0 z-50 flex h-screen w-full max-w-[480px] flex-col"
        style={{ borderRadius: "18px 0 0 18px", animation: "slideIn 280ms ease-out" }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0;} to { transform: none; opacity: 1; } }`}</style>
        <header className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] text-ranting-muted">{req.id}</div>
            <h2 className="truncate text-lg font-semibold text-ranting-ice">{req.type}</h2>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={req.status} />
              <UrgencyBadge urgency={req.urgency} />
            </div>
          </div>
          <button onClick={onClose} className="glossy-btn-ghost p-1.5"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <SectionTitle>Description</SectionTitle>
            <p className="text-sm text-ranting-ice/90">{req.description}</p>
          </section>

          <section>
            <SectionTitle>Involved parties</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {req.parties.map((p) => (
                <div key={p.id} className="glass-panel flex items-center gap-2 px-2.5 py-1.5">
                  <Avatar name={p.name} size={22} glow={false} />
                  <div className="text-xs">
                    <div className="text-ranting-ice">{p.name}</div>
                    <div className="text-ranting-muted text-[10px]">{p.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Conversation</SectionTitle>
            <div className="space-y-2">
              {req.conversation.map((m) => (
                <div key={m.id} className={`flex ${m.role === "tenant" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={m.role === "tenant"
                      ? "max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-xs text-ranting-ice"
                      : "glass-panel max-w-[80%] px-3 py-2 text-xs text-ranting-ice"}
                    style={m.role === "tenant" ? {
                      background: "linear-gradient(180deg, rgba(45,106,159,0.95), rgba(26,58,92,0.95))",
                      border: "1px solid rgba(126,200,227,0.3)",
                    } : undefined}
                  >
                    {m.text}
                    <div className="mt-0.5 text-[9px] text-ranting-muted">{m.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>Notifications</SectionTitle>
            <ul className="space-y-1.5">
              {req.notifications.map((n) => (
                <li key={n.id} className="flex items-center gap-2 text-xs text-ranting-ice/85">
                  {n.channel === "email" ? <Mail className="h-3.5 w-3.5 text-ranting-sky" /> : <MessageCircle className="h-3.5 w-3.5 text-ranting-sky" />}
                  <span className="font-medium">{n.channel.toUpperCase()}</span>
                  <span className="text-ranting-muted">→ {n.recipient}</span>
                  <span className="text-ranting-muted">· {n.timestamp}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>AI Summary</SectionTitle>
            <div className="glass-panel space-y-2 p-3">
              <div className="shimmer h-3 w-4/5 rounded" />
              <div className="shimmer h-3 w-full rounded" />
              <div className="shimmer h-3 w-3/5 rounded" />
              <div className="pt-1 text-[11px] italic text-ranting-muted">Generating summary…</div>
            </div>
          </section>
        </div>

        {req.status === "pending_approval" && (
          <footer className="border-t border-white/10 p-4">
            <button onClick={onApprove} className="glossy-btn-green inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm">
              <Check className="h-4 w-4" /> Approve Request
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] uppercase tracking-wider text-ranting-muted">{children}</div>;
}
