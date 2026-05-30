import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { getTenants, createTenant, updateTenant, deleteTenant, getProperties } from "@/services/api";
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
import type { Tenant, TenantCreateRequest, TenantUpdateRequest, Property } from "@/types";

export function ManagementTenants() {
  const { currentManager } = useApp();
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check localStorage for cached tenants and properties
        const cachedTenants = localStorage.getItem('tenants');
        const cachedProperties = localStorage.getItem('properties');
        if (cachedTenants && cachedProperties) {
          const parsedTenants = JSON.parse(cachedTenants) as Tenant[];
          const parsedProperties = JSON.parse(cachedProperties) as Property[];

          // Filter tenants for current manager/owner based on their properties
          const filteredTenants = parsedTenants.filter((t: Tenant) => {
            if (!currentManager || !t.property_id) return false;
            const managedProps = (currentManager as any).managed_properties || [];
            const ownedProps = (currentManager as any).owned_properties || [];
            return managedProps.includes(t.property_id) || ownedProps.includes(t.property_id);
          });

          // Filter properties for current manager/owner
          const filteredProperties = parsedProperties.filter((p: Property) => {
            if (!currentManager) return false;
            const managedProps = (currentManager as any).managed_properties || [];
            const ownedProps = (currentManager as any).owned_properties || [];
            return managedProps.includes(p.id) || ownedProps.includes(p.id);
          });

          setTenants(filteredTenants);
          setProperties(filteredProperties);
          setIsLoading(false);
        }

        // Fetch fresh data
        const [allTenants, allProperties] = await Promise.all([getTenants(), getProperties()]);
        localStorage.setItem('tenants', JSON.stringify(allTenants));
        localStorage.setItem('properties', JSON.stringify(allProperties));

        // Filter tenants for current manager/owner based on their properties
        const filteredTenants = allTenants.filter(t => {
          if (!currentManager || !t.property_id) return false;
          const managedProps = (currentManager as any).managed_properties || [];
          const ownedProps = (currentManager as any).owned_properties || [];
          return managedProps.includes(t.property_id) || ownedProps.includes(t.property_id);
        });

        // Filter properties for current manager/owner
        const filteredProperties = allProperties.filter(p => {
          if (!currentManager) return false;
          const managedProps = (currentManager as any).managed_properties || [];
          const ownedProps = (currentManager as any).owned_properties || [];
          return managedProps.includes(p.id) || ownedProps.includes(p.id);
        });

        setTenants(filteredTenants);
        setProperties(filteredProperties);
      } catch (error) {
        console.error("Failed to load data:", error);
        setTenants([]);
        setProperties([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentManager]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newTenant = await createTenant(createForm);
      setTenants([...tenants, newTenant]);
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", unit: "", property_id: "" });
    } catch (error) {
      console.error("Failed to create tenant:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const updatedTenant = await updateTenant(selected.id, editForm);
      setTenants(tenants.map(t => t.id === selected.id ? updatedTenant : t));
      setSelected(updatedTenant);
      setIsEditDialogOpen(false);
      setEditForm({});
    } catch (error) {
      console.error("Failed to update tenant:", error);
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
      setTenants(tenants.filter(t => t.id !== selected.id));
      setSelected(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete tenant:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="glass-panel p-8 text-center text-ranting-muted">Loading tenants...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="pl-5 text-xl font-semibold text-ranting-ice">Tenants</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glossy-btn">Add Tenant</Button>
          </DialogTrigger>
          <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
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

      <div className="glass-panel">
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-ranting-muted">No tenants found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ranting-sky/20">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Unit</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Property</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Email</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Phone</th>
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
                  <td className="px-4 py-3 text-sm text-ranting-muted">{tenant.unit}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{tenant.property_id ? properties.find(p => p.id === tenant.property_id)?.name || "-" : "-"}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{tenant.email || "-"}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{tenant.phone || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="glass-panel mt-4 p-6">
          <label className="block text-xs uppercase tracking-wider text-ranting-muted mb-1">Tenant's Name</label>
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
            <div><span className="text-ranting-muted">Unit:</span> {selected.unit}</div>
            <div><span className="text-ranting-muted">Property:</span> {selected.property_id ? properties.find(p => p.id === selected.property_id)?.name || "-" : "-"}</div>
            <div><span className="text-ranting-muted">Email:</span> {selected.email || "-"}</div>
            <div><span className="text-ranting-muted">Phone:</span> {selected.phone || "-"}</div>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
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
