import { useState } from 'react'
import { User, Mail, Phone, Building2, Edit, Save, X } from 'lucide-react'

interface ManagerProfileProps {
  managerId: string
  className?: string
}

export function ManagerProfile({ managerId, className = '' }: ManagerProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    id: managerId,
    name: 'John Management',
    email: 'john@management.com',
    phone: '+1-555-2222',
    managedProperties: ['property_001', 'property_002', 'property_003'],
    department: 'Property Management',
    startDate: '2022-01-15'
  })

  const handleSave = () => {
    // TODO: Wire to backend PATCH /managers/{manager_id}
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset to original values
  }

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-ranting-ice text-xl font-semibold flex items-center gap-2">
          <User className="w-6 h-6 text-ranting-sky" />
          Manager Profile
        </h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="glossy-btn-ghost flex items-center gap-2 px-4 py-2 rounded-full"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="glossy-btn-ghost flex items-center gap-2 px-4 py-2 rounded-full"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="glossy-btn flex items-center gap-2 px-4 py-2 rounded-full"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Avatar Section */}
        <div className="flex items-center gap-4 p-4 glass-panel-strong rounded-lg">
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-ranting-sky to-ranting-accent flex items-center justify-center text-ranting-navy text-2xl font-bold">
            {profile.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="text-ranting-ice font-semibold text-lg">{profile.name}</p>
            <p className="text-ranting-muted text-sm">{profile.department}</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-ranting-sky" />
            <div className="flex-1">
              <p className="text-ranting-muted text-xs">Email</p>
              {isEditing ? (
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="aero-input w-full px-3 py-1 text-sm"
                />
              ) : (
                <p className="text-ranting-ice text-sm">{profile.email}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-ranting-sky" />
            <div className="flex-1">
              <p className="text-ranting-muted text-xs">Phone</p>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="aero-input w-full px-3 py-1 text-sm"
                />
              ) : (
                <p className="text-ranting-ice text-sm">{profile.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Managed Properties */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-ranting-sky" />
            <p className="text-ranting-muted text-xs">Managed Properties</p>
          </div>
          <div className="space-y-2">
            {profile.managedProperties.map(propertyId => (
              <div key={propertyId} className="glass-panel p-3 rounded-lg">
                <p className="text-ranting-ice text-sm font-mono">{propertyId}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-3 rounded-lg">
            <p className="text-ranting-muted text-xs mb-1">Department</p>
            <p className="text-ranting-ice text-sm">{profile.department}</p>
          </div>
          <div className="glass-panel p-3 rounded-lg">
            <p className="text-ranting-muted text-xs mb-1">Start Date</p>
            <p className="text-ranting-ice text-sm">{profile.startDate}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
