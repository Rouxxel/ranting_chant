import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { RequestCard } from "@/components/RequestCard";
import { RequestTimeline } from "@/components/RequestTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/context/AppContext";
import { requireTenantAuth } from "@/lib/auth";
import { getRequests } from "@/services/api";
import type { Request } from "@/types";

export const Route = createFileRoute("/requests")({
  head: () => ({ meta: [{ title: "My Requests — Ranting Chant" }] }),
  beforeLoad: () => requireTenantAuth(),
  component: RequestsPage,
});

function RequestsPage() {
  const { currentTenant } = useApp();
  const tenantId = currentTenant?.id ?? "tenant_001";
  const [requests, setRequests] = useState<Request[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        // Try to load from localStorage first
        const cachedRequests = localStorage.getItem(`requests_${tenantId}`);
        if (cachedRequests) {
          setRequests(JSON.parse(cachedRequests));
          setIsLoading(false);
        }

        // Fetch fresh data from API
        const allRequests = await getRequests();
        // Filter requests for current tenant
        const tenantRequests = allRequests.filter(r => r.requester_id === tenantId);
        setRequests(tenantRequests);
        // Cache in localStorage
        localStorage.setItem(`requests_${tenantId}`, JSON.stringify(tenantRequests));
      } catch (error) {
        console.error("Failed to load requests:", error);
        // Fallback to cached data if API fails
        const cachedRequests = localStorage.getItem(`requests_${tenantId}`);
        if (cachedRequests) {
          setRequests(JSON.parse(cachedRequests));
        } else {
          setRequests([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, [tenantId]);

  // RequestCard performs the cancel API call; here we only update the list.
  const handleCancel = (requestId: string) => {
    setRequests(requests.filter(r => r.id !== requestId));
  };

  return (
    <AuthenticatedLayout>
      <main className="mx-auto min-h-[calc(100vh-130px)] max-w-[1400px]">
        <header className="flex items-center justify-between">
          <div className="mb-8 pl-5">
            <h1 className="underline-glow text-3xl font-semibold tracking-tight text-ranting-ice">Request List</h1>
          </div>
          <Link to="/chat" className="glossy-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> New Request
          </Link>
        </header>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-panel p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
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
                onCancel={handleCancel}
              />
              {expanded === r.id && <RequestTimeline req={r} tenantName={currentTenant?.name} />}
            </div>
          ))}
        </div>
      )}
      </main>
    </AuthenticatedLayout>
  );
}
