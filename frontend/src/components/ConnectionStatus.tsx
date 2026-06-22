import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface ConnectionStatusProps {
  className?: string
}

export function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    // Monitor connection state and update accordingly
    const checkConnection = () => {
      // Mock connection check
      setIsConnected(true)
    }

    const interval = setInterval(checkConnection, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleReconnect = () => {
    setIsReconnecting(true)
    // TODO: Trigger reconnection logic
    setTimeout(() => {
      setIsReconnecting(false)
      setIsConnected(true)
    }, 2000)
  }

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 text-ranting-muted text-xs ${className}`}>
        <Wifi className="w-4 h-4 text-green-400" />
        <span>Connected</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <WifiOff className="w-4 h-4 text-red-400" />
      <span className="text-red-400 text-xs">Disconnected</span>
      <button
        onClick={handleReconnect}
        disabled={isReconnecting}
        className="flex items-center gap-1 text-ranting-sky text-xs hover:underline disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
        Reconnect
      </button>
    </div>
  )
}
