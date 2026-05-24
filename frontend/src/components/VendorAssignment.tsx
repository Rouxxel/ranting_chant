import { useState } from 'react'
import { Search, Building2, Star, Clock, Phone, Mail } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  service: string
  rating: number
  emergencyAvailable: boolean
  responseTime: string
  phone: string
  email: string
}

interface VendorAssignmentProps {
  requestId: string
  serviceType?: string
  onAssign?: (vendorId: string) => void
  className?: string
}

export function VendorAssignment({ requestId, serviceType, onAssign, className = '' }: VendorAssignmentProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  // TODO: Wire to GET /vendors and GET /vendors/by-service/{service}
  const vendors: Vendor[] = [
    {
      id: 'vendor_001',
      name: 'QuickFix Locksmith',
      service: 'locksmith',
      rating: 4.8,
      emergencyAvailable: true,
      responseTime: '15-30 min',
      phone: '+1-555-4444',
      email: 'dispatch@quickfix.com'
    },
    {
      id: 'vendor_002',
      name: 'AquaFlow Plumbing',
      service: 'plumbing',
      rating: 4.6,
      emergencyAvailable: true,
      responseTime: '30-45 min',
      phone: '+1-555-5555',
      email: 'service@aquaflow.com'
    },
    {
      id: 'vendor_003',
      name: 'VoltPro Electrical',
      service: 'electrical',
      rating: 4.7,
      emergencyAvailable: true,
      responseTime: '20-40 min',
      phone: '+1-555-6666',
      email: 'emergency@voltpro.com'
    },
    {
      id: 'vendor_004',
      name: 'ArcticAir HVAC',
      service: 'hvac',
      rating: 4.5,
      emergencyAvailable: false,
      responseTime: '1-2 hours',
      phone: '+1-555-7777',
      email: 'booking@arcticair.com'
    }
  ]

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.service.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAssign = () => {
    if (selectedVendor && onAssign) {
      onAssign(selectedVendor.id)
    }
    // TODO: Wire to backend PATCH /requests/{requestId} with vendor_id
  }

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <h3 className="text-ranting-ice text-lg font-semibold mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-ranting-sky" />
        Assign Vendor
      </h3>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
        <input
          type="text"
          placeholder="Search vendors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="aero-input w-full pl-10 pr-4 py-2"
        />
      </div>

      {/* Vendor List */}
      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
        {filteredVendors.map(vendor => (
          <button
            key={vendor.id}
            onClick={() => setSelectedVendor(vendor)}
            className={`w-full text-left p-4 rounded-lg transition-colors ${
              selectedVendor?.id === vendor.id
                ? 'bg-ranting-sky/20 border border-ranting-sky/50'
                : 'bg-ranting-deep/20 hover:bg-ranting-deep/30 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-ranting-ice font-medium text-sm">{vendor.name}</p>
                  {vendor.emergencyAvailable && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      Emergency
                    </span>
                  )}
                </div>
                <p className="text-ranting-muted text-xs capitalize">{vendor.service}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-ranting-muted">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span>{vendor.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{vendor.responseTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Vendor Details */}
      {selectedVendor && (
        <div className="glass-panel-strong p-4 rounded-lg mb-4">
          <h4 className="text-ranting-ice font-medium mb-3">{selectedVendor.name}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-ranting-muted">
              <Phone className="w-4 h-4" />
              <span>{selectedVendor.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-ranting-muted">
              <Mail className="w-4 h-4" />
              <span>{selectedVendor.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* Assign Button */}
      <button
        onClick={handleAssign}
        disabled={!selectedVendor}
        className="glossy-btn w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Assign Vendor
      </button>
    </div>
  )
}
