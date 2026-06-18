import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { updateManagerProfile, updateOwnerProfile, describeValidationError } from "@/services/api";
import type { ProfileUpdateRequest } from "@/types";

export function ManagementProfile() {
  const { currentManager, setCurrentManager, userRole } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileUpdateRequest>({});
  const [isLoading, setIsLoading] = useState(false);

  const isOwner = userRole === "owner";
  const displayName = currentManager?.name || "User";
  const email = currentManager?.email || "";
  const phone = currentManager?.phone || "";

  const handleSave = async () => {
    if (!currentManager) return;

    // Only keep fields that actually differ from the current values
    const changes: ProfileUpdateRequest = {};
    if (editForm.name !== undefined && editForm.name !== displayName) {
      changes.name = editForm.name;
    }
    // Commented out to prevent mismatch between actors table and auth table
    // if (editForm.email !== undefined && editForm.email !== email) {
    //   changes.email = editForm.email;
    // }
    if (editForm.phone !== undefined && editForm.phone !== phone) {
      changes.phone = editForm.phone;
    }

    if (Object.keys(changes).length === 0) {
      toast.error("Please enter your changes");
      return;
    }

    setIsLoading(true);
    try {
      const updated = isOwner
        ? await updateOwnerProfile(currentManager.id, changes)
        : await updateManagerProfile(currentManager.id, changes);
      // Refresh the cached user (state + localStorage) so the UI reflects the change.
      setCurrentManager(updated);
      setIsEditing(false);
      setEditForm({});
      toast.success("Profile updated");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(describeValidationError(error, "Failed to update profile. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[rgb(51,71,88)] pl-5 text-xl font-semibold">Profile</h2>
      </div>

      <div className="glass-panel p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1">{isOwner ? "Owner" : "Manager"}</label>
            {isEditing ? (
              <input
                type="text"
                defaultValue={displayName}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="aero-input w-full px-3 py-2 text-sm"
              />
            ) : (
              <div className="text-sm text-ranting-ice">{displayName}</div>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-ranting-muted mb-1">Email</label>
            {/* Commented out to prevent mismatch between actors table and auth table */}
            {/* {isEditing ? (
              <input
                type="email"
                defaultValue={email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="aero-input w-full px-3 py-2 text-sm"
              />
            ) : ( */}
              <div className="text-sm text-ranting-ice">{email || "-"}</div>
            {/* )} */}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-ranting-muted mb-1">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                defaultValue={phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="aero-input w-full px-3 py-2 text-sm"
              />
            ) : (
              <div className="text-sm text-ranting-ice">{phone || "-"}</div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="glossy-btn px-4 py-2 text-xs"
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({});
                  }}
                  className="glossy-btn-ghost px-4 py-2 text-xs"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="glossy-btn px-4 py-2 text-xs"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
