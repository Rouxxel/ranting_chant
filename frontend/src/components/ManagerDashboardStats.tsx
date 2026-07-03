import { Building2, Users, AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getProperties, getTenants, getRequests } from '../services/api'

interface ManagerDashboardStatsProps {
  managerId: string
  propertyIds?: string[]
  className?: string
}

export function ManagerDashboardStats({ managerId, propertyIds = [], className = '' }: ManagerDashboardStatsProps) {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalTenants: 0,
    activeRequests: 0,
    escalatedRequests: 0,
    resolvedThisWeek: 0,
    avgResponseTime: '0 hours'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all data
        const [properties, tenants, requests] = await Promise.all([
          getProperties(),
          getTenants(),
          getRequests()
        ])

        // Filter properties by manager (if propertyIds provided)
        const managerProperties = propertyIds.length > 0
          ? properties.filter(p => propertyIds.includes(p.id))
          : properties

        // Get property IDs for filtering
        const managedPropertyIds = managerProperties.map(p => p.id)

        // Filter tenants by managed properties
        const managedTenants = tenants.filter(t =>
          t.property_id && managedPropertyIds.includes(t.property_id)
        )

        // Filter requests by managed properties
        const managedRequests = requests.filter(r =>
          r.property_id && managedPropertyIds.includes(r.property_id)
        )

        // Calculate stats
        const activeRequests = managedRequests.filter(r =>
          r.status === 'pending' || r.status === 'in_progress'
        ).length

        const escalatedRequests = managedRequests.filter(r => r.escalated).length

        // Calculate resolved this week (last 7 days)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const resolvedThisWeek = managedRequests.filter(r =>
          r.status === 'resolved' &&
          r.resolved_at &&
          new Date(r.resolved_at) >= oneWeekAgo
        ).length

        // Calculate average response time (simplified)
        const resolvedRequests = managedRequests.filter(r => r.status === 'resolved' && r.created_at && r.resolved_at)
        let avgResponseTime = '0 hours'
        if (resolvedRequests.length > 0) {
          const totalHours = resolvedRequests.reduce((sum, r) => {
            const created = new Date(r.created_at).getTime()
            const resolved = new Date(r.resolved_at!).getTime()
            return sum + (resolved - created) / (1000 * 60 * 60)
          }, 0)
          const avgHours = totalHours / resolvedRequests.length
          avgResponseTime = avgHours < 1
            ? `${Math.round(avgHours * 60)} min`
            : `${avgHours.toFixed(1)} hours`
        }

        setStats({
          totalProperties: managerProperties.length,
          totalTenants: managedTenants.length,
          activeRequests,
          escalatedRequests,
          resolvedThisWeek,
          avgResponseTime
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [managerId, propertyIds])

  const statCards = [
    {
      label: 'Properties',
      value: stats.totalProperties,
      icon: Building2,
      color: 'blue',
      trend: '+0 this month'
    },
    {
      label: 'Tenants',
      value: stats.totalTenants,
      icon: Users,
      color: 'green',
      trend: '+2 this month'
    },
    {
      label: 'Active Requests',
      value: stats.activeRequests,
      icon: AlertTriangle,
      color: 'yellow',
      trend: '3 need attention'
    },
    {
      label: 'Escalated',
      value: stats.escalatedRequests,
      icon: TrendingUp,
      color: 'red',
      trend: 'Urgent'
    },
    {
      label: 'Resolved This Week',
      value: stats.resolvedThisWeek,
      icon: CheckCircle,
      color: 'purple',
      trend: '+15% vs last week'
    },
    {
      label: 'Avg Response Time',
      value: stats.avgResponseTime,
      icon: Clock,
      color: 'cyan',
      trend: '-30 min improvement'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-400/50',
      green: 'bg-green-500/20 text-green-400 border-green-400/50',
      yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/50',
      red: 'bg-red-500/20 text-red-400 border-red-400/50',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-400/50',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="glass-panel p-4 rounded-lg border border-ranting-deep/30">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-full border ${getColorClasses(stat.color)}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-ranting-muted text-xs mb-1">{stat.label}</p>
            <p className="text-ranting-ice text-2xl font-bold">{stat.value}</p>
            <p className="text-ranting-muted text-xs mt-1">{stat.trend}</p>
          </div>
        )
      })}
    </div>
  )
}
