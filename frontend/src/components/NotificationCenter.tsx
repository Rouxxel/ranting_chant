import { useState } from 'react'
import { Bell, X, Mail, MessageSquare, Check } from 'lucide-react'

interface Notification {
  id: string
  type: 'email' | 'sms'
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'email',
      title: 'Request Escalated',
      message: 'Your maintenance request has been escalated to emergency status.',
      timestamp: '2024-01-15T10:30:00Z',
      read: false
    },
    {
      id: '2',
      type: 'sms',
      title: 'Vendor Assigned',
      message: 'QuickFix Locksmith has been assigned to your request.',
      timestamp: '2024-01-15T09:15:00Z',
      read: false
    },
    {
      id: '3',
      type: 'email',
      title: 'Request Resolved',
      message: 'Your plumbing issue has been marked as resolved.',
      timestamp: '2024-01-14T16:45:00Z',
      read: true
    }
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glossy-btn-ghost relative flex items-center justify-center w-10 h-10 rounded-full"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 glass-panel-strong rounded-lg shadow-2xl z-50">
          <div className="p-4 border-b border-ranting-deep/30">
            <div className="flex items-center justify-between">
              <h3 className="text-ranting-ice font-semibold">Notifications</h3>
              <button
                onClick={markAllAsRead}
                className="text-ranting-sky text-sm hover:underline"
              >
                Mark all as read
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ranting-muted">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-ranting-deep/20 hover:bg-ranting-deep/10 transition-colors ${
                    !notification.read ? 'bg-ranting-sky/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      notification.type === 'email' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {notification.type === 'email' ? (
                        <Mail className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ranting-ice font-medium text-sm">{notification.title}</p>
                      <p className="text-ranting-muted text-sm mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-ranting-muted text-xs mt-2">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="shrink-0 text-ranting-muted hover:text-ranting-sky"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
