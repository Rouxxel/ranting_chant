import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { updateManagerProfile, updateOwnerProfile } from "@/services/api";
import type { ProfileUpdateRequest } from "@/types";

export function ManagementProfile() {
  const { currentManager, userRole } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileUpdateRequest>({});
  const [isLoading, setIsLoading] = useState(false);

  const isOwner = userRole === "owner";
  const displayName = currentManager?.name || "User";
  const email = currentManager?.email || "";
  const phone = currentManager?.phone || "";

  const handleSave = async () => {
    if (!currentManager) return;
    setIsLoading(true);
    try {
      if (isOwner) {
        await updateOwnerProfile(currentManager.id, editForm);
      } else {
        await updateManagerProfile(currentManager.id, editForm);
      }
      setIsEditing(false);
      setEditForm({});
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="pl-5 text-xl font-semibold text-ranting-ice">Profile</h2>
      </div>

      <div className="glass-panel p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-ranting-ice">{displayName}</h3>
          <p className="text-sm text-ranting-muted">{isOwner ? "Owner" : "Manager"}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-ranting-muted mb-1">Email</label>
            {isEditing ? (
              <input
                type="email"
                defaultValue={email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="aero-input w-full px-3 py-2 text-sm"
              />
            ) : (
              <div className="text-sm text-ranting-ice">{email || "-"}</div>
            )}
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
