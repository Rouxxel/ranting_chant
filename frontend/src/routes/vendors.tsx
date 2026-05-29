import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Avatar } from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getVendors } from "@/services/api";
import type { Vendor } from "@/types";

export const Route = createFileRoute("/vendors")({
  head: () => ({ meta: [{ title: "Ranting Chant — Vendor List" }] }),
  beforeLoad: () => requireAuthenticatedUser(),
  component: VendorListPage,
});

function VendorListPage() {
  const navigate = useNavigate();
  const { userRole } = useApp();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  useEffect(() => {
    const loadVendors = async () => {
      try {
        // Check localStorage for cached vendors
        const cachedVendors = localStorage.getItem('vendors');
        if (cachedVendors) {
          setVendors(JSON.parse(cachedVendors));
          setIsLoading(false);
        }

        // Fetch fresh data
        const freshVendors = await getVendors();
        setVendors(freshVendors);
        localStorage.setItem('vendors', JSON.stringify(freshVendors));
      } catch (error) {
        console.error("Failed to load vendors:", error);
        setVendors([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadVendors();
  }, []);

  const allServices = useMemo(() => {
    const services = new Set(vendors.flatMap(v => v.services));
    return Array.from(services).sort();
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = serviceFilter === "all" || v.services.includes(serviceFilter);
      return matchesSearch && matchesService;
    });
  }, [vendors, searchTerm, serviceFilter]);

  return (
    <AuthenticatedLayout>
      <main className="mx-auto min-h-[calc(100vh-130px)] max-w-[1400px]">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ranting-ice">Vendor Directory</div>
          <div className="text-[11px] text-ranting-muted">Third-party service providers</div>
        </div>
        <button
          onClick={() => navigate({ to: userRole === "tenant" ? "/dashboard" : "/management" })}
          className="glossy-btn-ghost px-4 py-2 text-xs"
        >
          Back
        </button>
      </header>

      {/* Filters */}
      <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <input
          type="text"
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="aero-input px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="aero-input px-3 py-2 text-sm"
        >
          <option value="all">All Services</option>
          {allServices.map(service => (
            <option key={service} value={service}>{service}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-ranting-muted">{filteredVendors.length} of {vendors.length}</span>
      </div>

      {/* Vendor List */}
      {isLoading ? (
        <div className="glass-panel p-8 text-center text-ranting-muted">Loading vendors...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="glass-panel p-8 text-center text-ranting-muted">No vendors found</div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_0.8fr] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-ranting-muted">
            <div>Name</div><div>Email</div><div>Phone</div><div>Services</div><div>Emergency</div><div>Rating</div>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {filteredVendors.map((v) => (
              <li
                key={v.id}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_0.8fr] items-center gap-3 border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={v.name} size={22} glow={false} />
                  <span className="font-medium text-ranting-ice">{v.name}</span>
                </div>
                <div className="text-ranting-ice/85 truncate">{v.email}</div>
                <div className="text-ranting-ice/85">{v.phone}</div>
                <div className="flex flex-wrap gap-1">
                  {v.services.map((s) => (
                    <span key={s} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-ranting-ice/80">
                      {s}
                    </span>
                  ))}
                </div>
                <div>
                  {v.emergency_available ? (
                    <span className="text-xs text-green-400">Yes</span>
                  ) : (
                    <span className="text-xs text-ranting-muted">No</span>
                  )}
                </div>
                <div className="text-xs text-ranting-ice/85">
                  {v.rating ? `${v.rating} ★` : "N/A"}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      </main>
    </AuthenticatedLayout>
  );
}


