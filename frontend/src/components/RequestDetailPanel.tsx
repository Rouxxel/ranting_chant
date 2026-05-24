import { useState, useEffect } from "react";
import { X, Mail, MessageCircle, Check } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import { getRequestSummary } from "@/services/api";
import type { Request, RequestSummary } from "@/types";

interface RequestDetailPanelProps {
  req: Request;
  onClose: () => void;
  onApprove: () => void;
}

export function RequestDetailPanel({ req, onClose, onApprove }: RequestDetailPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      setLoadingSummary(true);
      try {
        const response = await getRequestSummary(req.id);
        setSummary(response.summary);
      } catch (error) {
        console.error("Failed to load summary:", error);
        setSummary("Unable to load AI summary.");
      } finally {
        setLoadingSummary(false);
      }
    };

    loadSummary();
  }, [req.id]);

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
                    <div className="mt-0.5 text-[9px] text-ranting-muted">{new Date(m.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
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
                  <span className="text-ranting-muted">· {new Date(n.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>AI Summary</SectionTitle>
            <div className="glass-panel space-y-2 p-3">
              {loadingSummary ? (
                <>
                  <div className="shimmer h-3 w-4/5 rounded" />
                  <div className="shimmer h-3 w-full rounded" />
                  <div className="shimmer h-3 w-3/5 rounded" />
                  <div className="pt-1 text-[11px] italic text-ranting-muted">Generating summary…</div>
                </>
              ) : (
                <p className="text-sm text-ranting-ice/90">{summary || "No summary available."}</p>
              )}
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
