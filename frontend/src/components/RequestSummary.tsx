import { useState, useEffect } from 'react'
import { FileText, Clock, AlertTriangle, CheckCircle, User, Building2 } from 'lucide-react'
import { getRequestTypeLabel } from '../types'
import { getRequestSummary } from '../services/api'
import type { RequestSummary as RequestSummaryType } from '../types'

interface RequestSummaryProps {
  requestId: string
  className?: string
}

export function RequestSummary({ requestId, className = '' }: RequestSummaryProps) {
  const [summary, setSummary] = useState<RequestSummaryType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getRequestSummary(requestId)
        setSummary(data)
      } catch (error) {
        console.error('Failed to fetch request summary:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummary()
  }, [requestId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className={`glass-panel p-6 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-ranting-sky" />
        <h2 className="text-ranting-ice text-xl font-semibold">Request Summary</h2>
      </div>

      {isLoading ? (
        <div className="text-center text-ranting-muted py-8">Loading summary...</div>
      ) : !summary ? (
        <div className="text-center text-ranting-muted py-8">No summary available</div>
      ) : (
        <>
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-panel-strong p-4 rounded-lg">
              <p className="text-ranting-muted text-xs mb-1">Request ID</p>
              <p className="text-ranting-ice font-mono text-sm">{summary.id}</p>
            </div>
            <div className="glass-panel-strong p-4 rounded-lg">
              <p className="text-ranting-muted text-xs mb-1">Type</p>
              <p className="text-ranting-ice text-sm">{getRequestTypeLabel(summary.type)}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-ranting-muted text-xs mb-2">Description</p>
            <p className="text-ranting-ice text-sm">{summary.description}</p>
          </div>

          {/* Status & Urgency */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 glass-panel-strong p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-ranting-sky" />
                <p className="text-ranting-muted text-xs">Status</p>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium glow-${summary.status}`}>
                {summary.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex-1 glass-panel-strong p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-ranting-sky" />
                <p className="text-ranting-muted text-xs">Urgency</p>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium urg-${summary.urgency}`}>
                {summary.urgency}
              </span>
            </div>
          </div>

          {/* People */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 glass-panel-strong rounded-lg">
              <User className="w-4 h-4 text-ranting-sky" />
              <div className="flex-1">
                <p className="text-ranting-muted text-xs">Tenant</p>
                <p className="text-ranting-ice text-sm">{summary.tenant.name} (Unit {summary.tenant.unit})</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 glass-panel-strong rounded-lg">
              <Building2 className="w-4 h-4 text-ranting-sky" />
              <div className="flex-1">
                <p className="text-ranting-muted text-xs">Property</p>
                <p className="text-ranting-ice text-sm">{summary.property.name}</p>
              </div>
            </div>
            {summary.assigned_vendor && (
              <div className="flex items-center gap-3 p-3 glass-panel-strong rounded-lg">
                <CheckCircle className="w-4 h-4 text-ranting-sky" />
                <div className="flex-1">
                  <p className="text-ranting-muted text-xs">Assigned Vendor</p>
                  <p className="text-ranting-ice text-sm">{summary.assigned_vendor.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-panel-strong p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-ranting-sky">{summary.conversation_count || 0}</p>
              <p className="text-ranting-muted text-xs">Messages</p>
            </div>
            <div className="glass-panel-strong p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-ranting-sky">{summary.notification_count || 0}</p>
              <p className="text-ranting-muted text-xs">Notifications</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ranting-muted">Created</span>
              <span className="text-ranting-ice">{formatDate(summary.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ranting-muted">Last Updated</span>
              <span className="text-ranting-ice">{formatDate(summary.updated_at)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
