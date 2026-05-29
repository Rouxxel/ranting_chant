import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getProperties, getManagers, getOwners } from "@/services/api";
import type { Property, Manager, Owner } from "@/types";

export function PropertyRepresentative() {
  const { currentTenant } = useApp();
  const [property, setProperty] = useState<Property | null>(null);
  const [representative, setRepresentative] = useState<Manager | Owner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRepresentative = async () => {
      if (!currentTenant?.property_id) {
        setIsLoading(false);
        return;
      }

      try {
        // Load the tenant's property
        const properties = await getProperties();
        const tenantProperty = properties.find(p => p.id === currentTenant.property_id);
        setProperty(tenantProperty || null);

        if (!tenantProperty) {
          setIsLoading(false);
          return;
        }

        // Determine representative type and load appropriate data
        // For now, we'll use manager_id if available, otherwise owner_id
        const representativeId = tenantProperty.manager_id || tenantProperty.owner_id;
        
        if (representativeId) {
          if (tenantProperty.manager_id === representativeId) {
            const managers = await getManagers();
            const rep = managers.find(m => m.id === representativeId);
            setRepresentative(rep || null);
          } else {
            const owners = await getOwners();
            const rep = owners.find(o => o.id === representativeId);
            setRepresentative(rep || null);
          }
        }
      } catch (error) {
        console.error("Failed to load property representative:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRepresentative();
  }, [currentTenant]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ranting-ice">Property Contact</h3>
          <p className="text-sm text-ranting-muted">Your Property Manager or Owner</p>
        </div>
        <div className="text-sm text-ranting-muted">Loading...</div>
      </div>
    );
  }

  if (!representative) {
    return (
      <div className="glass-panel p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ranting-ice">Property Contact</h3>
          <p className="text-sm text-ranting-muted">Your Property Manager or Owner</p>
        </div>
        <div className="text-sm text-ranting-muted">No property contact information available.</div>
      </div>
    );
  }

  const isManager = 'managed_properties' in representative;
  const role = isManager ? "Property Manager" : "Property Owner";

  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ranting-ice">Property Contact</h3>
        <p className="text-sm text-ranting-muted">Your Property Manager or Owner</p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Name</div>
          <div className="text-sm text-ranting-ice">{representative.name}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Role</div>
          <div className="text-sm text-ranting-ice">{role}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Email</div>
          <div className="text-sm text-ranting-ice">{representative.email || "-"}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Phone</div>
          <div className="text-sm text-ranting-ice">{representative.phone || "-"}</div>
        </div>

        {property && (
          <div>
            <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Property</div>
            <div className="text-sm text-ranting-ice">{property.name}</div>
          </div>
        )}
      </div>
    </div>
  );
}
