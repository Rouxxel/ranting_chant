import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { getTenants, createTenant, updateTenant, deleteTenant, getProperties, describeValidationError } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Tenant, TenantCreateRequest, TenantUpdateRequest, Property } from "@/types";

export function ManagementTenants() {
  const { currentManager, userRole } = useApp();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TenantCreateRequest>({
    name: "",
    unit: "",
    property_id: "",
  });
  const [editForm, setEditForm] = useState<TenantUpdateRequest>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Namespaced cache keys for tenant and property lists.
  const propertiesCacheKey = currentManager
    ? `properties_${userRole}_${currentManager.id}`
    : 'properties';
  const tenantsCacheKey = 'tenants'; // tenants list is shared; filtering is client-side

  // A property belongs to the current manager/owner if it's in their managed/owned
  // list OR its manager_id/owner_id points at them (covers freshly created properties
  // whose ids aren't yet in the cached user record).
  const ownsProperty = useCallback((p: Property) => {
    if (!currentManager) return false;
    const managedProps = (currentManager as any).managed_properties || [];
    const ownedProps = (currentManager as any).owned_properties || [];
    return (
      managedProps.includes(p.id) ||
      ownedProps.includes(p.id) ||
      p.manager_id === currentManager.id ||
      p.owner_id === currentManager.id
    );
  }, [currentManager]);

  const applyData = useCallback((allTenants: Tenant[], allProperties: Property[]) => {
    const myProperties = allProperties.filter(ownsProperty);
    const myPropertyIds = new Set(myProperties.map((p) => p.id));
    setProperties(myProperties);
    setTenants(allTenants.filter((t) => t.property_id && myPropertyIds.has(t.property_id)));
  }, [ownsProperty]);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [allTenants, allProperties] = await Promise.all([getTenants(), getProperties()]);
      localStorage.setItem(tenantsCacheKey, JSON.stringify(allTenants));
      const myProperties = allProperties.filter(ownsProperty);
      localStorage.setItem(propertiesCacheKey, JSON.stringify(myProperties));
      applyData(allTenants, allProperties);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [applyData, ownsProperty, propertiesCacheKey, tenantsCacheKey]);

  useEffect(() => {
    // Show cached data immediately, then refresh from the API.
    const cachedTenants = localStorage.getItem(tenantsCacheKey);
    const cachedProperties = localStorage.getItem(propertiesCacheKey);
    if (cachedTenants && cachedProperties) {
      applyData(JSON.parse(cachedTenants), JSON.parse(cachedProperties));
      setIsLoading(false);
    }
    fetchData();
  }, [applyData, fetchData, propertiesCacheKey, tenantsCacheKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newTenant = await createTenant(createForm);
      const next = [...tenants, newTenant];
      setTenants(next);
      // Update shared tenants cache
      const allCached = localStorage.getItem(tenantsCacheKey);
      const all: Tenant[] = allCached ? JSON.parse(allCached) : tenants;
      localStorage.setItem(tenantsCacheKey, JSON.stringify([...all, newTenant]));
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", unit: "", property_id: "" });
    } catch (error) {
      console.error("Failed to create tenant:", error);
      toast.error(describeValidationError(error, "Failed to create tenant. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    // Only send fields that actually changed from the cached tenant.
    const changes: TenantUpdateRequest = {};
    if (editForm.unit !== undefined && editForm.unit !== selected.unit) {
      changes.unit = editForm.unit;
    }
    if (editForm.property_id !== undefined && editForm.property_id !== selected.property_id) {
      changes.property_id = editForm.property_id;
    }

    if (Object.keys(changes).length === 0) {
      toast.error("Please enter your changes");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedTenant = await updateTenant(selected.id, changes);
      const next = tenants.map(t => t.id === selected.id ? updatedTenant : t);
      setTenants(next);
      // Update shared tenants cache
      const allCached = localStorage.getItem(tenantsCacheKey);
      if (allCached) {
        const all: Tenant[] = JSON.parse(allCached);
        localStorage.setItem(tenantsCacheKey, JSON.stringify(
          all.map(t => t.id === selected.id ? updatedTenant : t)
        ));
      }
      setSelected(updatedTenant);
      setIsEditDialogOpen(false);
      setEditForm({});
    } catch (error) {
      console.error("Failed to update tenant:", error);
      toast.error(describeValidationError(error, "Failed to update tenant. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = () => {
    if (!selected) return;
    setEditForm({
      unit: selected.unit,
      property_id: selected.property_id,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await deleteTenant(selected.id);
      const next = tenants.filter(t => t.id !== selected.id);
      setTenants(next);
      // Update shared tenants cache
      const allCached = localStorage.getItem(tenantsCacheKey);
      if (allCached) {
        const all: Tenant[] = JSON.parse(allCached);
        localStorage.setItem(tenantsCacheKey, JSON.stringify(
          all.filter(t => t.id !== selected.id)
        ));
      }
      setSelected(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete tenant:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="glass-panel p-8 text-center text-ranting-deep">Loading tenants...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[rgb(51,71,88)] pl-5 text-xl font-semibold">Tenants</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchData}
            disabled={isRefreshing}
            variant="ghost"
            className="glossy-btn-ghost inline-flex items-center gap-2 disabled:opacity-60"
            title="Reload tenants from the server"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Reloading..." : "Reload"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glossy-btn">Add Tenant</Button>
            </DialogTrigger>
            <DialogContent className="aero-surface max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription className="text-ranting-deep">
                  Name, unit, and property are required. Email and phone are optional.
                </DialogDescription>
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
                  <Label htmlFor="create-unit">Unit</Label>
                  <Input
                    id="create-unit"
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    required
                    className="aero-input"
                  />
                </div>
                <div>
                  <Label htmlFor="create-property">Property</Label>
                  <select
                    id="create-property"
                    value={createForm.property_id}
                    onChange={(e) => setCreateForm({ ...createForm, property_id: e.target.value })}
                    required
                    className="aero-input w-full px-3 py-2"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Select a property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id} className="bg-ranting-deep text-ranting-ice">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email || ""}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="aero-input"
                  />
                </div>
                <div>
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    type="tel"
                    value={createForm.phone || ""}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="aero-input"
                  />
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
        </div>
      </div>

      <div className="glass-panel">
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-ranting-deep">No tenants found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ranting-sky/20">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-deep">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-deep">Unit</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-deep">Property</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-deep">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-deep">Phone</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="cursor-pointer border-b border-ranting-sky/10 hover:bg-ranting-sky/5"
                  onClick={() => setSelected(tenant)}
                >
                  <td className="px-4 py-3 text-sm text-ranting-ice">{tenant.name}</td>
                  <td className="px-4 py-3 text-sm text-ranting-deep">{tenant.unit}</td>
                  <td className="px-4 py-3 text-sm text-ranting-deep">{tenant.property_id ? properties.find(p => p.id === tenant.property_id)?.name || "-" : "-"}</td>
                  <td className="px-4 py-3 text-sm text-ranting-deep">{tenant.email || "-"}</td>
                  <td className="px-4 py-3 text-sm text-ranting-deep">{tenant.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="glass-panel mt-4 p-6">
          <label className="block text-xs uppercase tracking-wider text-ranting-deep mb-1">Tenant's Name</label>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ranting-ice">{selected.name}</h3>
            <div className="flex gap-2">
              <Button onClick={openEditDialog} className="glossy-btn px-3 py-1.5 text-xs">
                Edit
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="ghost"
                className="glossy-btn-ghost px-3 py-1.5 text-xs text-red-400 hover:text-red-300"
              >
                Delete
              </Button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div><span className="text-ranting-deep">Unit:</span> {selected.unit}</div>
            <div><span className="text-ranting-deep">Property:</span> {selected.property_id ? properties.find(p => p.id === selected.property_id)?.name || "-" : "-"}</div>
            <div><span className="text-ranting-deep">Email:</span> {selected.email || "-"}</div>
            <div><span className="text-ranting-deep">Phone:</span> {selected.phone || "-"}</div>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="aero-surface max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription className="text-ranting-deep">
              Update the tenant's unit or property and save your changes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                value={editForm.unit || ""}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                className="aero-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-property">Property</Label>
              <select
                id="edit-property"
                value={editForm.property_id || ""}
                onChange={(e) => setEditForm({ ...editForm, property_id: e.target.value })}
                className="aero-input w-full px-3 py-2"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id} className="bg-ranting-deep text-ranting-ice">
                    {p.name}
                  </option>
                ))}
              </select>
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
        title="Delete Tenant"
        message={`Are you sure you want to delete ${selected?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
