import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HelpTooltip } from "@/components/ui/tooltip"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  helpText?: string
  helpTooltip?: string
  illustration?: React.ReactNode
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  secondaryAction,
  helpText,
  helpTooltip,
  illustration,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
      {...props}
    >
      {illustration && (
        <div className="mb-6">
          {illustration}
        </div>
      )}
      
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      
      <div className="mb-4 max-w-sm space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="min-w-[120px]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              className="min-w-[120px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      
      {helpText && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{helpText}</span>
          {helpTooltip && (
            <HelpTooltip
              title="Need help?"
              description={helpTooltip}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Pre-configured empty states for common use cases
export function NoSearchResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No contacts found"
      description="We couldn't find any contacts matching your search criteria. Try adjusting your filters or search terms."
      action={{
        label: "Clear filters",
        onClick: onClearFilters || (() => {}),
        variant: "outline"
      }}
      secondaryAction={{
        label: "New search",
        onClick: () => window.location.reload()
      }}
      helpText="Tips for better results"
      helpTooltip="Try using broader keywords, checking spelling, or selecting different categories."
    />
  )
}

export function NoFavorites({ onStartSearching }: { onStartSearching?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      }
      title="No favorite contacts yet"
      description="Star contacts during your searches to save them here for easy access."
      action={{
        label: "Start searching",
        onClick: onStartSearching || (() => {}),
        variant: "default"
      }}
      helpText="How to add favorites"
      helpTooltip="Click the star icon on any contact to add it to your favorites."
    />
  )
}

export function NoSearchHistory({ onNewSearch }: { onNewSearch?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      title="No search history yet"
      description="Your previous AI searches will appear here for easy reference and re-running."
      action={{
        label: "Start your first search",
        onClick: onNewSearch || (() => {}),
        variant: "default"
      }}
      helpText="Search history benefits"
      helpTooltip="Quickly re-run successful searches and track your outreach progress."
    />
  )
}

export function NoImportedContacts({ onImport }: { onImport?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      }
      title="No imported contacts"
      description="Contacts you import from search results will appear here in your personal database."
      action={{
        label: "Find contacts to import",
        onClick: onImport || (() => {}),
        variant: "default"
      }}
      secondaryAction={{
        label: "Import from CSV",
        onClick: () => console.log("Import from CSV")
      }}
      helpText="Import benefits"
      helpTooltip="Imported contacts are saved to your personal database for easy access and outreach tracking."
    />
  )
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      title="Connection issue"
      description="We're having trouble connecting to our servers. Please check your internet connection and try again."
      action={{
        label: "Try again",
        onClick: onRetry || (() => window.location.reload()),
        variant: "default"
      }}
      secondaryAction={{
        label: "Check status",
        onClick: () => window.open("https://status.example.com", "_blank")
      }}
      helpText="Connection tips"
      helpTooltip="Check your internet connection, try refreshing the page, or contact support if the issue persists."
    />
  )
}

export function FirstTimeUser({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <EmptyState
      illustration={
        <div className="mb-6">
          <div className="mx-auto h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-4">
            <svg
              className="h-full w-full text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
        </div>
      }
      title="Welcome to AI-Powered Contact Discovery"
      description="Find the perfect media contacts for your story with our intelligent search system. Just describe who you're looking for and we'll do the rest."
      action={{
        label: "Get started",
        onClick: onGetStarted || (() => {}),
        variant: "default"
      }}
      secondaryAction={{
        label: "Watch tutorial",
        onClick: () => console.log("Watch tutorial")
      }}
      helpText="New to AI search?"
      helpTooltip="Our AI understands natural language - just describe the contacts you need like you would to a colleague."
    />
  )
}

export function QuotaExceeded({ onUpgrade }: { onUpgrade?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8 text-yellow-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      title="You've reached your search limit"
      description="You've used all your AI searches for this month. Upgrade your plan to continue finding amazing contacts."
      action={{
        label: "Upgrade plan",
        onClick: onUpgrade || (() => {}),
        variant: "default"
      }}
      secondaryAction={{
        label: "View usage",
        onClick: () => console.log("View usage")
      }}
      helpText="Need more searches?"
      helpTooltip="Our paid plans include more searches, advanced features, and priority support."
    />
  )
}