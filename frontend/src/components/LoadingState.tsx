import { Skeleton } from '@/components/ui/skeleton'

interface LoadingStateProps {
  type?: 'card' | 'list' | 'table' | 'detail'
  count?: number
  className?: string
}

export function LoadingState({ type = 'card', count = 3, className = '' }: LoadingStateProps) {
  const renderCardSkeleton = () => (
    <div className="glass-panel p-6 rounded-lg">
      <Skeleton className="h-6 w-3/4 mb-4 bg-ranting-deep/30" />
      <Skeleton className="h-4 w-1/2 mb-2 bg-ranting-deep/30" />
      <Skeleton className="h-4 w-full mb-4 bg-ranting-deep/30" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 bg-ranting-deep/30" />
        <Skeleton className="h-8 w-24 bg-ranting-deep/30" />
      </div>
    </div>
  )

  const renderListSkeleton = () => (
    <div className="flex items-center gap-4 p-4 glass-panel rounded-lg">
      <Skeleton className="w-12 h-12 rounded-full bg-ranting-deep/30" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-ranting-deep/30" />
        <Skeleton className="h-3 w-1/2 bg-ranting-deep/30" />
      </div>
      <Skeleton className="h-8 w-20 bg-ranting-deep/30" />
    </div>
  )

  const renderTableSkeleton = () => (
    <div className="glass-panel p-4 rounded-lg">
      <div className="space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 w-24 bg-ranting-deep/30" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 w-24 bg-ranting-deep/30" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 flex-1 bg-ranting-deep/30" />
          <Skeleton className="h-10 w-24 bg-ranting-deep/30" />
        </div>
      </div>
    </div>
  )

  const renderDetailSkeleton = () => (
    <div className="glass-panel p-6 rounded-lg space-y-4">
      <Skeleton className="h-8 w-1/2 bg-ranting-deep/30" />
      <Skeleton className="h-4 w-full bg-ranting-deep/30" />
      <Skeleton className="h-4 w-3/4 bg-ranting-deep/30" />
      <div className="grid grid-cols-2 gap-4 pt-4">
        <Skeleton className="h-20 bg-ranting-deep/30" />
        <Skeleton className="h-20 bg-ranting-deep/30" />
      </div>
    </div>
  )

  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {type === 'card' && renderCardSkeleton()}
          {type === 'list' && renderListSkeleton()}
          {type === 'table' && renderTableSkeleton()}
          {type === 'detail' && renderDetailSkeleton()}
        </div>
      ))}
    </div>
  )
}
