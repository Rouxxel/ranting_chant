import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProperties, createProperty, updateProperty } from "@/services/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Property, PropertyCreateRequest, PropertyUpdateRequest } from "@/types";
import { getPropertyTypeLabel, PROPERTY_TYPES, propertyTypeLabels } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();

export function ManagementProperties() {
  const { currentManager, userRole } = useApp();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Property | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PropertyCreateRequest>({
    name: "",
    address: "",
  });
  const [editForm, setEditForm] = useState<PropertyUpdateRequest>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const fetchProperties = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const allProperties = await getProperties();
      localStorage.setItem('properties', JSON.stringify(allProperties));
      setProperties(allProperties.filter(ownsProperty));
    } catch (error) {
      console.error("Failed to load properties:", error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [ownsProperty]);

  useEffect(() => {
    // Show cached data immediately, then refresh from the API.
    const cachedProperties = localStorage.getItem('properties');
    if (cachedProperties) {
      setProperties((JSON.parse(cachedProperties) as Property[]).filter(ownsProperty));
      setIsLoading(false);
    }
    fetchProperties();
  }, [ownsProperty, fetchProperties]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Associate the new property with the creator so its representative is set.
      const payload: PropertyCreateRequest = { ...createForm };
      if (currentManager) {
        if (userRole === "owner") {
          payload.owner_id = currentManager.id;
        } else {
          payload.manager_id = currentManager.id;
        }
      }
      const newProperty = await createProperty(payload);
      setProperties([...properties, newProperty]);
      setIsCreateDialogOpen(false);
      setCreateForm({ name: "", address: "" });
    } catch (error) {
      console.error("Failed to create property:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      const updatedProperty = await updateProperty(selected.id, editForm);
      setProperties(properties.map(p => p.id === selected.id ? updatedProperty : p));
      setSelected(updatedProperty);
      setIsEditDialogOpen(false);
      setEditForm({});
    } catch (error) {
      console.error("Failed to update property:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name,
      address: selected.address,
      year_built: selected.year_built,
      property_type: selected.property_type,
      unit_count: selected.unit_count,
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return <div className="glass-panel p-8 text-center text-ranting-muted">Loading properties...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="pl-5 text-xl font-semibold text-ranting-ice">Properties</h2>
        <div className="flex items-center gap-2">
        <Button
          onClick={fetchProperties}
          disabled={isRefreshing}
          variant="ghost"
          className="glossy-btn-ghost inline-flex items-center gap-2 disabled:opacity-60"
          title="Reload properties from the server"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Reloading..." : "Reload"}
        </Button>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glossy-btn">Add Property</Button>
          </DialogTrigger>
          <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
              <DialogDescription className="text-ranting-muted">
                Enter the property details. Only name and address are required.
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
                <Label htmlFor="create-address">Address</Label>
                <Input
                  id="create-address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  required
                  className="aero-input"
                />
              </div>
              <div>
                <Label htmlFor="create-type">Type</Label>
                <Select
                  value={createForm.property_type ?? ""}
                  onValueChange={(value) => setCreateForm({ ...createForm, property_type: value })}
                >
                  <SelectTrigger id="create-type" className="aero-input">
                    <SelectValue placeholder="Select a property type" />
                  </SelectTrigger>
                  <SelectContent className="border-ranting-sky/35 bg-ranting-navy text-ranting-ice">
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="focus:bg-ranting-accent focus:text-white">
                        {propertyTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-units">Unit Count</Label>
                <Input
                  id="create-units"
                  type="number"
                  value={createForm.unit_count || ""}
                  onChange={(e) => setCreateForm({ ...createForm, unit_count: parseInt(e.target.value) || undefined })}
                  className="aero-input"
                />
              </div>
              <div>
                <Label htmlFor="create-year">Year Built</Label>
                <Input
                  id="create-year"
                  type="number"
                  max={CURRENT_YEAR}
                  value={createForm.year_built || ""}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value);
                    setCreateForm({
                      ...createForm,
                      year_built: Number.isNaN(parsed) ? undefined : Math.min(parsed, CURRENT_YEAR),
                    });
                  }}
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
        {properties.length === 0 ? (
          <div className="p-8 text-center text-ranting-muted">No properties found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ranting-sky/20">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Name</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Address</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Type</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-ranting-muted">Units</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr
                  key={property.id}
                  className="cursor-pointer border-b border-ranting-sky/10 hover:bg-ranting-sky/5"
                  onClick={() => setSelected(property)}
                >
                  <td className="px-4 py-3 text-sm text-ranting-ice">{property.name}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{property.address}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{property.property_type ? getPropertyTypeLabel(property.property_type) : "-"}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{property.unit_count || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="glass-panel mt-4 p-6">
          <label className="block text-xs uppercase tracking-wider text-ranting-muted mb-1">Property Name</label>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ranting-ice">{selected.name}</h3>
            <div className="flex gap-2">
              <Button onClick={openEditDialog} className="glossy-btn px-3 py-1.5 text-xs">
                Edit
              </Button>
              <Button
                onClick={() => setSelected(null)}
                variant="ghost"
                className="glossy-btn-ghost px-3 py-1.5 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div><span className="text-ranting-muted">Address:</span> {selected.address}</div>
            <div><span className="text-ranting-muted">Type:</span> {selected.property_type ? getPropertyTypeLabel(selected.property_type) : "-"}</div>
            <div><span className="text-ranting-muted">Units:</span> {selected.unit_count || "-"}</div>
            <div><span className="text-ranting-muted">Year Built:</span> {selected.year_built || "-"}</div>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription className="text-ranting-muted">
              Update the property details and save your changes.
            </DialogDescription>
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
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address || ""}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="aero-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={editForm.property_type ?? ""}
                onValueChange={(value) => setEditForm({ ...editForm, property_type: value })}
              >
                <SelectTrigger id="edit-type" className="aero-input">
                  <SelectValue placeholder="Select a property type" />
                </SelectTrigger>
                <SelectContent className="border-ranting-sky/35 bg-ranting-navy text-ranting-ice">
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="focus:bg-ranting-accent focus:text-white">
                      {propertyTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-units">Unit Count</Label>
              <Input
                id="edit-units"
                type="number"
                value={editForm.unit_count || ""}
                onChange={(e) => setEditForm({ ...editForm, unit_count: parseInt(e.target.value) || undefined })}
                className="aero-input"
              />
            </div>
            <div>
              <Label htmlFor="edit-year">Year Built</Label>
              <Input
                id="edit-year"
                type="number"
                max={CURRENT_YEAR}
                value={editForm.year_built || ""}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value);
                  setEditForm({
                    ...editForm,
                    year_built: Number.isNaN(parsed) ? undefined : Math.min(parsed, CURRENT_YEAR),
                  });
                }}
                className="aero-input"
              />
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
    </div>
  );
}
