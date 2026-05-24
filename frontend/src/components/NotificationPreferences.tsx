import { useState } from 'react'
import { Mail, MessageSquare, Bell, Save } from 'lucide-react'

interface NotificationPreferencesProps {
  className?: string
}

export function NotificationPreferences({ className = '' }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState({
    email: {
      enabled: true,
      requestUpdates: true,
      escalationAlerts: true,
      resolutionNotices: true,
      vendorAssignments: true
    },
    sms: {
      enabled: false,
      emergencyOnly: true,
      requestUpdates: false,
      escalationAlerts: true
    },
    push: {
      enabled: true,
      requestUpdates: true,
      escalationAlerts: true,
      resolutionNotices: true
    }
  })

  const handleToggle = (category: keyof typeof preferences, setting: string) => {
    setPreferences(prev => {
      const categoryData = prev[category]
      return {
        ...prev,
        [category]: {
          ...categoryData,
          [setting]: !(categoryData as Record<string, boolean>)[setting]
        }
      }
    })
  }

  const handleSave = () => {
    // TODO: Wire to backend API
    console.log('Saving preferences:', preferences)
  }

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <h2 className="text-ranting-ice text-xl font-semibold mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6" />
        Notification Preferences
      </h2>

      {/* Email Notifications */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-ranting-ice font-medium">Email Notifications</h3>
              <p className="text-ranting-muted text-sm">Receive updates via email</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('email', 'enabled')}
            className={`w-12 h-6 rounded-full transition-colors ${
              preferences.email.enabled ? 'bg-ranting-accent' : 'bg-ranting-deep'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              preferences.email.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {preferences.email.enabled && (
          <div className="ml-12 space-y-3">
            {[
              { key: 'requestUpdates', label: 'Request status updates' },
              { key: 'escalationAlerts', label: 'Escalation alerts' },
              { key: 'resolutionNotices', label: 'Resolution notices' },
              { key: 'vendorAssignments', label: 'Vendor assignments' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email[key as keyof typeof preferences.email] as boolean}
                  onChange={() => handleToggle('email', key)}
                  className="w-4 h-4 rounded border-ranting-deep bg-ranting-navy text-ranting-accent focus:ring-ranting-sky"
                />
                <span className="text-ranting-muted text-sm">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/20 text-green-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-ranting-ice font-medium">SMS Notifications</h3>
              <p className="text-ranting-muted text-sm">Receive urgent updates via SMS</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('sms', 'enabled')}
            className={`w-12 h-6 rounded-full transition-colors ${
              preferences.sms.enabled ? 'bg-ranting-accent' : 'bg-ranting-deep'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              preferences.sms.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {preferences.sms.enabled && (
          <div className="ml-12 space-y-3">
            {[
              { key: 'emergencyOnly', label: 'Emergency alerts only' },
              { key: 'requestUpdates', label: 'Request status updates' },
              { key: 'escalationAlerts', label: 'Escalation alerts' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sms[key as keyof typeof preferences.sms] as boolean}
                  onChange={() => handleToggle('sms', key)}
                  className="w-4 h-4 rounded border-ranting-deep bg-ranting-navy text-ranting-accent focus:ring-ranting-sky"
                />
                <span className="text-ranting-muted text-sm">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-500/20 text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-ranting-ice font-medium">Push Notifications</h3>
              <p className="text-ranting-muted text-sm">Browser push notifications</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle('push', 'enabled')}
            className={`w-12 h-6 rounded-full transition-colors ${
              preferences.push.enabled ? 'bg-ranting-accent' : 'bg-ranting-deep'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              preferences.push.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {preferences.push.enabled && (
          <div className="ml-12 space-y-3">
            {[
              { key: 'requestUpdates', label: 'Request status updates' },
              { key: 'escalationAlerts', label: 'Escalation alerts' },
              { key: 'resolutionNotices', label: 'Resolution notices' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.push[key as keyof typeof preferences.push] as boolean}
                  onChange={() => handleToggle('push', key)}
                  className="w-4 h-4 rounded border-ranting-deep bg-ranting-navy text-ranting-accent focus:ring-ranting-sky"
                />
                <span className="text-ranting-muted text-sm">{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-ranting-deep/30">
        <button
          onClick={handleSave}
          className="glossy-btn flex items-center gap-2 px-6 py-2 rounded-full"
        >
          <Save className="w-4 h-4" />
          Save Preferences
        </button>
      </div>
    </div>
  )
}
