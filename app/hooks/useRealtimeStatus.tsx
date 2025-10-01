"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { client } from "@/libs/AppWriteClient";

interface RealtimeStatusOptions {
  enableLogging?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface ConnectionStats {
  totalConnections: number;
  totalDisconnections: number;
  totalReconnects: number;
  averageConnectionTime: number;
  lastConnectionTime: number;
  lastDisconnectionTime: number;
}

interface UseRealtimeStatusReturn {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  connectionStats: ConnectionStats;
  healthScore: number;
  lastError: string | null;
  forceReconnect: () => void;
  resetMonitor: () => void;
}

export const useRealtimeStatus = (
  options: RealtimeStatusOptions = {}
): UseRealtimeStatusReturn => {
  const {
    enableLogging = false,
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    totalConnections: 0,
    totalDisconnections: 0,
    totalReconnects: 0,
    averageConnectionTime: 0,
    lastConnectionTime: 0,
    lastDisconnectionTime: 0,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const log = useCallback(
    (message: string, type: "info" | "error" | "warn" = "info") => {
      if (enableLogging) {
        console[type](`[REALTIME] ${message}`);
      }
    },
    [enableLogging]
  );

  const calculateHealthScore = useCallback(() => {
    const { totalConnections, totalDisconnections, totalReconnects } =
      connectionStats;
    if (totalConnections === 0) return 100;

    const disconnectionRate = totalDisconnections / totalConnections;
    const reconnectRate = totalReconnects / Math.max(totalDisconnections, 1);

    // Health score: 100 - (disconnection rate * 50) + (reconnect rate * 20)
    const score = Math.max(
      0,
      Math.min(100, 100 - disconnectionRate * 50 + reconnectRate * 20)
    );

    return Math.round(score);
  }, [connectionStats]);

  const updateConnectionStats = useCallback(
    (type: "connect" | "disconnect" | "reconnect") => {
      const now = Date.now();

      setConnectionStats((prev) => {
        const newStats = { ...prev };

        switch (type) {
          case "connect":
            newStats.totalConnections += 1;
            newStats.lastConnectionTime = now;
            connectionStartTimeRef.current = now;
            break;

          case "disconnect":
            newStats.totalDisconnections += 1;
            newStats.lastDisconnectionTime = now;

            if (connectionStartTimeRef.current > 0) {
              const connectionDuration = now - connectionStartTimeRef.current;
              newStats.averageConnectionTime =
                (newStats.averageConnectionTime * (newStats.totalConnections - 1) +
                  connectionDuration) /
                newStats.totalConnections;
            }
            break;

          case "reconnect":
            newStats.totalReconnects += 1;
            break;
        }

        return newStats;
      });
    },
    []
  );

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      log(
        `Max reconnection attempts (${maxReconnectAttempts}) reached`,
        "error"
      );
      setLastError("Maximum reconnection attempts reached");
      return;
    }

    log(`Attempting to reconnect (attempt ${reconnectAttempts + 1})`);
    setIsConnecting(true);
    setReconnectAttempts((prev) => prev + 1);

    reconnectTimeoutRef.current = setTimeout(() => {
      try {
        // Force a new subscription to trigger reconnection
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        setupRealtimeConnection();
        updateConnectionStats("reconnect");
      } catch (error) {
        log(`Reconnection failed: ${error}`, "error");
        setLastError(`Reconnection failed: ${error}`);
        if (autoReconnect) {
          attemptReconnect();
        }
      } finally {
        setIsConnecting(false);
      }
    }, reconnectDelay * Math.pow(2, reconnectAttempts)); // Exponential backoff
  }, [
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectDelay,
    autoReconnect,
    log,
    updateConnectionStats,
  ]);

  const setupRealtimeConnection = useCallback(() => {
    try {
      // Subscribe to a simple realtime channel to monitor connection
      const unsubscribe = client.subscribe("heartbeat", (response: any) => {
        if (!isConnected) {
          log("Realtime connection established");
          setIsConnected(true);
          setIsConnecting(false);
          setReconnectAttempts(0);
          setLastError(null);
          updateConnectionStats("connect");
        }
      });

      unsubscribeRef.current = unsubscribe;

      // Set up heartbeat to detect disconnections
      const setupHeartbeat = () => {
        heartbeatTimeoutRef.current = setTimeout(() => {
          if (isConnected) {
            log("Heartbeat timeout - connection lost", "warn");
            handleDisconnection();
          }
          setupHeartbeat();
        }, heartbeatInterval);
      };

      setupHeartbeat();

      // Test the connection immediately
      setTimeout(() => {
        if (!isConnected) {
          setIsConnected(true);
          updateConnectionStats("connect");
        }
      }, 1000);
    } catch (error) {
      log(`Failed to setup realtime connection: ${error}`, "error");
      setLastError(`Connection setup failed: ${error}`);
      setIsConnecting(false);
      if (autoReconnect) {
        attemptReconnect();
      }
    }
  }, [
    isConnected,
    log,
    updateConnectionStats,
    heartbeatInterval,
    autoReconnect,
    attemptReconnect,
  ]);

  const handleDisconnection = useCallback(() => {
    if (isConnected) {
      log("Realtime connection lost");
      setIsConnected(false);
      updateConnectionStats("disconnect");

      if (autoReconnect) {
        attemptReconnect();
      }
    }
  }, [isConnected, log, updateConnectionStats, autoReconnect, attemptReconnect]);

  const forceReconnect = useCallback(() => {
    log("Forcing reconnection");
    setReconnectAttempts(0);
    setLastError(null);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    setIsConnected(false);
    setIsConnecting(true);
    setupRealtimeConnection();
  }, [log, setupRealtimeConnection]);

  const resetMonitor = useCallback(() => {
    log("Resetting realtime monitor");
    setConnectionStats({
      totalConnections: 0,
      totalDisconnections: 0,
      totalReconnects: 0,
      averageConnectionTime: 0,
      lastConnectionTime: 0,
      lastDisconnectionTime: 0,
    });
    setReconnectAttempts(0);
    setLastError(null);
  }, [log]);

  // Initialize realtime connection
  useEffect(() => {
    log("Initializing realtime connection");
    setupRealtimeConnection();

    // Listen for browser online/offline events
    const handleOnline = () => {
      log("Browser came online");
      if (!isConnected && autoReconnect) {
        forceReconnect();
      }
    };

    const handleOffline = () => {
      log("Browser went offline");
      handleDisconnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update health score when connection stats change
  const healthScore = calculateHealthScore();

  return {
    isConnected,
    isConnecting,
    reconnectAttempts,
    connectionStats,
    healthScore,
    lastError,
    forceReconnect,
    resetMonitor,
  };
};
