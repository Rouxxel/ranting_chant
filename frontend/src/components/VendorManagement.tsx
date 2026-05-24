import { useState } from 'react'
import { Building2, Star, Clock, Phone, Mail, Plus, Search, Edit, Trash2, Zap } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  email: string
  phone: string
  services: string[]
  emergencyAvailable: boolean
  rating: number
}

interface VendorManagementProps {
  className?: string
}

export function VendorManagement({ className = '' }: VendorManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // TODO: Wire to GET /vendors and GET /vendors/by-service/{service}
  const vendors: Vendor[] = [
    {
      id: 'vendor_001',
      name: 'QuickFix Locksmith',
      email: 'dispatch@quickfix.com',
      phone: '+1-555-4444',
      services: ['locksmith'],
      emergencyAvailable: true,
      rating: 4.8
    },
    {
      id: 'vendor_002',
      name: 'AquaFlow Plumbing',
      email: 'service@aquaflow.com',
      phone: '+1-555-5555',
      services: ['plumbing'],
      emergencyAvailable: true,
      rating: 4.6
    },
    {
      id: 'vendor_003',
      name: 'VoltPro Electrical',
      email: 'emergency@voltpro.com',
      phone: '+1-555-6666',
      services: ['electrical'],
      emergencyAvailable: true,
      rating: 4.7
    },
    {
      id: 'vendor_004',
      name: 'ArcticAir HVAC',
      email: 'booking@arcticair.com',
      phone: '+1-555-7777',
      services: ['hvac'],
      emergencyAvailable: false,
      rating: 4.5
    },
    {
      id: 'vendor_005',
      name: 'HandyHero Maintenance',
      email: 'contact@handyhero.com',
      phone: '+1-555-8888',
      services: ['handyman', 'general_repair'],
      emergencyAvailable: false,
      rating: 4.4
    },
    {
      id: 'vendor_006',
      name: 'RapidGlass & Door',
      email: 'urgent@rapidglass.com',
      phone: '+1-555-9999',
      services: ['glass_repair', 'door_repair', 'locksmith'],
      emergencyAvailable: true,
      rating: 4.9
    }
  ]

  const services = ['all', 'locksmith', 'plumbing', 'electrical', 'hvac', 'handyman', 'general_repair', 'glass_repair', 'door_repair']

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesService = selectedService === 'all' || vendor.services.includes(selectedService)
    return matchesSearch && matchesService
  })

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-ranting-ice text-xl font-semibold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-ranting-sky" />
          Vendors
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="glossy-btn flex items-center gap-2 px-4 py-2 rounded-full"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aero-input w-full pl-10 pr-4 py-2"
          />
        </div>
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="aero-input px-4 py-2"
        >
          {services.map(service => (
            <option key={service} value={service}>
              {service === 'all' ? 'All Services' : service.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
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
                    <p className="text-ranting-ice font-medium">{vendor.name}</p>
                    {vendor.emergencyAvailable && (
                      <Zap className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-ranting-muted text-xs">{vendor.email}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-ranting-muted">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span>{vendor.rating}</span>
                    </div>
                    <span className="capitalize">{vendor.services.join(', ')}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Vendor Details */}
        <div className="glass-panel-strong p-6 rounded-lg">
          {selectedVendor ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-ranting-ice font-semibold text-lg">{selectedVendor.name}</h3>
                  {selectedVendor.emergencyAvailable && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Emergency
                    </span>
                  )}
                </div>
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
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-ranting-sky" />
                  <div>
                    <p className="text-ranting-muted text-xs">Email</p>
                    <p className="text-ranting-ice text-sm">{selectedVendor.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-ranting-sky" />
                  <div>
                    <p className="text-ranting-muted text-xs">Phone</p>
                    <p className="text-ranting-ice text-sm">{selectedVendor.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-ranting-sky" />
                  <div>
                    <p className="text-ranting-muted text-xs">Rating</p>
                    <p className="text-ranting-ice text-sm">{selectedVendor.rating} / 5.0</p>
                  </div>
                </div>

                <div>
                  <p className="text-ranting-muted text-xs mb-2">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.services.map(service => (
                      <span
                        key={service}
                        className="text-xs px-2 py-1 rounded-full bg-ranting-accent/20 text-ranting-sky capitalize"
                      >
                        {service.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-ranting-muted">
              <Building2 className="w-12 h-12 mb-3 opacity-50" />
              <p>Select a vendor to view details</p>
            </div>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel-strong p-6 rounded-lg w-full max-w-md">
            <h3 className="text-ranting-ice text-lg font-semibold mb-4">Add New Vendor</h3>
            <p className="text-ranting-muted text-sm mb-4">
              TODO: Wire to POST /vendors endpoint
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
