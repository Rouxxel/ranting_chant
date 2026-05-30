import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getProperties, getOwners } from "@/services/api";
import type { Property, Owner } from "@/types";

export function OwnerRepresentative() {
  const { currentTenant } = useApp();
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOwner = async () => {
      if (!currentTenant?.property_id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check localStorage for cached properties and owners
        const cachedProperties = localStorage.getItem('properties');
        const cachedOwners = localStorage.getItem('owners');
        if (cachedProperties && cachedOwners) {
          const parsedProperties = JSON.parse(cachedProperties) as Property[];
          const parsedOwners = JSON.parse(cachedOwners) as Owner[];
          const tenantProperty = parsedProperties.find(p => p.id === currentTenant.property_id);
          setProperty(tenantProperty || null);

          if (tenantProperty?.owner_id) {
            const propertyOwner = parsedOwners.find(o => o.id === tenantProperty.owner_id);
            setOwner(propertyOwner || null);
          }
          setIsLoading(false);
        }

        // Load the tenant's property
        const properties = await getProperties();
        localStorage.setItem('properties', JSON.stringify(properties));
        const tenantProperty = properties.find(p => p.id === currentTenant.property_id);
        setProperty(tenantProperty || null);

        if (!tenantProperty?.owner_id) {
          setIsLoading(false);
          return;
        }

        // Load the owner
        const owners = await getOwners();
        localStorage.setItem('owners', JSON.stringify(owners));
        const propertyOwner = owners.find(o => o.id === tenantProperty.owner_id);
        setOwner(propertyOwner || null);
      } catch (error) {
        console.error("Failed to load property owner:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOwner();
  }, [currentTenant]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ranting-ice">Property Owner</h3>
        </div>
        <div className="text-sm text-ranting-muted">Loading...</div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="glass-panel p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-ranting-ice">Property Owner</h3>
        </div>
        <div className="text-sm text-ranting-muted">No property owner information available.</div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ranting-ice">Property Owner</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Name</div>
          <div className="text-sm text-ranting-ice">{owner.name}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Email</div>
          <div className="text-sm text-ranting-ice">{owner.email || "-"}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-ranting-muted mb-1">Phone</div>
          <div className="text-sm text-ranting-ice">{owner.phone || "-"}</div>
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
