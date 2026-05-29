import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Avatar } from "@/components/Avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApp } from "@/context/AppContext";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getVendors, createVendor, updateVendor, deleteVendor } from "@/services/api";
import type { Vendor, VendorCreateRequest, VendorUpdateRequest } from "@/types";

const SERVICE_LABELS: Record<string, string> = {
  access_control: "Access Control",
  appliance_repair: "Appliance Repair",
  door_repair: "Door Repair",
  drain_cleaning: "Drain Cleaning",
  electrical: "Electrical",
  general_repair: "General Repair",
  glass_repair: "Glass Repair",
  handyman: "Handyman",
  hvac: "HVAC",
  locksmith: "Locksmith",
  pest_control: "Pest Control",
  plumbing: "Plumbing",
  security_systems: "Security Systems",
};

function getServiceLabel(service: string) {
  return SERVICE_LABELS[service] ?? service
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<VendorCreateRequest>({
    name: "",
    email: "",
    phone: "",
    services: [],
    emergency_available: false,
  });
  const [editForm, setEditForm] = useState<VendorUpdateRequest>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isManagerOrOwner = userRole === "manager" || userRole === "owner";

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newVendor = await createVendor(createForm);
      setVendors([...vendors, newVendor]);
      localStorage.setItem('vendors', JSON.stringify([...vendors, newVendor]));
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        services: [],
        emergency_available: false,
      });
    } catch (error) {
      console.error("Failed to create vendor:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const updatedVendor = await updateVendor(selected.id, editForm);
      setVendors(vendors.map(v => v.id === selected.id ? updatedVendor : v));
      localStorage.setItem('vendors', JSON.stringify(vendors.map(v => v.id === selected.id ? updatedVendor : v)));
      setSelected(updatedVendor);
      setIsEditDialogOpen(false);
      setEditForm({});
    } catch (error) {
      console.error("Failed to update vendor:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVendor(vendorToDelete);
      setVendors(vendors.filter(v => v.id !== vendorToDelete));
      localStorage.setItem('vendors', JSON.stringify(vendors.filter(v => v.id !== vendorToDelete)));
      if (selected?.id === vendorToDelete) setSelected(null);
      setIsDeleteDialogOpen(false);
      setVendorToDelete(null);
    } catch (error) {
      console.error("Failed to delete vendor:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (vendorId: string) => {
    setVendorToDelete(vendorId);
    setIsDeleteDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      email: selected.email,
      phone: selected.phone,
      services: selected.services,
      emergency_available: selected.emergency_available,
    });
    setIsEditDialogOpen(true);
  };

  const handleServiceToggle = (service: string, isCreate: boolean) => {
    if (isCreate) {
      const currentServices = createForm.services || [];
      const newServices = currentServices.includes(service)
        ? currentServices.filter(s => s !== service)
        : [...currentServices, service];
      setCreateForm({ ...createForm, services: newServices });
    } else {
      const currentServices = editForm.services || [];
      const newServices = currentServices.includes(service)
        ? currentServices.filter(s => s !== service)
        : [...currentServices, service];
      setEditForm({ ...editForm, services: newServices });
    }
  };

  return (
    <AuthenticatedLayout>
      <main className="mx-auto min-h-[calc(100vh-130px)] max-w-[1400px]">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ranting-ice">Vendor Directory</div>
          <div className="text-[11px] text-ranting-muted">Third-party service providers</div>
        </div>
        {isManagerOrOwner && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glossy-btn">Add Vendor</Button>
            </DialogTrigger>
            <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    className="aero-input"
                  />
                </div>
                <div>
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                    className="aero-input"
                  />
                </div>
                <div>
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    required
                    className="aero-input"
                  />
                </div>
                <div>
                  <Label htmlFor="create-emergency">Emergency Available</Label>
                  <select
                    id="create-emergency"
                    value={createForm.emergency_available ? "true" : "false"}
                    onChange={(e) => setCreateForm({ ...createForm, emergency_available: e.target.value === "true" })}
                    className="aero-input w-full px-3 py-2"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="false" className="bg-ranting-deep text-ranting-ice">No</option>
                    <option value="true" className="bg-ranting-deep text-ranting-ice">Yes</option>
                  </select>
                </div>
                <div>
                  <Label>Services</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-ranting-ice">
                        <input
                          type="checkbox"
                          checked={createForm.services?.includes(key)}
                          onChange={() => handleServiceToggle(key, true)}
                          className="rounded border-ranting-sky/30 bg-ranting-deep text-ranting-accent focus:ring-ranting-accent"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="glossy-btn-ghost">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="glossy-btn">
                    {isSubmitting ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
        <Select
          value={serviceFilter}
          onValueChange={setServiceFilter}
        >
          <SelectTrigger className="h-10 min-w-[210px] border-ranting-sky/35 bg-ranting-deep text-ranting-ice shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_14px_rgba(45,106,159,0.22)]">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent className="border-ranting-sky/35 bg-ranting-navy text-ranting-ice shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
            <SelectItem value="all" className="focus:bg-ranting-accent focus:text-white">
              All Services
            </SelectItem>
            {allServices.map(service => (
              <SelectItem key={service} value={service} className="focus:bg-ranting-accent focus:text-white">
                {getServiceLabel(service)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-ranting-muted">{filteredVendors.length} of {vendors.length}</span>
      </div>

      {/* Vendor List */}
      {isLoading ? (
        <div className="glass-panel p-8 text-center text-ranting-muted">Loading vendors...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="glass-panel p-8 text-center text-ranting-muted">No vendors found</div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className={`grid gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-ranting-muted ${isManagerOrOwner ? 'grid-cols-[1fr_1fr_1fr_1fr_1fr_0.8fr_0.5fr]' : 'grid-cols-[1fr_1fr_1fr_1fr_1fr_0.8fr]'}`}>
            <div>Name</div><div>Email</div><div>Phone</div><div>Services</div><div>Emergency</div><div>Rating</div>
            {isManagerOrOwner && <div>Actions</div>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {filteredVendors.map((v) => (
              <li
                key={v.id}
                className={`grid ${isManagerOrOwner ? 'grid-cols-[1fr_1fr_1fr_1fr_1fr_0.8fr_0.5fr]' : 'grid-cols-[1fr_1fr_1fr_1fr_1fr_0.8fr]'} items-center gap-3 border-b border-white/5 px-4 py-3 text-sm transition hover:bg-white/[0.05]`}
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
                      {getServiceLabel(s)}
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
                {isManagerOrOwner && (
                  <div className="flex gap-1">
                    <Button
                      onClick={() => { setSelected(v); openEditDialog(); }}
                      variant="ghost"
                      className="glossy-btn-ghost px-2 py-1 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => openDeleteDialog(v.id)}
                      variant="ghost"
                      className="glossy-btn-ghost px-2 py-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="aero-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="aero-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone || ""}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="aero-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-emergency">Emergency Available</Label>
              <select
                id="edit-emergency"
                value={editForm.emergency_available ? "true" : "false"}
                onChange={(e) => setEditForm({ ...editForm, emergency_available: e.target.value === "true" })}
                className="aero-input w-full px-3 py-2"
                style={{ colorScheme: "dark" }}
              >
                <option value="false" className="bg-ranting-deep text-ranting-ice">No</option>
                <option value="true" className="bg-ranting-deep text-ranting-ice">Yes</option>
              </select>
            </div>
            <div>
              <Label>Services</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-ranting-ice">
                    <input
                      type="checkbox"
                      checked={editForm.services?.includes(key)}
                      onChange={() => handleServiceToggle(key, false)}
                      className="rounded border-ranting-sky/30 bg-ranting-deep text-ranting-accent focus:ring-ranting-accent"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="glossy-btn-ghost">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="glossy-btn">
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Vendor"
        message={`Are you sure you want to delete this vendor? This action cannot be undone.`}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      </main>
    </AuthenticatedLayout>
  );
}
