import { useState, useEffect } from "react";
import { Building2, MapPin, Calendar, Users, Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getProperties, getPropertyById, createProperty, deleteProperty } from "../services/api";
import type { Property } from "../types";

interface PropertyManagementProps {
  className?: string;
}

export function PropertyManagement({ className = "" }: PropertyManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    year_built: new Date().getFullYear(),
    property_type: "apartment_building" as string,
    unit_count: 1,
  });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await getProperties();
        setProperties(data);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
        toast.error("Failed to load properties");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handlePropertySelect = async (property: Property) => {
    setSelectedProperty(property);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await deleteProperty(propertyId);
      toast.success("Property deleted successfully");
      setProperties(properties.filter((p) => p.id !== propertyId));
      if (selectedProperty?.id === propertyId) {
        setSelectedProperty(null);
      }
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast.error("Failed to delete property");
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const created = await createProperty({
        name: newProperty.name,
        address: newProperty.address,
        year_built: newProperty.year_built,
        property_type: newProperty.property_type,
        unit_count: newProperty.unit_count,
      });
      toast.success("Property created successfully");
      setProperties([...properties, created]);
      setIsAdding(false);
      setNewProperty({
        name: "",
        address: "",
        year_built: new Date().getFullYear(),
        property_type: "apartment_building",
        unit_count: 1,
      });
    } catch (error) {
      console.error("Failed to create property:", error);
      toast.error("Failed to create property");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-ranting-ice text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-ranting-sky" />
          Properties
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="glossy-btn flex items-center gap-2 px-4 py-2 rounded-full"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
        <input
          type="text"
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="aero-input w-full pl-10 pr-4 py-2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-ranting-muted py-8">Loading properties...</div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center text-ranting-muted py-8">No properties found</div>
          ) : (
            filteredProperties.map((property) => (
              <button
                key={property.id}
                onClick={() => handlePropertySelect(property)}
                className={`w-full text-left p-4 rounded-lg transition-colors ${
                  selectedProperty?.id === property.id
                    ? "bg-ranting-sky/20 border border-ranting-sky/50"
                    : "bg-ranting-deep/20 hover:bg-ranting-deep/30 border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ranting-ice font-medium">{property.name}</p>
                    <p className="text-ranting-muted text-xs mt-1 line-clamp-2">
                      {property.address}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-ranting-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{property.year_built || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{property.unit_count || 0} units</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Property Details */}
        <div className="glass-panel-strong p-6 rounded-lg">
          {selectedProperty ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-ranting-ice font-semibold text-lg">{selectedProperty.name}</h3>
                <div className="flex gap-2">
                  <button className="glossy-btn-ghost p-2 rounded-full">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProperty(selectedProperty.id)}
                    className="glossy-btn-ghost p-2 rounded-full text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-ranting-sky mt-1" />
                  <div>
                    <p className="text-ranting-muted text-xs">Address</p>
                    <p className="text-ranting-ice text-sm">{selectedProperty.address}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Year Built</p>
                    <p className="text-ranting-ice font-medium">
                      {selectedProperty.year_built || "N/A"}
                    </p>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Type</p>
                    <p className="text-ranting-ice text-sm capitalize">
                      {selectedProperty.property_type?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Units</p>
                    <p className="text-ranting-ice font-medium">
                      {selectedProperty.unit_count || 0}
                    </p>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Manager ID</p>
                    <p className="text-ranting-ice font-mono text-sm">
                      {selectedProperty.manager_id || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-ranting-muted">
              <Building2 className="w-12 h-12 mb-3 opacity-50" />
              <p>Select a property to view details</p>
            </div>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel-strong p-6 rounded-lg w-full max-w-md">
            <h3 className="text-ranting-ice text-lg font-semibold mb-4">Add New Property</h3>
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <label className="text-ranting-muted text-xs mb-1 block">Name</label>
                <input
                  type="text"
                  required
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  className="aero-input w-full px-3 py-2"
                  placeholder="Property name"
                />
              </div>
              <div>
                <label className="text-ranting-muted text-xs mb-1 block">Address</label>
                <input
                  type="text"
                  required
                  value={newProperty.address}
                  onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                  className="aero-input w-full px-3 py-2"
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-ranting-muted text-xs mb-1 block">Year Built</label>
                  <input
                    type="number"
                    required
                    min="1800"
                    max={new Date().getFullYear() + 10}
                    value={newProperty.year_built}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, year_built: parseInt(e.target.value) })
                    }
                    className="aero-input w-full px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-ranting-muted text-xs mb-1 block">Units</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProperty.unit_count}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, unit_count: parseInt(e.target.value) })
                    }
                    className="aero-input w-full px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="text-ranting-muted text-xs mb-1 block">Property Type</label>
                <select
                  required
                  value={newProperty.property_type}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, property_type: e.target.value })
                  }
                  className="aero-input w-full px-3 py-2"
                >
                  <option value="apartment_building">Apartment Building</option>
                  <option value="condominium">Condominium</option>
                  <option value="single_family_home">Single Family Home</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed_use">Mixed Use</option>
                  <option value="industrial">Industrial</option>
                  <option value="retail">Retail</option>
                  <option value="office">Office</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="glossy-btn-ghost flex-1 px-4 py-2 rounded-full"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glossy-btn flex-1 px-4 py-2 rounded-full"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
