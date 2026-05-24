import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RequestCard } from "@/components/RequestCard";
import { RequestTimeline } from "@/components/RequestTimeline";
import { useApp } from "@/context/AppContext";
import { getRequests } from "@/services/api";
import type { Request } from "@/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Requests — Ranting Chant" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { currentTenant } = useApp();
  const tenantId = currentTenant?.id ?? "tenant_001";
  const [requests, setRequests] = useState<Request[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const allRequests = await getRequests();
        // Filter requests for current tenant
        const tenantRequests = allRequests.filter(r => r.tenant_id === tenantId);
        setRequests(tenantRequests);
      } catch (error) {
        console.error("Failed to load requests:", error);
        // Fallback to empty array if API fails
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, [tenantId]);

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

      {isLoading ? (
        <div className="glass-panel p-8 text-center text-ranting-muted">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="glass-panel p-8 text-center text-ranting-muted">
          <p>No requests found. Click "New Request" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id}>
              <RequestCard 
                req={r} 
                open={expanded === r.id} 
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)} 
                tenantName={currentTenant?.name}
              />
              {expanded === r.id && <RequestTimeline req={r} tenantName={currentTenant?.name} />}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
