import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { updateTenantProfile, getProperties } from "@/services/api";
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
import type { ProfileUpdateRequest, Property } from "@/types";

export function TenantProfile() {
  const { currentTenant } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileUpdateRequest>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const props = await getProperties();
        setProperties(props);
      } catch (error) {
        console.error("Failed to load properties:", error);
      } finally {
        setIsLoadingProperties(false);
      }
    };

    loadProperties();
  }, []);

  const displayName = currentTenant?.name || "User";
  const email = currentTenant?.email || "";
  const phone = currentTenant?.phone || "";
  const unit = currentTenant?.unit || "-";

  // Find property name by property_id
  const property = currentTenant?.property_id
    ? properties.find(p => p.id === currentTenant.property_id)?.name || currentTenant.property || "-"
    : currentTenant?.property || "-";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;
    setIsSubmitting(true);
    try {
      await updateTenantProfile(currentTenant.id, editForm);
      setIsEditing(false);
      setEditForm({});
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-ranting-ice">My Profile</h3>
        <p className="text-sm text-ranting-muted">Tenant Information</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-ranting-muted">Name</Label>
          <div className="text-sm text-ranting-ice">{displayName}</div>
        </div>

        <div>
          <Label className="text-ranting-muted">Unit</Label>
          <div className="text-sm text-ranting-ice">{unit}</div>
        </div>

        <div>
          <Label className="text-ranting-muted">Property</Label>
          <div className="text-sm text-ranting-ice">{property}</div>
        </div>

        <div>
          <Label className="text-ranting-muted">Email</Label>
          {isEditing ? (
            <Input
              type="email"
              defaultValue={email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="aero-input"
            />
          ) : (
            <div className="text-sm text-ranting-ice">{email || "-"}</div>
          )}
        </div>

        <div>
          <Label className="text-ranting-muted">Phone</Label>
          {isEditing ? (
            <Input
              type="tel"
              defaultValue={phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="aero-input"
            />
          ) : (
            <div className="text-sm text-ranting-ice">{phone || "-"}</div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                className="glossy-btn"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({});
                }}
                variant="ghost"
                className="glossy-btn-ghost"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="glossy-btn"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
