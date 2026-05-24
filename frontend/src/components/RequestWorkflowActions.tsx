import { useState } from 'react'
import { ArrowUp, Check, AlertTriangle, UserCheck, FileCheck, XCircle } from 'lucide-react'

interface RequestWorkflowActionsProps {
  requestId: string
  currentStatus: string
  onAction?: (action: string, data?: any) => void
  className?: string
}

export function RequestWorkflowActions({ requestId, currentStatus, onAction, className = '' }: RequestWorkflowActionsProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  const handleAction = (action: string) => {
    setSelectedAction(action)
    // TODO: Wire to backend PATCH /requests/{request_id}
    if (onAction) {
      onAction(action)
    }
  }

  const actions = [
    {
      id: 'escalate',
      label: 'Escalate',
      icon: ArrowUp,
      description: 'Escalate to emergency status',
      color: 'red',
      available: ['pending', 'in_progress']
    },
    {
      id: 'approve',
      label: 'Approve',
      icon: Check,
      description: 'Approve pending request',
      color: 'green',
      available: ['pending_approval']
    },
    {
      id: 'assign_manager',
      label: 'Assign Manager',
      icon: UserCheck,
      description: 'Assign to property manager',
      color: 'blue',
      available: ['pending', 'in_progress']
    },
    {
      id: 'review',
      label: 'Review',
      icon: FileCheck,
      description: 'Mark for review',
      color: 'purple',
      available: ['resolved', 'escalated']
    },
    {
      id: 'reject',
      label: 'Reject',
      icon: XCircle,
      description: 'Reject the request',
      color: 'gray',
      available: ['pending_approval', 'pending_review']
    }
  ]

  const availableActions = actions.filter(action => action.available.includes(currentStatus))

  const getColorClasses = (color: string) => {
    const colors = {
      red: 'bg-red-500/20 text-red-400 border-red-400/50 hover:bg-red-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-400/50 hover:bg-green-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-400/50 hover:bg-blue-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-400/50 hover:bg-purple-500/30',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-400/50 hover:bg-gray-500/30'
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <h3 className="text-ranting-ice text-lg font-semibold mb-4">Workflow Actions</h3>

      {availableActions.length === 0 ? (
        <div className="text-center text-ranting-muted py-8">
          <p className="text-sm">No available actions for current status</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableActions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors ${getColorClasses(action.color)}`}
              >
                <div className="p-2 rounded-full bg-current/20">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{action.label}</p>
                  <p className="text-xs opacity-80">{action.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedAction && (
        <div className="mt-4 p-4 glass-panel-strong rounded-lg">
          <p className="text-ranting-muted text-sm mb-2">
            Action <span className="text-ranting-sky font-medium">{selectedAction}</span> selected
          </p>
          <p className="text-ranting-muted text-xs">
            TODO: Wire to backend PATCH /requests/{requestId}
          </p>
        </div>
      )}
    </div>
  )
}
