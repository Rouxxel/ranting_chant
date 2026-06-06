import { useState, useEffect } from "react";
import { X, Mail, MessageCircle, Check } from "lucide-react";
import { StatusBadge, UrgencyBadge } from "@/components/Badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getRequestSummary, getTenants, getVendors, getManagers, getOwners } from "@/services/api";
import { getRequestTypeLabel } from "@/types";
import type { Request } from "@/types";

interface RequestDetailPanelProps {
  req: Request;
  onClose: () => void;
  onApprove: () => void;
  onComplete?: (resolutionNote?: string) => Promise<void> | void;
}

export function RequestDetailPanel({ req, onClose, onApprove, onComplete }: RequestDetailPanelProps) {
  const [summary, setSummary] = useState<string | null>(req.summary || null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [partyNames, setPartyNames] = useState<Record<string, string>>({});

  // Build an ID → name lookup from all entity collections
  useEffect(() => {
    const load = async () => {
      // 1. Try cache first
      const cachedT = localStorage.getItem('tenants');
      const cachedV = localStorage.getItem('vendors');
      const cachedM = localStorage.getItem('managers');
      const cachedO = localStorage.getItem('owners');

      if (cachedT && cachedV && cachedM && cachedO) {
        try {
          const map: Record<string, string> = {};
          JSON.parse(cachedT).forEach((t: any) => map[t.id] = t.name);
          JSON.parse(cachedV).forEach((v: any) => map[v.id] = v.name);
          JSON.parse(cachedM).forEach((m: any) => map[m.id] = m.name);
          JSON.parse(cachedO).forEach((o: any) => map[o.id] = o.name);
          setPartyNames(map);
        } catch (e) {
          console.error("Failed to parse cached party names:", e);
        }
      }

      // 2. Fetch fresh data in the background to update/populate cache
      try {
        const [tenants, vendors, managers, owners] = await Promise.all([
          getTenants().catch(() => []),
          getVendors().catch(() => []),
          getManagers().catch(() => []),
          getOwners().catch(() => []),
        ]);
        
        const map: Record<string, string> = {};
        tenants.forEach(t => map[t.id] = t.name);
        vendors.forEach(v => map[v.id] = v.name);
        managers.forEach(m => map[m.id] = m.name);
        owners.forEach(o => map[o.id] = o.name);
        setPartyNames(map);

        localStorage.setItem('tenants', JSON.stringify(tenants));
        localStorage.setItem('vendors', JSON.stringify(vendors));
        localStorage.setItem('managers', JSON.stringify(managers));
        localStorage.setItem('owners', JSON.stringify(owners));
      } catch (error) {
        console.error("Failed to refresh party names from server:", error);
      }
    };
    load();
  }, []);

  const handleConfirmComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete?.(resolutionNote.trim() || undefined);
      setIsCompleteDialogOpen(false);
      setResolutionNote("");
    } catch (error) {
      // Keep the dialog open on failure; the API layer surfaces the error toast.
      console.error("Failed to complete request:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    const loadSummary = async () => {
      // Use cached summary if available
      if (req.summary) {
        setSummary(req.summary);
        return;
      }

      setLoadingSummary(true);
      try {
        // Only load summary if this is a valid request ID (not a session_id)
        if (!req.id || req.id.startsWith("session_")) {
          setSummary("Summary not available for unsaved conversations.");
          return;
        }
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
        className="glass-panel-strong flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          height: "100vh",
          maxHeight: "100vh",
          width: "min(480px, 100vw)",
          zIndex: 50,
          borderRadius: "18px 0 0 18px",
          animation: "slideIn 280ms ease-out",
        }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0;} to { transform: none; opacity: 1; } }`}</style>
        <header className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] text-ranting-deep">{req.id}</div>
            <h2 className="truncate text-lg font-semibold text-ranting-ice">{getRequestTypeLabel(req.type)}</h2>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={req.status} />
              <UrgencyBadge urgency={req.urgency} />
            </div>
          </div>
          <button onClick={onClose} className="glossy-btn-ghost p-1.5"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {req.status === "resolved" && (
            <section>
              <SectionTitle>Resolution</SectionTitle>
              <div className="glass-panel space-y-1 p-3">
                <p className="text-sm text-ranting-ice/90">
                  {req.resolution_note || "Marked resolved (no note provided)."}
                </p>
                {req.resolved_at && (
                  <p className="text-[11px] text-ranting-deep">
                    {new Date(req.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Description</SectionTitle>
            <p className="text-sm text-ranting-ice/90">{req.description}</p>
          </section>

          <section>
            <SectionTitle>Involved parties</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {req.involved_parties && req.involved_parties.length > 0 ? (
                req.involved_parties.map((p) => (
                  <div key={p} className="glass-panel flex items-center gap-2 px-2.5 py-1.5">
                    <div className="text-xs text-ranting-ice">{partyNames[p] || p}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-ranting-deep">No involved parties</div>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Conversation</SectionTitle>
            <div className="space-y-2">
              {req.conversation_history && req.conversation_history.map((m: any, i: number) => (
                <div key={m.id ?? `msg-${i}`} className={`flex ${m.role === "tenant" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`glass-panel max-w-[80%] px-3 py-2 text-xs text-ranting-ice ${m.role === "tenant" ? "rounded-br-md" : ""}`}
                  >
                    {m.message}
                    <div className="mt-0.5 text-[9px] text-ranting-deep">{new Date(m.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {req.notifications_sent?.length > 0 && (
            <section>
              <SectionTitle>Notifications</SectionTitle>
              <ul className="space-y-1.5">
                {req.notifications_sent.map((n: any, i: number) => (
                  <li
                    key={n.id ?? `notif-${i}`}
                    className="flex items-center gap-2 text-xs text-ranting-ice/85"
                  >
                    {n.type === "email" ? (
                      <Mail className="h-3.5 w-3.5 text-ranting-sky" />
                    ) : (
                      <MessageCircle className="h-3.5 w-3.5 text-ranting-sky" />
                    )}
                    <span className="font-medium">{n.type.toUpperCase()}</span>
                    <span className="text-ranting-deep">→ {n.recipient}</span>
                    <span className="text-ranting-deep">
                      ·{" "}
                      {new Date(n.timestamp).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionTitle>AI Summary</SectionTitle>
            <div className="glass-panel space-y-2 p-3">
              {loadingSummary ? (
                <>
                  <div className="shimmer h-3 w-4/5 rounded" />
                  <div className="shimmer h-3 w-full rounded" />
                  <div className="shimmer h-3 w-3/5 rounded" />
                  <div className="pt-1 text-[11px] italic text-ranting-deep">Generating summary…</div>
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

        {(req.status === "in_progress" || req.status === "escalated") && onComplete && (
          <footer className="border-t border-white/10 p-4">
            <button
              onClick={() => setIsCompleteDialogOpen(true)}
              className="glossy-btn inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
            >
              <Check className="h-4 w-4" /> Complete Request
            </button>
          </footer>
        )}
      </aside>

      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent className="aero-surface max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Request</DialogTitle>
            <DialogDescription className="text-sm text-ranting-deep">
              Mark this request as resolved. You can add an optional resolution note for the record.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            placeholder="Resolution note (optional)"
            className="aero-input min-h-[96px] resize-none"
            disabled={isCompleting}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCompleteDialogOpen(false)}
              className="glossy-btn-ghost"
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmComplete}
              disabled={isCompleting}
              className="glossy-btn-green"
            >
              {isCompleting ? "Completing..." : "Complete Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] uppercase tracking-wider text-ranting-deep">{children}</div>;
}
