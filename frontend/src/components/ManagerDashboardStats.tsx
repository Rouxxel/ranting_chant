import { Building2, Users, AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react'

interface ManagerDashboardStatsProps {
  managerId: string
  className?: string
}

export function ManagerDashboardStats({ managerId, className = '' }: ManagerDashboardStatsProps) {
  // TODO: Wire to backend API for real stats
  const stats = {
    totalProperties: 3,
    totalTenants: 8,
    activeRequests: 5,
    escalatedRequests: 2,
    resolvedThisWeek: 12,
    avgResponseTime: '2.5 hours'
  }

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
