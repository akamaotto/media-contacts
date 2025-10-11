/**
 * Keyboard Shortcuts System
 * Comprehensive keyboard navigation and shortcuts for the AI search feature
 */

import { useEffect, useCallback } from 'react'
import { useAccessibilityPreferences } from './user-preferences'

// Keyboard shortcut definitions
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  description: string
  action: () => void
  category: 'global' | 'navigation' | 'search' | 'selection' | 'forms' | 'modal'
  enabled?: boolean
}

// Shortcut categories
export const SHORTCUT_CATEGORIES = {
  global: {
    title: 'Global',
    description: 'Shortcuts that work anywhere in the app',
    icon: '🌐'
  },
  navigation: {
    title: 'Navigation',
    description: 'Navigate through the interface',
    icon: '🧭'
  },
  search: {
    title: 'Search',
    description: 'Search-specific shortcuts',
    icon: '🔍'
  },
  selection: {
    title: 'Selection',
    description: 'Manage selections and bulk actions',
    icon: '✓'
  },
  forms: {
    title: 'Forms',
    description: 'Form navigation and submission',
    icon: '📝'
  },
  modal: {
    title: 'Modals',
    description: 'Modal dialog shortcuts',
    icon: '🪟'
  }
} as const

// Default shortcuts configuration
export const DEFAULT_SHORTCUTS: Record<string, Omit<KeyboardShortcut, 'action'>> = {
  // Global shortcuts
  'open-search': {
    key: 'k',
    ctrlKey: true,
    description: 'Open AI search modal',
    category: 'global'
  },
  'toggle-theme': {
    key: 'd',
    ctrlKey: true,
    shiftKey: true,
    description: 'Toggle dark/light theme',
    category: 'global'
  },
  'open-settings': {
    key: ',',
    ctrlKey: true,
    description: 'Open settings panel',
    category: 'global'
  },
  'show-help': {
    key: '?',
    description: 'Show keyboard shortcuts help',
    category: 'global'
  },
  'focus-search': {
    key: '/',
    description: 'Focus search input',
    category: 'global'
  },

  // Navigation shortcuts
  'next-page': {
    key: 'ArrowRight',
    ctrlKey: true,
    description: 'Go to next page',
    category: 'navigation'
  },
  'previous-page': {
    key: 'ArrowLeft',
    ctrlKey: true,
    description: 'Go to previous page',
    category: 'navigation'
  },
  'first-page': {
    key: 'Home',
    ctrlKey: true,
    description: 'Go to first page',
    category: 'navigation'
  },
  'last-page': {
    key: 'End',
    ctrlKey: true,
    description: 'Go to last page',
    category: 'navigation'
  },
  'scroll-up': {
    key: 'ArrowUp',
    description: 'Scroll up',
    category: 'navigation'
  },
  'scroll-down': {
    key: 'ArrowDown',
    description: 'Scroll down',
    category: 'navigation'
  },

  // Search shortcuts
  'start-search': {
    key: 'Enter',
    description: 'Start search (when in search form)',
    category: 'search'
  },
  'clear-search': {
    key: 'Escape',
    shiftKey: true,
    description: 'Clear search form',
    category: 'search'
  },
  'advanced-settings': {
    key: 'a',
    altKey: true,
    description: 'Toggle advanced search settings',
    category: 'search'
  },

  // Selection shortcuts
  'select-all': {
    key: 'a',
    ctrlKey: true,
    description: 'Select all items',
    category: 'selection'
  },
  'deselect-all': {
    key: 'a',
    ctrlKey: true,
    shiftKey: true,
    description: 'Deselect all items',
    category: 'selection'
  },
  'toggle-selection': {
    key: ' ',
    description: 'Toggle current item selection',
    category: 'selection'
  },
  'next-item': {
    key: 'ArrowDown',
    description: 'Select next item',
    category: 'selection'
  },
  'previous-item': {
    key: 'ArrowUp',
    description: 'Select previous item',
    category: 'selection'
  },

  // Form shortcuts
  'next-field': {
    key: 'Tab',
    description: 'Move to next form field',
    category: 'forms'
  },
  'previous-field': {
    key: 'Tab',
    shiftKey: true,
    description: 'Move to previous form field',
    category: 'forms'
  },
  'submit-form': {
    key: 'Enter',
    ctrlKey: true,
    description: 'Submit current form',
    category: 'forms'
  },
  'reset-form': {
    key: 'r',
    ctrlKey: true,
    description: 'Reset current form',
    category: 'forms'
  },

  // Modal shortcuts
  'close-modal': {
    key: 'Escape',
    description: 'Close current modal',
    category: 'modal'
  },
  'confirm-modal': {
    key: 'Enter',
    description: 'Confirm modal action',
    category: 'modal'
  },
  'modal-next': {
    key: 'ArrowRight',
    description: 'Next modal/tab',
    category: 'modal'
  },
  'modal-previous': {
    key: 'ArrowLeft',
    description: 'Previous modal/tab',
    category: 'modal'
  }
}

