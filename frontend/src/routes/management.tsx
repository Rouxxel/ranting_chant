import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { RequestTable } from "@/components/RequestTable";
import { RequestDetailPanel } from "@/components/RequestDetailPanel";
import { useApp } from "@/context/AppContext";
import { requireManagerOrOwnerAuth } from "@/lib/auth";
import { getRequests, updateRequest, completeRequest } from "@/services/api";
import { getRequestTypeLabel, REQUEST_TYPES } from "@/types";
import type { Request, RequestType, Status, Urgency } from "@/types";
import { ManagementProperties } from "@/components/ManagementProperties";
import { ManagementTenants } from "@/components/ManagementTenants";
import { ManagementProfile } from "@/components/ManagementProfile";

export const Route = createFileRoute("/management")({
  head: () => ({ meta: [{ title: "Management — Ranting Chant" }] }),
  beforeLoad: () => requireManagerOrOwnerAuth(),
  component: ManagementPage,
});

function ManagementPage() {
  const navigate = useNavigate();
  const { currentManager } = useApp();

  const [activeTab, setActiveTab] = useState<"requests" | "properties" | "tenants" | "profile">("requests");
  const [rows, setRows] = useState<Request[]>([]);
  const [typeF, setTypeF] = useState<RequestType | "all">("all");
  const [statusF, setStatusF] = useState<Status | "all">("all");
  const [urgencyF, setUrgencyF] = useState<Urgency | "all">("all");
  const [propertyF, setPropertyF] = useState<string>("all");
  const [selected, setSelected] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        // Check localStorage for cached requests
        const cachedRequests = localStorage.getItem('requests');
        if (cachedRequests) {
          const parsedRequests = JSON.parse(cachedRequests) as Request[];
          // Filter requests for current manager/owner by property_id
          const filteredRequests = parsedRequests.filter((r: Request) => {
            // Get properties from currentManager (could be manager or owner)
            if (!currentManager || !r.property_id) return false;

            // Handle both managers (managed_properties) and owners (owned_properties)
            const properties = (currentManager as any).managed_properties || (currentManager as any).owned_properties;
            if (!properties) return false;

            return properties.includes(r.property_id);
          });
          setRows(filteredRequests);
          setIsLoading(false);
        }

        // Fetch fresh data
        const allRequests = await getRequests();
        localStorage.setItem('requests', JSON.stringify(allRequests));
        // Filter requests for current manager/owner by property_id
        const filteredRequests = allRequests.filter(r => {
          // Get properties from currentManager (could be manager or owner)
          if (!currentManager || !r.property_id) return false;

          // Handle both managers (managed_properties) and owners (owned_properties)
          const properties = (currentManager as any).managed_properties || (currentManager as any).owned_properties;
          if (!properties) return false;

          return properties.includes(r.property_id);
        });
        setRows(filteredRequests);
      } catch (error) {
        console.error("Failed to load requests:", error);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRequests();
  }, [currentManager]);

  const properties = useMemo(() => Array.from(new Set(rows.map((r) => r.property))), [rows]);

  const filtered = rows.filter((r) =>
    (typeF === "all" || r.type === typeF) &&
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

  async function approve(id: string) {
    try {
      await updateRequest(id, { status: "in_progress" });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "in_progress" } : r)));
      if (selected?.id === id) setSelected({ ...selected, status: "in_progress" });
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  }

  async function handleComplete(id: string) {
    const resolutionNote = prompt("Enter resolution note (optional):");
    if (resolutionNote === null) return; // User cancelled
    try {
      await completeRequest(id, { resolution_note: resolutionNote || undefined });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
      if (selected?.id === id) setSelected({ ...selected, status: "resolved" });
    } catch (error) {
      console.error("Failed to complete request:", error);
    }
  }

  return (
    <AuthenticatedLayout>
      <main className="mx-auto min-h-[calc(100vh-130px)] max-w-[1400px]">
        <header className="flex items-center justify-between">
          <div className="mb-8 pl-5">
            <h1 className="underline-glow text-3xl font-semibold tracking-tight text-ranting-ice">Management</h1>
          </div>
        </header>

      {/* Tabs */}
      <div className="glass-panel mb-5 flex gap-2 px-4 py-3">
        {[
          { id: "requests" as const, label: "Requests" },
          { id: "properties" as const, label: "Properties" },
          { id: "tenants" as const, label: "Tenants" },
          { id: "profile" as const, label: "Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs ${
              activeTab === tab.id
                ? "glossy-btn"
                : "glossy-btn-ghost"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "requests" && (
        <>
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
            <Select value={typeF} onChange={(v) => setTypeF(v as RequestType | "all")} options={[
              ["all", "All types"], ...REQUEST_TYPES.map((type) => [type, getRequestTypeLabel(type)] as [string, string]),
            ]} />
            <Select value={statusF} onChange={(v) => setStatusF(v as Status | "all")} options={[
              ["all", "All statuses"], ["pending", "Pending"], ["in_progress", "In Progress"], ["escalated", "Escalated"],
              ["pending_approval", "Pending Approval"], ["pending_review", "Pending Review"], ["resolved", "Resolved"], ["cancelled", "Cancelled"],
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
          {isLoading ? (
            <div className="glass-panel p-8 text-center text-ranting-muted">Loading requests...</div>
          ) : (
            <RequestTable
              requests={filtered}
              onRowClick={setSelected}
              onApprove={approve}
            />
          )}

          {/* Detail panel */}
          {selected && <RequestDetailPanel req={selected} onClose={() => setSelected(null)} onApprove={() => approve(selected.id)} onComplete={() => handleComplete(selected.id)} />}
        </>
      )}

      {activeTab === "properties" && <ManagementProperties />}
      {activeTab === "tenants" && <ManagementTenants />}
      {activeTab === "vendors" && (
        <div className="glass-panel p-8 text-center text-ranting-muted">
          <p>Vendors management - coming soon</p>
          <button
            onClick={() => navigate({ to: "/vendors" })}
            className="glossy-btn mt-4 px-4 py-2 text-xs"
          >
            Go to Vendors Directory
          </button>
        </div>
      )}
      {activeTab === "profile" && <ManagementProfile />}
      </main>
    </AuthenticatedLayout>
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


