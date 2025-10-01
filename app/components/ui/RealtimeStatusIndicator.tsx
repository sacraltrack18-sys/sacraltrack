"use client";

import React, { useState } from "react";
import { useRealtimeStatus } from "@/app/hooks/useRealtimeStatus";

interface RealtimeStatusIndicatorProps {
  variant?: "minimal" | "detailed" | "badge";
  position?: "fixed" | "relative";
  showStats?: boolean;
  showHealthScore?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
  className?: string;
}

const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  variant = "minimal",
  position = "relative",
  showStats = false,
  showHealthScore = false,
  onConnectionChange,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    isConnected,
    isConnecting,
    reconnectAttempts,
    connectionStats,
    healthScore,
    lastError,
    forceReconnect,
    resetMonitor,
  } = useRealtimeStatus({
    enableLogging: false,
    autoReconnect: true,
  });

  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (reconnectAttempts > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (isConnected) return "Connected";
    if (reconnectAttempts > 0) return `Reconnecting (${reconnectAttempts})`;
    return "Disconnected";
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTime = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${className}`}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span>{getStatusText()}</span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div
        className={`${position === "fixed" ? "fixed top-4 right-4 z-50" : ""} ${className}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="relative">
          {/* Status dot */}
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor()} cursor-pointer transition-all duration-200 hover:scale-110`}
          >
            {reconnectAttempts > 0 && (
              <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75" />
            )}
          </div>

          {/* Expanded info */}
          {isExpanded && (
            <div className="absolute top-6 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-10">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Realtime Status</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                  <span className="text-sm">{getStatusText()}</span>
                </div>

                {showHealthScore && (
                  <div className="text-xs">
                    <span className="text-gray-600">Health: </span>
                    <span className={getHealthColor(healthScore)}>
                      {healthScore}%
                    </span>
                  </div>
                )}

                {!isConnected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      forceReconnect();
                    }}
                    className="w-full px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}>
            {reconnectAttempts > 0 && (
              <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75" />
            )}
          </div>
          <h3 className="font-semibold text-lg">Realtime Connection</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={forceReconnect}
            disabled={isConnected}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm rounded transition-colors"
          >
            Reconnect
          </button>
          <button
            onClick={resetMonitor}
            className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </label>
          <p className="text-lg font-semibold">{getStatusText()}</p>
        </div>
      </div>

      {/* Health Score */}
      {showHealthScore && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Connection Health
          </label>
          <div className="flex items-center gap-4">
            <div
              className={`text-2xl font-bold ${getHealthColor(healthScore)}`}
            >
              {healthScore}%
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    healthScore >= 90
                      ? "bg-green-500"
                      : healthScore >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Connections
            </label>
            <p className="text-lg font-semibold text-green-600">
              {connectionStats.totalConnections}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Disconnections
            </label>
            <p className="text-lg font-semibold text-red-600">
              {connectionStats.totalDisconnections}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Retry Attempts
            </label>
            <p className="text-lg font-semibold text-yellow-600">
              {reconnectAttempts}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Avg Connection Time
            </label>
            <p className="text-lg font-semibold">
              {formatDuration(connectionStats.averageConnectionTime)}
            </p>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Connected
          </label>
          <p className="text-sm text-gray-600">
            {formatTime(new Date(connectionStats.lastConnectionTime))}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Disconnected
          </label>
          <p className="text-sm text-gray-600">
            {formatTime(new Date(connectionStats.lastDisconnectionTime))}
          </p>
        </div>
      </div>

      {/* Recent Errors */}
      {lastError && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Last Error
          </label>
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {lastError}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatusIndicator;
