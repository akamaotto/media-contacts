/**
 * WebSocket Progress Hook
 * Manages real-time progress updates via WebSocket connection
 */

"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ProgressData,
  ProgressStageData,
  CategorizedError,
  ConnectionStatus,
  WebSocketMessage,
  UseWebSocketProgressOptions,
  CompletionMessage,
  defaultPerformanceThresholds
} from './types';

// WebSocket URL configuration
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined' ?
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ai/search/ws` :
    'ws://localhost:3000/api/ai/search/ws');

export function useWebSocketProgress(options: UseWebSocketProgressOptions) {
  const {
    searchId,
    autoReconnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onProgressUpdate,
    onStageUpdate,
    onError,
    onComplete,
    onConnectionChange
  } = options;

  // WebSocket connection management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [stages, setStages] = useState<Map<string, ProgressStageData>>(new Map());
  const [error, setError] = useState<CategorizedError | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // Refs for connection management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const isManualCloseRef = useRef(false);

  // Connection status management
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onConnectionChange?.(status);
  }, [onConnectionChange]);

  // Message queue processing
  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (message && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    }
  }, []);

  // WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      updateConnectionStatus('connecting');
      wsRef.current = new WebSocket(`${WS_URL}?searchId=${searchId}`);

      wsRef.current.onopen = () => {
        console.log(`WebSocket connected for search ${searchId}`);
        updateConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        startHeartbeat();

        // Process any queued messages
        processMessageQueue();

        // Request initial progress
        sendMessage({
          type: 'get_progress',
          searchId,
          timestamp: new Date()
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket disconnected for search ${searchId}, code: ${event.code}`);
        updateConnectionStatus('disconnected');
        stopHeartbeat();

        // Attempt reconnection if not manual close and auto-reconnect is enabled
        if (!isManualCloseRef.current && autoReconnect &&
            reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      wsRef.current.onerror = (event) => {
        console.error(`WebSocket error for search ${searchId}:`, event);
        updateConnectionStatus('error');

        // Create a generic error for UI display
        const connectionError: CategorizedError = {
          category: 'network',
          severity: 'medium',
          title: 'Connection Error',
          message: 'Lost connection to the search service. Attempting to reconnect...',
          timestamp: new Date(),
          retryable: true,
          actions: [
            {
              type: 'retry',
              label: 'Reconnect',
              action: () => connect(),
              primary: true
            }
          ]
        };

        setError(connectionError);
        onError?.(connectionError);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      updateConnectionStatus('error');
    }
  }, [searchId, autoReconnect, maxReconnectAttempts, updateConnectionStatus, onError]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    const startTime = performance.now();

    switch (message.type) {
      case 'progress_update':
        if (message.progress) {
          const updatedProgress: ProgressData = {
            ...message.progress as ProgressData,
            lastUpdate: message.timestamp
          };
          setProgress(updatedProgress);
          onProgressUpdate?.(updatedProgress);
        }
        break;

      case 'stage_update':
        if (message.stage) {
          setStages(prev => {
            const updated = new Map(prev);
            const existingStage = updated.get(message.stageId);
            const updatedStage: ProgressStageData = {
              ...existingStage,
              ...message.stage as ProgressStageData
            };
            updated.set(message.stageId, updatedStage);
            return updated;
          });

          // Get the updated stage for callback
          const updatedStage = stages.get(message.stageId);
          if (updatedStage) {
            onStageUpdate?.(updatedStage);
          }
        }
        break;

      case 'error':
        setError(message.error);
        onError?.(message.error);
        break;

      case 'completion':
        setIsCompleted(true);
        onComplete?.(message.results);
        updateConnectionStatus('disconnected');

        // Close connection after completion
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          isManualCloseRef.current = true;
          wsRef.current.close();
        }
        break;

      default:
        console.warn('Unknown WebSocket message type:', (message as any).type);
    }

    // Performance monitoring
    const processingTime = performance.now() - startTime;
    if (processingTime > defaultPerformanceThresholds.maxUpdateTime) {
      console.warn(`WebSocket message processing took ${processingTime.toFixed(2)}ms, exceeding threshold of ${defaultPerformanceThresholds.maxUpdateTime}ms`);
    }
  }, [onProgressUpdate, onStageUpdate, onError, onComplete, stages, updateConnectionStatus]);

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message);
    }
  }, []);

  // Heartbeat management
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      sendMessage({
        type: 'heartbeat',
        searchId,
        timestamp: new Date()
      });
    }, heartbeatInterval);
  }, [searchId, heartbeatInterval, sendMessage]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Reconnection management
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    reconnectAttemptsRef.current++;
    updateConnectionStatus('reconnecting');

    // Exponential backoff with jitter
    const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1) +
                   Math.random() * 1000;

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      connect();
    }, delay);
  }, [reconnectInterval, maxReconnectAttempts, updateConnectionStatus, connect]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    isManualCloseRef.current = false;
    connect();
  }, [connect]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    stopHeartbeat();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    updateConnectionStatus('disconnected');
  }, [updateConnectionStatus]);

  // Cancel search
  const cancelSearch = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/search/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel search');
      }

      disconnect();
    } catch (error) {
      console.error('Failed to cancel search:', error);
      throw error;
    }
  }, [searchId, disconnect]);

  // Retry search
  const retrySearch = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/search/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchId }),
      });

      if (!response.ok) {
        throw new Error('Failed to retry search');
      }

      // Clear error state and reconnect
      setError(null);
      isManualCloseRef.current = false;
      connect();
    } catch (error) {
      console.error('Failed to retry search:', error);
      throw error;
    }
  }, [searchId, connect]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      isManualCloseRef.current = true;
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  return {
    connectionStatus,
    progress,
    stages,
    error,
    isCompleted,
    isRunning: connectionStatus === 'connected' && !isCompleted,
    reconnect,
    disconnect,
    cancelSearch,
    retrySearch,
    clearError,
    sendMessage
  };
}

// Helper hook for progress state management
export function useProgressState(searchId: string) {
  const webSocket = useWebSocketProgress({
    searchId,
    onProgressUpdate: (progress) => {
      console.log('Progress updated:', progress);
    },
    onStageUpdate: (stage) => {
      console.log('Stage updated:', stage);
    },
    onError: (error) => {
      console.error('Progress error:', error);
    },
    onComplete: (results) => {
      console.log('Search completed:', results);
    }
  });

  const toggleStageExpanded = useCallback((stageId: string) => {
    // This would be implemented in the progress context
    console.log('Toggle stage expanded:', stageId);
  }, []);

  const refresh = useCallback(async () => {
    if (webSocket.connectionStatus === 'disconnected') {
      webSocket.reconnect();
    } else {
      webSocket.sendMessage({
        type: 'get_progress',
        searchId,
        timestamp: new Date()
      });
    }
  }, [webSocket, searchId]);

  return {
    ...webSocket,
    isFailed: !!webSocket.error && webSocket.connectionStatus !== 'connected',
    isCancelled: false, // This would be tracked in state
    toggleStageExpanded,
    refresh
  };
}