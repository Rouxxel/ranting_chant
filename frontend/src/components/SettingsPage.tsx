import { useState } from 'react'
import { Settings, User, Bell, Palette, Shield, Save, ChevronRight } from 'lucide-react'

interface SettingsPageProps {
  className?: string
}

export function SettingsPage({ className = '' }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState('profile')

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-ranting-sky" />
        <h2 className="text-ranting-ice text-xl font-semibold">Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <div className="glass-panel-strong p-4 rounded-lg">
            <nav className="space-y-1">
              {sections.map(section => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-ranting-sky/20 text-ranting-ice'
                        : 'text-ranting-muted hover:bg-ranting-deep/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{section.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && <ProfileSettings />}
          {activeSection === 'notifications' && <NotificationSettings />}
          {activeSection === 'appearance' && <AppearanceSettings />}
          {activeSection === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings() {
  return (
    <div className="glass-panel-strong p-6 rounded-lg">
      <h3 className="text-ranting-ice text-lg font-semibold mb-6">Profile Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Full Name</label>
          <input
            type="text"
            defaultValue="John Doe"
            className="aero-input w-full px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Email</label>
          <input
            type="email"
            defaultValue="john@example.com"
            className="aero-input w-full px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Phone</label>
          <input
            type="tel"
            defaultValue="+1-555-1234"
            className="aero-input w-full px-4 py-2"
          />
        </div>
        <div className="pt-4 border-t border-ranting-deep/30">
          <button className="glossy-btn flex items-center gap-2 px-6 py-2 rounded-full">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="glass-panel-strong p-6 rounded-lg">
      <h3 className="text-ranting-ice text-lg font-semibold mb-6">Notification Settings</h3>
      <p className="text-ranting-muted text-sm mb-4">
        TODO: Integrate NotificationPreferences component here
      </p>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 glass-panel rounded-lg">
          <div>
            <p className="text-ranting-ice text-sm font-medium">Email Notifications</p>
            <p className="text-ranting-muted text-xs">Receive updates via email</p>
          </div>
          <button className="glossy-btn-ghost p-2 rounded-full">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 glass-panel rounded-lg">
          <div>
            <p className="text-ranting-ice text-sm font-medium">SMS Notifications</p>
            <p className="text-ranting-muted text-xs">Receive urgent updates via SMS</p>
          </div>
          <button className="glossy-btn-ghost p-2 rounded-full">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 glass-panel rounded-lg">
          <div>
            <p className="text-ranting-ice text-sm font-medium">Push Notifications</p>
            <p className="text-ranting-muted text-xs">Browser push notifications</p>
          </div>
          <button className="glossy-btn-ghost p-2 rounded-full">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  return (
    <div className="glass-panel-strong p-6 rounded-lg">
      <h3 className="text-ranting-ice text-lg font-semibold mb-6">Appearance Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Theme</label>
          <select className="aero-input w-full px-4 py-2">
            <option>Frutiger Aero (Default)</option>
            <option>Dark Mode</option>
            <option>Light Mode</option>
          </select>
        </div>
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Language</label>
          <select className="aero-input w-full px-4 py-2">
            <option>English</option>
            <option>German</option>
            <option>Spanish</option>
          </select>
        </div>
        <div className="pt-4 border-t border-ranting-deep/30">
          <button className="glossy-btn flex items-center gap-2 px-6 py-2 rounded-full">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="glass-panel-strong p-6 rounded-lg">
      <h3 className="text-ranting-ice text-lg font-semibold mb-6">Security Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Current Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="aero-input w-full px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-ranting-muted text-xs mb-2">New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="aero-input w-full px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Confirm New Password</label>
          <input
            type="password"
            placeholder="••••••••"
            className="aero-input w-full px-4 py-2"
          />
        </div>
        <div className="pt-4 border-t border-ranting-deep/30">
          <button className="glossy-btn flex items-center gap-2 px-6 py-2 rounded-full">
            <Save className="w-4 h-4" />
            Update Password
          </button>
        </div>
      </div>
    </div>
  )
}
