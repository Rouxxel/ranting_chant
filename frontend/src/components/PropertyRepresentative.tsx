import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getProperties, getManagers } from "@/services/api";
import type { Property, Manager } from "@/types";

export function PropertyRepresentative() {
  const { currentTenant } = useApp();
  const [property, setProperty] = useState<Property | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadManager = async () => {
      if (!currentTenant?.property_id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check localStorage for cached properties and managers
        const cachedProperties = localStorage.getItem('properties');
        const cachedManagers = localStorage.getItem('managers');
        if (cachedProperties && cachedManagers) {
          const parsedProperties = JSON.parse(cachedProperties) as Property[];
          const parsedManagers = JSON.parse(cachedManagers) as Manager[];
          const tenantProperty = parsedProperties.find(p => p.id === currentTenant.property_id);
          setProperty(tenantProperty || null);

          if (tenantProperty?.manager_id) {
            const propertyManager = parsedManagers.find(m => m.id === tenantProperty.manager_id);
            setManager(propertyManager || null);
          }
          setIsLoading(false);
        }

        // Load the tenant's property
        const properties = await getProperties();
        localStorage.setItem('properties', JSON.stringify(properties));
        const tenantProperty = properties.find(p => p.id === currentTenant.property_id);
        setProperty(tenantProperty || null);

        if (!tenantProperty?.manager_id) {
          setIsLoading(false);
          return;
        }

        // Load the manager
        const managers = await getManagers();
        localStorage.setItem('managers', JSON.stringify(managers));
        const propertyManager = managers.find(m => m.id === tenantProperty.manager_id);
        setManager(propertyManager || null);
      } catch (error) {
        console.error("Failed to load property manager:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadManager();
  }, [currentTenant]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ranting-ice">Property Manager</h3>
        </div>
        <div className="text-sm text-ranting-muted">Loading...</div>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="glass-panel p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ranting-ice">Property Manager</h3>
        </div>
        <div className="text-sm text-ranting-muted">No property manager assigned to this property.</div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ranting-ice">Property Manager</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Name</div>
          <div className="text-sm text-ranting-ice">{manager.name}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Email</div>
          <div className="text-sm text-ranting-ice">{manager.email || "-"}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Phone</div>
          <div className="text-sm text-ranting-ice">{manager.phone || "-"}</div>
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
