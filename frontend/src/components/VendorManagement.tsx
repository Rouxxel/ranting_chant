import { useState, useEffect } from "react";
import { Building2, Star, Clock, Phone, Mail, Plus, Search, Edit, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { getVendors, getVendorsByService, createVendor, deleteVendor } from "../services/api";
import type { Vendor } from "../types";

interface VendorManagementProps {
  className?: string;
}

export function VendorManagement({ className = "" }: VendorManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    services: [] as string[],
    emergency_available: false,
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data =
          selectedService === "all"
            ? await getVendors()
            : await getVendorsByService(selectedService);
        setVendors(data);
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
        toast.error("Failed to load vendors");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, [selectedService]);

  const services = [
    "all",
    "locksmith",
    "plumbing",
    "electrical",
    "hvac",
    "handyman",
    "general_repair",
    "glass_repair",
    "door_repair",
  ];

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      await deleteVendor(vendorId);
      toast.success("Vendor deleted successfully");
      setVendors(vendors.filter((v) => v.id !== vendorId));
      if (selectedVendor?.id === vendorId) {
        setSelectedVendor(null);
      }
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      toast.error("Failed to delete vendor");
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const created = await createVendor({
        name: newVendor.name,
        email: newVendor.email,
        phone: newVendor.phone,
        services: newVendor.services,
        emergency_available: newVendor.emergency_available,
      });
      toast.success("Vendor created successfully");
      setVendors([...vendors, created]);
      setIsAdding(false);
      setNewVendor({
        name: "",
        email: "",
        phone: "",
        services: [],
        emergency_available: false,
      });
    } catch (error) {
      console.error("Failed to create vendor:", error);
      toast.error("Failed to create vendor");
    } finally {
      setIsCreating(false);
    }
  };

  const handleServiceToggle = (service: string) => {
    setNewVendor((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-ranting-ice text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-ranting-sky" />
          Vendors
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="glossy-btn flex items-center gap-2 px-4 py-2 rounded-full"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aero-input w-full pl-10 pr-4 py-2"
          />
        </div>
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="aero-input px-4 py-2"
        >
          {services.map((service) => (
            <option key={service} value={service}>
              {service === "all" ? "All Services" : service.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-ranting-muted py-8">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center text-ranting-muted py-8">No vendors found</div>
          ) : (
            filteredVendors.map((vendor) => (
              <button
                key={vendor.id}
                onClick={() => setSelectedVendor(vendor)}
                className={`w-full text-left p-4 rounded-lg transition-colors ${
                  selectedVendor?.id === vendor.id
                    ? "bg-ranting-sky/20 border border-ranting-sky/50"
                    : "bg-ranting-deep/20 hover:bg-ranting-deep/30 border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-ranting-ice font-medium">{vendor.name}</p>
                      {vendor.emergency_available && <Zap className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <p className="text-ranting-muted text-xs">{vendor.email}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-ranting-muted">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span>{vendor.rating || "N/A"}</span>
                      </div>
                      <span className="capitalize">{vendor.services.join(", ")}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Vendor Details */}
        <div className="glass-panel-strong p-6 rounded-lg">
          {selectedVendor ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-ranting-ice font-semibold text-lg">{selectedVendor.name}</h3>
                  {selectedVendor.emergency_available && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Emergency
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="glossy-btn-ghost p-2 rounded-full">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVendor(selectedVendor.id)}
                    className="glossy-btn-ghost p-2 rounded-full text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-ranting-sky" />
                  <div>
                    <p className="text-ranting-muted text-xs">Email</p>
                    <p className="text-ranting-ice text-sm">{selectedVendor.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-ranting-sky" />
                  <div>
                    <p className="text-ranting-muted text-xs">Phone</p>
                    <p className="text-ranting-ice text-sm">{selectedVendor.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-ranting-sky" />
                  <div>
                    <p className="text-ranting-muted text-xs">Rating</p>
                    <p className="text-ranting-ice text-sm">{selectedVendor.rating} / 5.0</p>
                  </div>
                </div>

                <div>
                  <p className="text-ranting-muted text-xs mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.services.map((service) => (
                      <span
                        key={service}
                        className="text-xs px-2 py-1 rounded-full bg-ranting-accent/20 text-ranting-sky capitalize"
                      >
                        {service.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-ranting-muted">
              <Building2 className="w-12 h-12 mb-3 opacity-50" />
              <p>Select a vendor to view details</p>
            </div>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel-strong p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-ranting-ice text-lg font-semibold mb-4">Add New Vendor</h3>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="text-ranting-muted text-xs mb-1 block">Name</label>
                <input
                  type="text"
                  required
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  className="aero-input w-full px-3 py-2"
                  placeholder="Vendor name"
                />
              </div>
              <div>
                <label className="text-ranting-muted text-xs mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  value={newVendor.email}
                  onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  className="aero-input w-full px-3 py-2"
                  placeholder="vendor@email.com"
                />
              </div>
              <div>
                <label className="text-ranting-muted text-xs mb-1 block">Phone</label>
                <input
                  type="tel"
                  required
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  className="aero-input w-full px-3 py-2"
                  placeholder="+1-555-0000"
                />
              </div>
              <div>
                <label className="text-ranting-muted text-xs mb-2 block">Services</label>
                <div className="flex flex-wrap gap-2">
                  {services
                    .filter((s) => s !== "all")
                    .map((service) => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => handleServiceToggle(service)}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${
                          newVendor.services.includes(service)
                            ? "bg-ranting-sky text-white"
                            : "bg-ranting-deep/20 text-ranting-muted hover:bg-ranting-deep/30"
                        }`}
                      >
                        {service.replace("_", " ")}
                      </button>
                    ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emergency"
                  checked={newVendor.emergency_available}
                  onChange={(e) =>
                    setNewVendor({ ...newVendor, emergency_available: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="emergency" className="text-ranting-muted text-xs">
                  Available for emergencies
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="glossy-btn-ghost flex-1 px-4 py-2 rounded-full"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glossy-btn flex-1 px-4 py-2 rounded-full"
                  disabled={isCreating || newVendor.services.length === 0}
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
