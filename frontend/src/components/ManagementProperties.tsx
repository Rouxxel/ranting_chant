import { useState, useEffect } from "react";
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
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Property, PropertyCreateRequest, PropertyUpdateRequest } from "@/types";

export function ManagementProperties() {
  const { currentManager } = useApp();
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

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const allProperties = await getProperties();
        const filteredProperties = allProperties.filter(p => {
          if (!currentManager) return false;
          const managedProps = (currentManager as any).managed_properties || [];
          const ownedProps = (currentManager as any).owned_properties || [];
          return managedProps.includes(p.id) || ownedProps.includes(p.id);
        });
        setProperties(filteredProperties);
      } catch (error) {
        console.error("Failed to load properties:", error);
        setProperties([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProperties();
  }, [currentManager]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newProperty = await createProperty(createForm);
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
        <h2 className="text-xl font-semibold text-ranting-ice">Properties</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glossy-btn">Add Property</Button>
          </DialogTrigger>
          <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice">
            <DialogHeader>
              <DialogTitle>Create New Property</DialogTitle>
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
                <Input
                  id="create-type"
                  value={createForm.property_type || ""}
                  onChange={(e) => setCreateForm({ ...createForm, property_type: e.target.value })}
                  className="aero-input"
                />
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
                  <td className="px-4 py-3 text-sm text-ranting-muted">{property.property_type || "-"}</td>
                  <td className="px-4 py-3 text-sm text-ranting-muted">{property.unit_count || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="glass-panel mt-4 p-6">
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
            <div><span className="text-ranting-muted">Type:</span> {selected.property_type || "-"}</div>
            <div><span className="text-ranting-muted">Units:</span> {selected.unit_count || "-"}</div>
            <div><span className="text-ranting-muted">Year Built:</span> {selected.year_built || "-"}</div>
          </div>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
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
              <Input
                id="edit-type"
                value={editForm.property_type || ""}
                onChange={(e) => setEditForm({ ...editForm, property_type: e.target.value })}
                className="aero-input"
              />
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
                value={editForm.year_built || ""}
                onChange={(e) => setEditForm({ ...editForm, year_built: parseInt(e.target.value) || undefined })}
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
