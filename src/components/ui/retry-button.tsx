/**
 * Retry Button Component with Loading States
 * Provides consistent retry functionality across the application
 */

'use client';

import React, { useState } from 'react';
import { RefreshCw, Wifi, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  isRetrying?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  retryText?: string;
  retryingText?: string;
  showIcon?: boolean;
  autoRetryDelay?: number; // Auto retry after delay in ms
  maxAutoRetries?: number;
}

export function RetryButton({
  onRetry,
  isRetrying = false,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className,
  children,
  retryText = 'Retry',
  retryingText = 'Retrying...',
  showIcon = true,
  autoRetryDelay,
  maxAutoRetries = 3
}: RetryButtonProps) {
  const [internalRetrying, setInternalRetrying] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [autoRetryTimer, setAutoRetryTimer] = useState<NodeJS.Timeout | null>(null);

  const isCurrentlyRetrying = isRetrying || internalRetrying;

  const handleRetry = async () => {
    if (isCurrentlyRetrying || disabled) return;

    // Clear any existing auto retry timer
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }

    setInternalRetrying(true);
    
    try {
      await onRetry();
      setAutoRetryCount(0); // Reset auto retry count on successful manual retry
    } catch (error) {
      console.error('Retry failed:', error);
      
      // Start auto retry if configured and not exceeded max retries
      if (autoRetryDelay && autoRetryCount < maxAutoRetries) {
        const timer = setTimeout(() => {
          setAutoRetryCount(prev => prev + 1);
          handleRetry();
        }, autoRetryDelay);
        setAutoRetryTimer(timer);
      }
    } finally {
      setInternalRetrying(false);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (autoRetryTimer) {
        clearTimeout(autoRetryTimer);
      }
    };
  }, [autoRetryTimer]);

  return (
    <Button
      onClick={handleRetry}
      disabled={isCurrentlyRetrying || disabled}
      variant={variant}
      size={size}
      className={cn(className)}
    >
      {showIcon && (
        <RefreshCw 
          className={cn(
            "h-3 w-3",
            size === 'sm' ? "mr-1" : "mr-2",
            isCurrentlyRetrying && "animate-spin"
          )} 
        />
      )}
      {children || (isCurrentlyRetrying ? retryingText : retryText)}
      {autoRetryDelay && autoRetryCount > 0 && autoRetryCount < maxAutoRetries && (
        <span className="ml-1 text-xs opacity-70">
          ({autoRetryCount}/{maxAutoRetries})
        </span>
      )}
    </Button>
  );
}

/**
 * Connection Status Button
 * Shows connection status and provides retry functionality
 */
interface ConnectionStatusButtonProps {
  isOnline: boolean;
  onRetry: () => Promise<void> | void;
  isRetrying?: boolean;
  className?: string;
}

export function ConnectionStatusButton({
  isOnline,
  onRetry,
  isRetrying = false,
  className
}: ConnectionStatusButtonProps) {
  if (isOnline) {
    return (
      <Button variant="ghost" size="sm" className={cn("text-green-600", className)} disabled>
        <Wifi className="h-3 w-3 mr-1" />
        Online
      </Button>
    );
  }

  return (
    <RetryButton
      onRetry={onRetry}
      isRetrying={isRetrying}
      variant="outline"
      size="sm"
      className={cn("text-destructive border-destructive/50", className)}
      retryText="Reconnect"
      retryingText="Connecting..."
    >
      <AlertCircle className="h-3 w-3 mr-1" />
      {isRetrying ? 'Connecting...' : 'Offline'}
    </RetryButton>
  );
}

/**
 * Smart Retry Button with Exponential Backoff
 * Automatically handles retry logic with increasing delays
 */
interface SmartRetryButtonProps extends Omit<RetryButtonProps, 'autoRetryDelay' | 'maxAutoRetries'> {
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  onMaxRetriesReached?: () => void;
}

export function SmartRetryButton({
  onRetry,
  retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  onMaxRetriesReached,
  ...props
}: SmartRetryButtonProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nextRetryIn, setNextRetryIn] = useState<number | null>(null);

  const calculateDelay = (attempt: number) => {
    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
      retryConfig.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  };

  const handleSmartRetry = async () => {
    if (retryCount >= retryConfig.maxRetries) {
      onMaxRetriesReached?.();
      return;
    }

    setIsRetrying(true);
    
    try {
      await onRetry();
      setRetryCount(0); // Reset on success
      setNextRetryIn(null);
    } catch (error) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (newRetryCount < retryConfig.maxRetries) {
        const delay = calculateDelay(newRetryCount);
        setNextRetryIn(Math.ceil(delay / 1000));
        
        // Countdown timer
        const countdownInterval = setInterval(() => {
          setNextRetryIn(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              handleSmartRetry(); // Auto retry
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        onMaxRetriesReached?.();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const isDisabled = retryCount >= retryConfig.maxRetries || isRetrying;
  const buttonText = nextRetryIn 
    ? `Retry in ${nextRetryIn}s` 
    : retryCount >= retryConfig.maxRetries 
      ? 'Max retries reached'
      : isRetrying 
        ? 'Retrying...' 
        : `Retry${retryCount > 0 ? ` (${retryCount}/${retryConfig.maxRetries})` : ''}`;

  return (
    <Button
      onClick={handleSmartRetry}
      disabled={isDisabled}
      variant={retryCount >= retryConfig.maxRetries ? 'destructive' : 'outline'}
      size="sm"
      {...props}
    >
      <RefreshCw className={cn("h-3 w-3 mr-1", isRetrying && "animate-spin")} />
      {buttonText}
    </Button>
  );
}