import * as React from "react"
import { CheckCircle, Sparkles, Trophy, Star, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface SuccessCelebrationProps {
  title: string
  message: string
  type?: "success" | "milestone" | "achievement" | "first-time"
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "ghost"
  }>
  onClose?: () => void
  showConfetti?: boolean
  className?: string
}

export function SuccessCelebration({
  title,
  message,
  type = "success",
  actions = [],
  onClose,
  showConfetti = true,
  className
}: SuccessCelebrationProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [showActions, setShowActions] = React.useState(false)

  React.useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)

    // Show actions after a delay
    const actionsTimer = setTimeout(() => {
      setShowActions(true)
    }, 2000)

    return () => {
      clearTimeout(timer)
      clearTimeout(actionsTimer)
    }
  }, [])

  const getIcon = () => {
    switch (type) {
      case "milestone":
        return <Trophy className="h-12 w-12 text-yellow-500" />
      case "achievement":
        return <Star className="h-12 w-12 text-purple-500" />
      case "first-time":
        return <Sparkles className="h-12 w-12 text-blue-500" />
      default:
        return <CheckCircle className="h-12 w-12 text-green-500" />
    }
  }

  const getBackgroundGradient = () => {
    switch (type) {
      case "milestone":
        return "from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
      case "achievement":
        return "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
      case "first-time":
        return "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
      default:
        return "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case "milestone":
        return "border-yellow-200 dark:border-yellow-800"
      case "achievement":
        return "border-purple-200 dark:border-purple-800"
      case "first-time":
        return "border-blue-200 dark:border-blue-800"
      default:
        return "border-green-200 dark:border-green-800"
    }
  }

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4",
      "bg-black/20 backdrop-blur-sm",
      isVisible ? "animate-in fade-in duration-300" : "animate-out fade-out duration-300",
      className
    )}>
      {/* Confetti effect */}
      {showConfetti && isVisible && <Confetti />}
      
      <Card className={cn(
        "max-w-md w-full relative overflow-hidden",
        "border-2",
        getBorderColor(),
        "bg-gradient-to-br",
        getBackgroundGradient(),
        "transform transition-all duration-500",
        isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      )}>
        <CardContent className="p-6 text-center space-y-4">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close celebration"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Icon with animation */}
          <div className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg",
            "transform transition-all duration-700 delay-200",
            isVisible ? "scale-100 rotate-0" : "scale-0 rotate-180"
          )}>
            {getIcon()}
          </div>

          {/* Content */}
          <div className={cn(
            "space-y-2 transition-all duration-500 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {message}
            </p>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className={cn(
              "flex flex-col gap-2 sm:flex-row sm:justify-center",
              "transition-all duration-500 delay-500",
              showActions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || "default"}
                  className="min-w-[120px]"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Progress indicator for milestones */}
          {type === "milestone" && (
            <div className={cn(
              "mt-4 transition-all duration-500 delay-700",
              isVisible ? "opacity-100" : "opacity-0"
            )}>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>Keep up the great work!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Confetti animation component
function Confetti() {
  const [particles, setParticles] = React.useState<Array<{ id: number; x: number; y: number; color: string }>>([])

  React.useEffect(() => {
    const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"]
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100 - 100,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))
    setParticles(newParticles)

    const timer = setTimeout(() => {
      setParticles([])
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            animation: `fall ${2 + Math.random() * 2}s ease-in forwards`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Pre-configured success celebrations
export function SearchCompletedCelebration({ 
  contactCount, 
  onViewResults, 
  onClose 
}: { 
  contactCount: number
  onViewResults?: () => void
  onClose?: () => void 
}) {
  return (
    <SuccessCelebration
      title="Search completed successfully!"
      message={`We found ${contactCount} perfect contacts for your campaign.`}
      type="success"
      actions={[
        {
          label: "View results",
          onClick: onViewResults || (() => {}),
          variant: "default"
        },
        {
          label: "Start new search",
          onClick: onClose || (() => {}),
          variant: "outline"
        }
      ]}
      onClose={onClose}
    />
  )
}

export function FirstSearchCelebration({ 
  onContinue 
}: { 
  onContinue?: () => void 
}) {
  return (
    <SuccessCelebration
      title="Welcome! Your first AI search"
      message="You've discovered the power of AI-powered contact finding. Let's find some amazing contacts!"
      type="first-time"
      actions={[
        {
          label: "Continue exploring",
          onClick: onContinue || (() => {}),
          variant: "default"
        }
      ]}
      showConfetti={true}
    />
  )
}

export function MilestoneCelebration({ 
  milestone, 
  count, 
  onContinue 
}: { 
  milestone: "searches" | "contacts" | "imports"
  count: number
  onContinue?: () => void 
}) {
  const getMilestoneText = () => {
    switch (milestone) {
      case "searches":
        return `Amazing! You've completed ${count} AI searches`
      case "contacts":
        return `Impressive! You've found ${count} contacts`
      case "imports":
        return `Great! You've imported ${count} contacts`
      default:
        return `Milestone reached: ${count}`
    }
  }

  const getMessage = () => {
    switch (milestone) {
      case "searches":
        return "You're becoming a pro at finding the perfect contacts. Keep up the great work!"
      case "contacts":
        return "Your contact database is growing nicely. These connections will be valuable for your campaigns."
      case "imports":
        return "Your personal contact database is expanding. You're building a valuable resource for future outreach."
      default:
        return "You're making great progress on your journey!"
    }
  }

  return (
    <SuccessCelebration
      title={getMilestoneText()}
      message={getMessage()}
      type="milestone"
      actions={[
        {
          label: "Continue",
          onClick: onContinue || (() => {}),
          variant: "default"
        }
      ]}
      showConfetti={true}
    />
  )
}

export function ContactsImportedCelebration({ 
  contactCount, 
  onViewContacts, 
  onContinue 
}: { 
  contactCount: number
  onViewContacts?: () => void
  onContinue?: () => void 
}) {
  return (
    <SuccessCelebration
      title="Success! Contacts imported"
      message={`${contactCount} contacts have been added to your personal database.`}
      type="achievement"
      actions={[
        {
          label: "View contacts",
          onClick: onViewContacts || (() => {}),
          variant: "default"
        },
        {
          label: "Continue searching",
          onClick: onContinue || (() => {}),
          variant: "outline"
        }
      ]}
      showConfetti={contactCount > 10}
    />
  )
}