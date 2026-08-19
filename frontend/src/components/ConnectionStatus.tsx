import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import apiClient from "../services/api";

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className = "" }: ConnectionStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      // Simple health check - try to reach the backend
      await apiClient.get("/auth/me", { timeout: 5000 });
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Monitor connection state periodically
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkConnection]);

  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true);
    let attempt = 0;
    const maxAttempts = 5;
    const baseDelay = 1000; // 1 second

    const attemptReconnect = async () => {
      try {
        await apiClient.get("/auth/me", { timeout: 5000 });
        setIsConnected(true);
        setIsReconnecting(false);
        return;
      } catch (error) {
        // Connection failed, continue retrying
      }

      attempt++;
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = baseDelay * Math.pow(2, attempt);
        setTimeout(attemptReconnect, delay);
      } else {
        // Max attempts reached, give up
        setIsReconnecting(false);
      }
    };

    attemptReconnect();
  }, []);

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 text-ranting-muted text-xs ${className}`}>
        <Wifi className="w-4 h-4 text-green-400" />
        <span>Connected</span>
      </div>
    );
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
        <RefreshCw className={`w-3 h-3 ${isReconnecting ? "animate-spin" : ""}`} />
        Reconnect
      </button>
    </div>
  );
}