// Keyboard shortcuts hook
export function useKeyboardShortcuts(customShortcuts?: Record<string, KeyboardShortcut>) {
  const { enableKeyboardShortcuts, showKeyboardHints } = useAccessibilityPreferences()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Allow some shortcuts even in inputs
      const allowedInInputs = ['close-modal', 'submit-form', 'next-field', 'previous-field']
      // Check if any allowed shortcut matches
      const isAllowedShortcut = Object.entries(customShortcuts || {}).some(([id, shortcut]) => {
        if (!allowedInInputs.includes(id)) return false
        return matchesShortcut(event, shortcut)
      })
      if (!isAllowedShortcut) return
    }

    // Check all registered shortcuts
    Object.entries(customShortcuts || {}).forEach(([id, shortcut]) => {
      if (shortcut.enabled !== false && matchesShortcut(event, shortcut)) {
        event.preventDefault()
        event.stopPropagation()
        shortcut.action()
      }
    })
  }, [enableKeyboardShortcuts, customShortcuts])

  useEffect(() => {
    if (enableKeyboardShortcuts) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enableKeyboardShortcuts])

  return {
    registerShortcut: (id: string, shortcut: KeyboardShortcut) => {
      // This would typically update a context or state
      console.log(`Registering shortcut: ${id}`, shortcut)
    },
    unregisterShortcut: (id: string) => {
      // This would typically update a context or state
      console.log(`Unregistering shortcut: ${id}`)
    },
    showKeyboardHints
  }
}

// Helper function to check if event matches shortcut
function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrlKey &&
    !!event.altKey === !!shortcut.altKey &&
    !!event.shiftKey === !!shortcut.shiftKey &&
    !!event.metaKey === !!shortcut.metaKey
  )
}

// Format shortcut key for display
export function formatShortcutKey(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): string {
  const parts: string[] = []
  
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.metaKey) parts.push('Cmd')
  
  // Handle special keys
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Escape': 'Esc',
    'Enter': 'Enter',
    'Tab': 'Tab',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'Page Up',
    'PageDown': 'Page Down',
    'Delete': 'Delete',
    'Backspace': 'Backspace',
    'Insert': 'Insert'
  }
  
  const key = keyMap[shortcut.key] || shortcut.key.toUpperCase()
  parts.push(key)
  
  return parts.join(' + ')
}

// Get shortcuts by category
export function getShortcutsByCategory(shortcuts: Record<string, KeyboardShortcut>) {
  const categorized: Record<string, KeyboardShortcut[]> = {}
  
  Object.entries(shortcuts).forEach(([id, shortcut]) => {
    if (!categorized[shortcut.category]) {
      categorized[shortcut.category] = []
    }
    categorized[shortcut.category].push({ ...shortcut, key: id })
  })
  
  return categorized
}

// Search shortcuts specifically for AI search feature
export function useAISearchShortcuts() {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()
  
  const openSearchModal = useCallback(() => {
    // Dispatch custom event or call state setter
    window.dispatchEvent(new CustomEvent('open-ai-search'))
  }, [])
  
  const focusSearchInput = useCallback(() => {
    const searchInput = document.querySelector('[data-testid="search-query-input"]') as HTMLInputElement
    searchInput?.focus()
  }, [])
  
  const toggleAdvancedSettings = useCallback(() => {
    // Dispatch custom event to toggle advanced settings
    window.dispatchEvent(new CustomEvent('toggle-advanced-settings'))
  }, [])
  
  const clearSearchForm = useCallback(() => {
    // Dispatch custom event to clear search form
    window.dispatchEvent(new CustomEvent('clear-search-form'))
  }, [])
  
  const startSearch = useCallback(() => {
    // Dispatch custom event to start search
    window.dispatchEvent(new CustomEvent('start-search'))
  }, [])
  
  // Register AI search specific shortcuts
  useEffect(() => {
    const shortcuts = {
      'open-search': {
        ...DEFAULT_SHORTCUTS['open-search'],
        action: openSearchModal
      },
      'focus-search': {
        ...DEFAULT_SHORTCUTS['focus-search'],
        action: focusSearchInput
      },
      'advanced-settings': {
        ...DEFAULT_SHORTCUTS['advanced-settings'],
        action: toggleAdvancedSettings
      },
      'clear-search': {
        ...DEFAULT_SHORTCUTS['clear-search'],
        action: clearSearchForm
      },
      'start-search': {
        ...DEFAULT_SHORTCUTS['start-search'],
        action: startSearch
      }
    }
    
    Object.entries(shortcuts).forEach(([id, shortcut]) => {
      registerShortcut(id, shortcut)
    })
    
    return () => {
      Object.keys(shortcuts).forEach(id => {
        unregisterShortcut(id)
      })
    }
  }, [registerShortcut, unregisterShortcut, openSearchModal, focusSearchInput, toggleAdvancedSettings, clearSearchForm, startSearch])
  
  return {
    openSearchModal,
    focusSearchInput,
    toggleAdvancedSettings,
    clearSearchForm,
    startSearch
  }
}

// Keyboard shortcut hints component props
export interface KeyboardHintProps {
  shortcut: string | Omit<KeyboardShortcut, 'action'>
  showKey?: boolean
  className?: string
}

// Component for displaying keyboard hints
export function KeyboardHint({ shortcut, showKey = true, className }: KeyboardHintProps) {
  const { showKeyboardHints } = useAccessibilityPreferences()
  
  if (!showKeyboardHints) return null
  
  const shortcutDef = typeof shortcut === 'string' ? DEFAULT_SHORTCUTS[shortcut] : shortcut
  if (!shortcutDef) return null
  
  return (
    <span className={className}>
      {showKey && (
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
          {formatShortcutKey(shortcutDef)}
        </kbd>
      )}
    </span>
  )
}

// Export all shortcuts for reference
export const KEYBOARD_SHORTCUTS = DEFAULT_SHORTCUTS