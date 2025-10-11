/**
 * Enhanced Error Message Components
 * Comprehensive error handling with actionable resolution steps and helpful guidance
 */

"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw, X, ExternalLink, Info, CheckCircle, HelpCircle, Bug, WifiOff, Database, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { getMicrocopy } from "@/lib/constants/microcopy"

// Error severity levels
export type ErrorSeverity = "low" | "medium" | "high" | "critical"

// Error categories
export type ErrorCategory = 
  | "network" 
  | "validation" 
  | "permission" 
  | "quota" 
  | "server" 
  | "database" 
  | "authentication" 
  | "timeout" 
  | "unknown"

// Error action types
export interface ErrorAction {
  label: string
  onClick: () => void
  variant?: "default" | "outline" | "ghost" | "destructive"
  icon?: React.ReactNode
  primary?: boolean
}

// Enhanced error properties
export interface EnhancedErrorProps {
  title?: string
  message: string
  description?: string
  severity?: ErrorSeverity
  category?: ErrorCategory
  actions?: ErrorAction[]
  secondaryActions?: ErrorAction[]
  details?: string
  timestamp?: Date
  retryCount?: number
  maxRetries?: number
  showProgress?: boolean
  progress?: number
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  variant?: "default" | "card" | "inline" | "modal"
  icon?: React.ReactNode
}

// Error configuration by category
const ERROR_CONFIG = {
  network: {
    icon: <WifiOff className="h-5 w-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    title: "Connection issue",
    defaultActions: [
      { label: "Retry", onClick: () => window.location.reload(), primary: true, icon: <RefreshCw className="h-4 w-4" /> },
      { label: "Check status", onClick: () => window.open("https://status.example.com", "_blank"), icon: <ExternalLink className="h-4 w-4" /> }
    ]
  },
  validation: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    title: "Validation error",
    defaultActions: [
      { label: "Fix issues", onClick: () => {}, primary: true, icon: <CheckCircle className="h-4 w-4" /> }
    ]
  },
  permission: {
    icon: <Shield className="h-5 w-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    title: "Permission required",
    defaultActions: [
      { label: "Contact support", onClick: () => window.open("mailto:support@example.com"), icon: <ExternalLink className="h-4 w-4" /> }
    ]
  },
  quota: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    title: "Usage limit reached",
    defaultActions: [
      { label: "Upgrade plan", onClick: () => window.open("/billing", "_self"), primary: true, icon: <ExternalLink className="h-4 w-4" /> },
      { label: "View usage", onClick: () => window.open("/usage", "_self"), icon: <Info className="h-4 w-4" /> }
    ]
  },
  server: {
    icon: <Database className="h-5 w-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    title: "Server error",
    defaultActions: [
      { label: "Try again", onClick: () => window.location.reload(), primary: true, icon: <RefreshCw className="h-4 w-4" /> },
      { label: "Report issue", onClick: () => window.open("https://github.com/issues", "_blank"), icon: <Bug className="h-4 w-4" /> }
    ]
  },
  database: {
    icon: <Database className="h-5 w-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    title: "Database error",
    defaultActions: [
      { label: "Try again", onClick: () => window.location.reload(), primary: true, icon: <RefreshCw className="h-4 w-4" /> }
    ]
  },
  authentication: {
    icon: <Shield className="h-5 w-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    title: "Authentication error",
    defaultActions: [
      { label: "Sign in", onClick: () => window.open("/auth/signin", "_self"), primary: true, icon: <ExternalLink className="h-4 w-4" /> }
    ]
  },
  timeout: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    title: "Request timeout",
    defaultActions: [
      { label: "Try again", onClick: () => window.location.reload(), primary: true, icon: <RefreshCw className="h-4 w-4" /> }
    ]
  },
  unknown: {
    icon: <AlertTriangle className="h-5 w-5" />,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    borderColor: "border-gray-200 dark:border-gray-800",
    title: "Something went wrong",
    defaultActions: [
      { label: "Try again", onClick: () => window.location.reload(), primary: true, icon: <RefreshCw className="h-4 w-4" /> },
      { label: "Get help", onClick: () => window.open("/help", "_self"), icon: <HelpCircle className="h-4 w-4" /> }
    ]
  }
} as const

