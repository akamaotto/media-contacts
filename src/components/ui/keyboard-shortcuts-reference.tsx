/**
 * Keyboard Shortcuts Reference Guide
 * Modal component displaying all available keyboard shortcuts
 */

"use client"

import * as React from "react"
import { X, Search, Keyboard as KeyboardIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { 
  KEYBOARD_SHORTCUTS, 
  SHORTCUT_CATEGORIES, 
  formatShortcutKey, 
  getShortcutsByCategory 
} from "@/lib/keyboard-shortcuts"
import { useAccessibilityPreferences } from "@/lib/user-preferences"

interface KeyboardShortcutsReferenceProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function KeyboardShortcutsReference({ 
  isOpen, 
  onClose, 
  className 
}: KeyboardShortcutsReferenceProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("all")
  const { showKeyboardHints } = useAccessibilityPreferences()

  // Get all shortcuts with their IDs
  const allShortcuts = React.useMemo(() => {
    const shortcuts: Array<{ id: string; shortcut: any }> = []
    Object.entries(KEYBOARD_SHORTCUTS).forEach(([id, shortcut]) => {
      shortcuts.push({ id, shortcut })
    })
    return shortcuts
  }, [])

  // Filter shortcuts based on search query
  const filteredShortcuts = React.useMemo(() => {
    if (!searchQuery) return allShortcuts
    
    const query = searchQuery.toLowerCase()
    return allShortcuts.filter(({ id, shortcut }) => {
      return (
        id.toLowerCase().includes(query) ||
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.category.toLowerCase().includes(query) ||
        formatShortcutKey(shortcut).toLowerCase().includes(query)
      )
    })
  }, [allShortcuts, searchQuery])

  // Get categorized shortcuts
  const categorizedShortcuts = React.useMemo(() => {
    return getShortcutsByCategory(
      Object.fromEntries(
        filteredShortcuts.map(({ id, shortcut }) => [id, shortcut])
      )
    )
  }, [filteredShortcuts])

  // Render shortcut item
  const renderShortcut = (id: string, shortcut: any) => (
    <div key={id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{shortcut.description}</p>
        <Badge variant="outline" className="text-xs">
          {SHORTCUT_CATEGORIES[shortcut.category]?.title || shortcut.category}
        </Badge>
      </div>
      <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
        {formatShortcutKey(shortcut)}
      </kbd>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <KeyboardIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Keyboard Shortcuts</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Navigate faster with these keyboard shortcuts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close keyboard shortcuts"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">All</TabsTrigger>
              {Object.entries(SHORTCUT_CATEGORIES).map(([key, category]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {category.icon}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="all" className="space-y-4 mt-0">
                {filteredShortcuts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No shortcuts found</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {filteredShortcuts.map(({ id, shortcut }) => 
                      renderShortcut(id, shortcut)
                    )}
                  </div>
                )}
              </TabsContent>

              {Object.entries(SHORTCUT_CATEGORIES).map(([key, category]) => (
                <TabsContent key={key} value={key} className="space-y-4 mt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <div>
                        <h3 className="font-semibold">{category.title}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {categorizedShortcuts[key]?.map(({ id, shortcut }) => 
                        renderShortcut(id, shortcut)
                      ) || (
                        <p className="text-center py-4 text-muted-foreground">
                          No shortcuts in this category
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredShortcuts.length} shortcuts
              </Badge>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Filtered
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                ?
              </kbd>
              <span>to show this guide</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Floating keyboard hints button
export function KeyboardHintsButton({ 
  onClick, 
  show 
}: { 
  onClick: () => void
  show?: boolean 
}) {
  const { showKeyboardHints } = useAccessibilityPreferences()
  
  if (!showKeyboardHints || !show) return null
  
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-40"
      aria-label="Show keyboard shortcuts"
    >
      <KeyboardIcon className="h-5 w-5" />
    </button>
  )
}

// Inline keyboard shortcut display
export function KeyboardShortcutDisplay({ 
  shortcutId,
  className 
}: { 
  shortcutId: string
  className?: string 
}) {
  const shortcut = KEYBOARD_SHORTCUTS[shortcutId]
  const { showKeyboardHints } = useAccessibilityPreferences()
  
  if (!shortcut || !showKeyboardHints) return null
  
  return (
    <kbd className={cn(
      "px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded",
      className
    )}>
      {formatShortcutKey(shortcut)}
    </kbd>
  )
}

// Keyboard shortcut tooltip
export function KeyboardShortcutTooltip({ 
  shortcutId,
  children,
  ...props 
}: { 
  shortcutId: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const shortcut = KEYBOARD_SHORTCUTS[shortcutId]
  const { showKeyboardHints } = useAccessibilityPreferences()
  
  if (!shortcut || !showKeyboardHints) {
    return <div {...props}>{children}</div>
  }
  
  return (
    <div {...props} className="flex items-center gap-2">
      {children}
      <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
        {formatShortcutKey(shortcut)}
      </kbd>
    </div>
  )
}

// Quick reference card for common shortcuts
export function QuickKeyboardReference({ className }: { className?: string }) {
  const { showKeyboardHints } = useAccessibilityPreferences()
  
  if (!showKeyboardHints) return null
  
  const commonShortcuts = [
    { id: 'open-search', description: 'Open search' },
    { id: 'close-modal', description: 'Close modal' },
    { id: 'show-help', description: 'Show help' },
    { id: 'select-all', description: 'Select all' }
  ]
  
  return (
    <div className={cn("p-4 bg-muted/30 rounded-lg space-y-2", className)}>
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <KeyboardIcon className="h-4 w-4" />
        Quick Shortcuts
      </h4>
      <div className="grid gap-2">
        {commonShortcuts.map(({ id, description }) => {
          const shortcut = KEYBOARD_SHORTCUTS[id]
          if (!shortcut) return null
          
          return (
            <div key={id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{description}</span>
              <kbd className="px-1.5 py-0.5 font-mono bg-background border border-border rounded">
                {formatShortcutKey(shortcut)}
              </kbd>
            </div>
          )
        })}
      </div>
    </div>
  )
}