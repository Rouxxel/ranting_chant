import { useState } from 'react'
import { Building2, MapPin, Calendar, Users, Plus, Search, Edit, Trash2 } from 'lucide-react'

interface Property {
  id: string
  name: string
  address: string
  yearBuilt: number
  propertyType: string
  unitCount: number
  managerId: string
  tenantIds: string[]
}

interface PropertyManagementProps {
  className?: string
}

export function PropertyManagement({ className = '' }: PropertyManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // TODO: Wire to GET /properties and GET /properties/{property_id}
  const properties: Property[] = [
    {
      id: 'property_001',
      name: 'Sunset Apartments',
      address: '123 Main St, Berlin, 10115, Germany',
      yearBuilt: 1998,
      propertyType: 'apartment_building',
      unitCount: 24,
      managerId: 'manager_001',
      tenantIds: ['tenant_001', 'tenant_002', 'tenant_009']
    },
    {
      id: 'property_002',
      name: 'Riverbend Residences',
      address: '456 River Rd, Munich, 80331, Germany',
      yearBuilt: 2005,
      propertyType: 'apartment_building',
      unitCount: 32,
      managerId: 'manager_002',
      tenantIds: ['tenant_003', 'tenant_004']
    },
    {
      id: 'property_003',
      name: 'Maple Heights',
      address: '789 Maple Ave, Hamburg, 20095, Germany',
      yearBuilt: 2010,
      propertyType: 'condominium',
      unitCount: 16,
      managerId: 'manager_003',
      tenantIds: ['tenant_005']
    },
    {
      id: 'property_004',
      name: 'Willow Creek Lofts',
      address: '321 Willow Ln, Frankfurt, 60311, Germany',
      yearBuilt: 2015,
      propertyType: 'loft_building',
      unitCount: 20,
      managerId: 'manager_004',
      tenantIds: ['tenant_006', 'tenant_007', 'tenant_008']
    },
    {
      id: 'property_005',
      name: 'Poplar Gardens',
      address: '654 Poplar Dr, Cologne, 50667, Germany',
      yearBuilt: 2020,
      propertyType: 'apartment_building',
      unitCount: 28,
      managerId: 'manager_001',
      tenantIds: ['tenant_010']
    }
  ]

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          {filteredProperties.map(property => (
            <button
              key={property.id}
              onClick={() => setSelectedProperty(property)}
              className={`w-full text-left p-4 rounded-lg transition-colors ${
                selectedProperty?.id === property.id
                  ? 'bg-ranting-sky/20 border border-ranting-sky/50'
                  : 'bg-ranting-deep/20 hover:bg-ranting-deep/30 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-ranting-ice font-medium">{property.name}</p>
                  <p className="text-ranting-muted text-xs mt-1 line-clamp-2">{property.address}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-ranting-muted">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{property.yearBuilt}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{property.unitCount} units</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
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
                  <button className="glossy-btn-ghost p-2 rounded-full text-red-400">
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
                    <p className="text-ranting-ice font-medium">{selectedProperty.yearBuilt}</p>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Type</p>
                    <p className="text-ranting-ice text-sm capitalize">{selectedProperty.propertyType.replace('_', ' ')}</p>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Units</p>
                    <p className="text-ranting-ice font-medium">{selectedProperty.unitCount}</p>
                  </div>
                  <div className="glass-panel p-3 rounded-lg">
                    <p className="text-ranting-muted text-xs mb-1">Tenants</p>
                    <p className="text-ranting-ice font-medium">{selectedProperty.tenantIds.length}</p>
                  </div>
                </div>

                <div className="glass-panel p-3 rounded-lg">
                  <p className="text-ranting-muted text-xs mb-2">Manager ID</p>
                  <p className="text-ranting-ice font-mono text-sm">{selectedProperty.managerId}</p>
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
            <p className="text-ranting-muted text-sm mb-4">
              TODO: Wire to POST /properties endpoint
            </p>
            <button
              onClick={() => setIsAdding(false)}
              className="glossy-btn w-full px-4 py-2 rounded-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