// Main Enhanced Error Component
export function EnhancedError({
  title,
  message,
  description,
  severity = "medium",
  category = "unknown",
  actions = [],
  secondaryActions = [],
  details,
  timestamp,
  retryCount = 0,
  maxRetries = 3,
  showProgress = false,
  progress = 0,
  dismissible = true,
  onDismiss,
  className,
  variant = "default",
  icon
}: EnhancedErrorProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isRetrying, setIsRetrying] = React.useState(false)
  
  const config = ERROR_CONFIG[category] || ERROR_CONFIG.unknown
  const hasRetriesLeft = retryCount < maxRetries
  
  const handleRetry = async () => {
    if (!hasRetriesLeft || isRetrying) return
    
    setIsRetrying(true)
    // Simulate retry delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRetrying(false)
    
    // Find and execute retry action
    const retryAction = actions.find(action => 
      action.label.toLowerCase().includes('retry') || 
      action.label.toLowerCase().includes('try again')
    )
    if (retryAction) {
      retryAction.onClick()
    }
  }
  
  const getSeverityColor = () => {
    switch (severity) {
      case "low": return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      case "medium": return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
      case "high": return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
      case "critical": return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      default: return config.borderColor
    }
  }
  
  const renderDefaultVariant = () => (
    <Alert className={cn(
      "relative overflow-hidden",
      config.bgColor,
      config.borderColor,
      getSeverityColor(),
      className
    )}>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0", config.color)}>
          {icon || config.icon}
        </div>
        
        <div className="flex-1 space-y-2">
          <AlertTitle className="flex items-center gap-2">
            {title || config.title}
            {severity !== "medium" && (
              <Badge variant="outline" className="text-xs">
                {severity}
              </Badge>
            )}
          </AlertTitle>
          
          <AlertDescription className="space-y-2">
            <p>{message}</p>
            {description && (
              <p className="text-sm opacity-80">{description}</p>
            )}
          </AlertDescription>
          
          {/* Progress indicator */}
          {showProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          {/* Retry counter */}
          {retryCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Retry {retryCount} of {maxRetries}</span>
              {!hasRetriesLeft && (
                <span className="text-red-600">No retries remaining</span>
              )}
            </div>
          )}
          
          {/* Actions */}
          {(actions.length > 0 || secondaryActions.length > 0 || hasRetriesLeft) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {hasRetriesLeft && (
                <Button
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  variant="default"
                  className="min-w-[80px]"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry ({maxRetries - retryCount} left)
                    </>
                  )}
                </Button>
              )}
              
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  onClick={action.onClick}
                  variant={action.variant || (action.primary ? "default" : "outline")}
                  className="min-w-[80px]"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
              
              {secondaryActions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  onClick={action.onClick}
                  variant="ghost"
                  className="min-w-[80px]"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          {/* Timestamp */}
          {timestamp && (
            <div className="text-xs text-muted-foreground">
              {timestamp.toLocaleString()}
            </div>
          )}
        </div>
      </div>
      
      {/* Expandable details */}
      {details && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{isExpanded ? "Hide" : "Show"} details</span>
            <X className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-45")} />
          </button>
          
          {isExpanded && (
            <div className="mt-2 p-3 bg-background/50 rounded border">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {details}
              </pre>
            </div>
          )}
        </div>
      )}
    </Alert>
  )
  
  const renderCardVariant = () => (
    <Card className={cn(
      config.borderColor,
      config.bgColor,
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("flex-shrink-0 mt-1", config.color)}>
              {icon || config.icon}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {title || config.title}
              </CardTitle>
              <CardDescription>
                {message}
              </CardDescription>
              {description && (
                <p className="text-sm">{description}</p>
              )}
            </div>
          </div>
          
          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress indicator */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {/* Actions */}
        {(actions.length > 0 || secondaryActions.length > 0 || hasRetriesLeft) && (
          <div className="flex flex-wrap gap-2">
            {hasRetriesLeft && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant="default"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry ({maxRetries - retryCount} left)
                  </>
                )}
              </Button>
            )}
            
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant={action.variant || (action.primary ? "default" : "outline")}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
            
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                variant="ghost"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        {/* Details */}
        {details && (
          <div className="space-y-2">
            <Separator />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{isExpanded ? "Hide" : "Show"} technical details</span>
              <X className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-45")} />
            </button>
            
            {isExpanded && (
              <div className="p-3 bg-background/50 rounded border">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {details}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
  
  const renderInlineVariant = () => (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-md border",
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className={cn("flex-shrink-0", config.color)}>
        {icon || config.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {title || config.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {message}
        </p>
      </div>
      
      {actions.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={actions[0].onClick}
          className="flex-shrink-0"
        >
          {actions[0].icon || <RefreshCw className="h-3 w-3" />}
        </Button>
      )}
    </div>
  )
  
  switch (variant) {
    case "card":
      return renderCardVariant()
    case "inline":
      return renderInlineVariant()
    default:
      return renderDefaultVariant()
  }
}

// Pre-configured error components for common scenarios
export function NetworkError({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <EnhancedError
      category="network"
      message="We're having trouble connecting to our servers. Please check your internet connection and try again."
      description="This could be due to network issues, server maintenance, or firewall restrictions."
      actions={[
        { label: "Retry", onClick: onRetry || (() => window.location.reload()), primary: true, icon: <RefreshCw className="h-4 w-4" /> },
        { label: "Check status", onClick: () => window.open("https://status.example.com", "_blank"), icon: <ExternalLink className="h-4 w-4" /> }
      ]}
      onDismiss={onDismiss}
    />
  )
}

export function ValidationError({ errors, onFix }: { errors: string[]; onFix?: () => void }) {
  return (
    <EnhancedError
      category="validation"
      message="Please review your input and fix the issues below."
      description="Some fields need your attention before we can proceed."
      details={errors.join("\n")}
      actions={[
        { label: "Fix issues", onClick: onFix || (() => {}), primary: true, icon: <CheckCircle className="h-4 w-4" /> }
      ]}
      severity="medium"
    />
  )
}

export function QuotaExceededError({ onUpgrade, onDismiss }: { onUpgrade?: () => void; onDismiss?: () => void }) {
  return (
    <EnhancedError
      category="quota"
      message="You've reached your usage limit for this month."
      description="Upgrade your plan to continue using this feature or wait for your limit to reset."
      actions={[
        { label: "Upgrade plan", onClick: onUpgrade || (() => window.open("/billing", "_self")), primary: true, icon: <ExternalLink className="h-4 w-4" /> },
        { label: "View usage", onClick: () => window.open("/usage", "_self"), icon: <Info className="h-4 w-4" /> }
      ]}
      severity="high"
      onDismiss={onDismiss}
    />
  )
}

export function ServerError({ onRetry, onReport, onDismiss }: { 
  onRetry?: () => void; 
  onReport?: () => void; 
  onDismiss?: () => void 
}) {
  return (
    <EnhancedError
      category="server"
      message="Our servers are experiencing issues. We're working on it!"
      description="This is usually resolved within a few minutes. Try again in a moment."
      actions={[
        { label: "Try again", onClick: onRetry || (() => window.location.reload()), primary: true, icon: <RefreshCw className="h-4 w-4" /> },
        { label: "Report issue", onClick: onReport || (() => window.open("https://github.com/issues", "_blank")), icon: <Bug className="h-4 w-4" /> }
      ]}
      severity="high"
      onDismiss={onDismiss}
    />
  )
}

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error!}
          retry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <EnhancedError
        category="unknown"
        title="Something went wrong"
        message="An unexpected error occurred while rendering this component."
        description="We've been notified about this issue and are working to fix it."
        details={error.stack}
        actions={[
          { label: "Try again", onClick: retry, primary: true, icon: <RefreshCw className="h-4 w-4" /> },
          { label: "Go home", onClick: () => window.location.href = "/", icon: <ExternalLink className="h-4 w-4" /> }
        ]}
        severity="high"
        variant="card"
      />
    </div>
  )
}