/**
 * User Preferences Persistence System
 * Handles storing and retrieving user preferences with proper typing and validation
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Types for user preferences
export interface UserPreferences {
  // Theme and display
  theme: 'light' | 'dark' | 'system'
  displayDensity: 'compact' | 'comfortable' | 'spacious'
  reduceMotion: boolean
  highContrast: boolean
  largeText: boolean

  // Language and localization
  language: string
  timezone: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'

  // Search preferences
  defaultCountries: string[]
  defaultCategories: string[]
  defaultMaxQueries: number
  defaultPriority: 'low' | 'medium' | 'high'
  saveSearchHistory: boolean
  autoSaveSearches: boolean
  showAdvancedSettings: boolean

  // Notifications
  emailNotifications: boolean
  pushNotifications: boolean
  searchCompleteNotifications: boolean
  weeklyDigest: boolean

  // Table and list preferences
  itemsPerPage: number
  showPreviews: boolean
  autoSelectFirst: boolean
  rememberFilters: boolean

  // Keyboard shortcuts
  enableKeyboardShortcuts: boolean
  showKeyboardHints: boolean

  // Privacy and data
  analyticsEnabled: boolean
  crashReporting: boolean
  shareUsageData: boolean

  // UI behavior
  confirmBeforeDelete: boolean
  autoRefreshData: boolean
  showTooltips: boolean
  compactMode: boolean

  // Accessibility
  screenReaderOptimizations: boolean
  focusVisible: boolean
  keyboardNavigation: boolean
}

// Default preferences
export const defaultPreferences: UserPreferences = {
  // Theme and display
  theme: 'system',
  displayDensity: 'comfortable',
  reduceMotion: false,
  highContrast: false,
  largeText: false,

  // Language and localization
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',

  // Search preferences
  defaultCountries: [],
  defaultCategories: [],
  defaultMaxQueries: 10,
  defaultPriority: 'medium',
  saveSearchHistory: true,
  autoSaveSearches: true,
  showAdvancedSettings: false,

  // Notifications
  emailNotifications: true,
  pushNotifications: false,
  searchCompleteNotifications: true,
  weeklyDigest: false,

  // Table and list preferences
  itemsPerPage: 25,
  showPreviews: true,
  autoSelectFirst: false,
  rememberFilters: true,

  // Keyboard shortcuts
  enableKeyboardShortcuts: true,
  showKeyboardHints: true,

  // Privacy and data
  analyticsEnabled: true,
  crashReporting: true,
  shareUsageData: false,

  // UI behavior
  confirmBeforeDelete: true,
  autoRefreshData: false,
  showTooltips: true,
  compactMode: false,

  // Accessibility
  screenReaderOptimizations: false,
  focusVisible: true,
  keyboardNavigation: true,
}

// Zustand store for preferences
interface PreferencesStore {
  preferences: UserPreferences
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void
  updateMultiplePreferences: (updates: Partial<UserPreferences>) => void
  resetPreferences: () => void
  resetCategory: (category: keyof Omit<UserPreferences, 'theme' | 'language'>) => void
  exportPreferences: () => string
  importPreferences: (preferencesJson: string) => boolean
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,

      updatePreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }))
      },

      updateMultiplePreferences: (updates) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...updates,
          },
        }))
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences })
      },

      resetCategory: (category) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [category]: defaultPreferences[category],
          },
        }))
      },

      exportPreferences: () => {
        return JSON.stringify(get().preferences, null, 2)
      },

      importPreferences: (preferencesJson) => {
        try {
          const imported = JSON.parse(preferencesJson)
          // Validate the imported preferences
          const validated = validatePreferences(imported)
          set({ preferences: validated })
          return true
        } catch (error) {
          console.error('Failed to import preferences:', error)
          return false
        }
      },
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        console.log('Preferences hydrated from storage')
      },
    }
  )
)

// Preference validation
function validatePreferences(partial: Partial<UserPreferences>): UserPreferences {
  return {
    theme: validateTheme(partial.theme),
    displayDensity: validateDisplayDensity(partial.displayDensity),
    reduceMotion: Boolean(partial.reduceMotion),
    highContrast: Boolean(partial.highContrast),
    largeText: Boolean(partial.largeText),

    language: String(partial.language || defaultPreferences.language),
    timezone: String(partial.timezone || defaultPreferences.timezone),
    dateFormat: validateDateFormat(partial.dateFormat),
    timeFormat: validateTimeFormat(partial.timeFormat),

    defaultCountries: Array.isArray(partial.defaultCountries) ? partial.defaultCountries : [],
    defaultCategories: Array.isArray(partial.defaultCategories) ? partial.defaultCategories : [],
    defaultMaxQueries: Number(partial.defaultMaxQueries) || defaultPreferences.defaultMaxQueries,
    defaultPriority: validatePriority(partial.defaultPriority),
    saveSearchHistory: Boolean(partial.saveSearchHistory ?? defaultPreferences.saveSearchHistory),
    autoSaveSearches: Boolean(partial.autoSaveSearches ?? defaultPreferences.autoSaveSearches),
    showAdvancedSettings: Boolean(partial.showAdvancedSettings ?? defaultPreferences.showAdvancedSettings),

    emailNotifications: Boolean(partial.emailNotifications ?? defaultPreferences.emailNotifications),
    pushNotifications: Boolean(partial.pushNotifications ?? defaultPreferences.pushNotifications),
    searchCompleteNotifications: Boolean(partial.searchCompleteNotifications ?? defaultPreferences.searchCompleteNotifications),
    weeklyDigest: Boolean(partial.weeklyDigest ?? defaultPreferences.weeklyDigest),

    itemsPerPage: Number(partial.itemsPerPage) || defaultPreferences.itemsPerPage,
    showPreviews: Boolean(partial.showPreviews ?? defaultPreferences.showPreviews),
    autoSelectFirst: Boolean(partial.autoSelectFirst ?? defaultPreferences.autoSelectFirst),
    rememberFilters: Boolean(partial.rememberFilters ?? defaultPreferences.rememberFilters),

    enableKeyboardShortcuts: Boolean(partial.enableKeyboardShortcuts ?? defaultPreferences.enableKeyboardShortcuts),
    showKeyboardHints: Boolean(partial.showKeyboardHints ?? defaultPreferences.showKeyboardHints),

    analyticsEnabled: Boolean(partial.analyticsEnabled ?? defaultPreferences.analyticsEnabled),
    crashReporting: Boolean(partial.crashReporting ?? defaultPreferences.crashReporting),
    shareUsageData: Boolean(partial.shareUsageData ?? defaultPreferences.shareUsageData),

    confirmBeforeDelete: Boolean(partial.confirmBeforeDelete ?? defaultPreferences.confirmBeforeDelete),
    autoRefreshData: Boolean(partial.autoRefreshData ?? defaultPreferences.autoRefreshData),
    showTooltips: Boolean(partial.showTooltips ?? defaultPreferences.showTooltips),
    compactMode: Boolean(partial.compactMode ?? defaultPreferences.compactMode),

    screenReaderOptimizations: Boolean(partial.screenReaderOptimizations ?? defaultPreferences.screenReaderOptimizations),
    focusVisible: Boolean(partial.focusVisible ?? defaultPreferences.focusVisible),
    keyboardNavigation: Boolean(partial.keyboardNavigation ?? defaultPreferences.keyboardNavigation),
  }
}

function validateTheme(theme?: string): 'light' | 'dark' | 'system' {
  const validThemes = ['light', 'dark', 'system']
  return validThemes.includes(theme as any) ? theme as any : defaultPreferences.theme
}

function validateDisplayDensity(density?: string): 'compact' | 'comfortable' | 'spacious' {
  const validDensities = ['compact', 'comfortable', 'spacious']
  return validDensities.includes(density as any) ? density as any : defaultPreferences.displayDensity
}

function validateDateFormat(format?: string): 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' {
  const validFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
  return validFormats.includes(format as any) ? format as any : defaultPreferences.dateFormat
}

function validateTimeFormat(format?: string): '12h' | '24h' {
  const validFormats = ['12h', '24h']
  return validFormats.includes(format as any) ? format as any : defaultPreferences.timeFormat
}

function validatePriority(priority?: string): 'low' | 'medium' | 'high' {
  const validPriorities = ['low', 'medium', 'high']
  return validPriorities.includes(priority as any) ? priority as any : defaultPreferences.defaultPriority
}

// Hooks for specific preference categories
export const useThemePreferences = () => {
  const { preferences, updatePreference } = usePreferencesStore()
  
  return {
    theme: preferences.theme,
    displayDensity: preferences.displayDensity,
    reduceMotion: preferences.reduceMotion,
    highContrast: preferences.highContrast,
    largeText: preferences.largeText,
    setTheme: (theme: UserPreferences['theme']) => updatePreference('theme', theme),
    setDisplayDensity: (density: UserPreferences['displayDensity']) => updatePreference('displayDensity', density),
    setReduceMotion: (reduceMotion: boolean) => updatePreference('reduceMotion', reduceMotion),
    setHighContrast: (highContrast: boolean) => updatePreference('highContrast', highContrast),
    setLargeText: (largeText: boolean) => updatePreference('largeText', largeText),
  }
}

export const useSearchPreferences = () => {
  const { preferences, updatePreference } = usePreferencesStore()
  
  return {
    defaultCountries: preferences.defaultCountries,
    defaultCategories: preferences.defaultCategories,
    defaultMaxQueries: preferences.defaultMaxQueries,
    defaultPriority: preferences.defaultPriority,
    saveSearchHistory: preferences.saveSearchHistory,
    autoSaveSearches: preferences.autoSaveSearches,
    showAdvancedSettings: preferences.showAdvancedSettings,
    setDefaultCountries: (countries: string[]) => updatePreference('defaultCountries', countries),
    setDefaultCategories: (categories: string[]) => updatePreference('defaultCategories', categories),
    setDefaultMaxQueries: (maxQueries: number) => updatePreference('defaultMaxQueries', maxQueries),
    setDefaultPriority: (priority: UserPreferences['defaultPriority']) => updatePreference('defaultPriority', priority),
    setSaveSearchHistory: (saveSearchHistory: boolean) => updatePreference('saveSearchHistory', saveSearchHistory),
    setAutoSaveSearches: (autoSaveSearches: boolean) => updatePreference('autoSaveSearches', autoSaveSearches),
    setShowAdvancedSettings: (showAdvancedSettings: boolean) => updatePreference('showAdvancedSettings', showAdvancedSettings),
  }
}

export const useTablePreferences = () => {
  const { preferences, updatePreference } = usePreferencesStore()
  
  return {
    itemsPerPage: preferences.itemsPerPage,
    showPreviews: preferences.showPreviews,
    autoSelectFirst: preferences.autoSelectFirst,
    rememberFilters: preferences.rememberFilters,
    setItemsPerPage: (itemsPerPage: number) => updatePreference('itemsPerPage', itemsPerPage),
    setShowPreviews: (showPreviews: boolean) => updatePreference('showPreviews', showPreviews),
    setAutoSelectFirst: (autoSelectFirst: boolean) => updatePreference('autoSelectFirst', autoSelectFirst),
    setRememberFilters: (rememberFilters: boolean) => updatePreference('rememberFilters', rememberFilters),
  }
}

export const useAccessibilityPreferences = () => {
  const { preferences, updatePreference } = usePreferencesStore()
  
  return {
    reduceMotion: preferences.reduceMotion,
    highContrast: preferences.highContrast,
    largeText: preferences.largeText,
    screenReaderOptimizations: preferences.screenReaderOptimizations,
    focusVisible: preferences.focusVisible,
    keyboardNavigation: preferences.keyboardNavigation,
    enableKeyboardShortcuts: preferences.enableKeyboardShortcuts,
    showKeyboardHints: preferences.showKeyboardHints,
    setReduceMotion: (reduceMotion: boolean) => updatePreference('reduceMotion', reduceMotion),
    setHighContrast: (highContrast: boolean) => updatePreference('highContrast', highContrast),
    setLargeText: (largeText: boolean) => updatePreference('largeText', largeText),
    setScreenReaderOptimizations: (screenReaderOptimizations: boolean) => updatePreference('screenReaderOptimizations', screenReaderOptimizations),
    setFocusVisible: (focusVisible: boolean) => updatePreference('focusVisible', focusVisible),
    setKeyboardNavigation: (keyboardNavigation: boolean) => updatePreference('keyboardNavigation', keyboardNavigation),
    setEnableKeyboardShortcuts: (enableKeyboardShortcuts: boolean) => updatePreference('enableKeyboardShortcuts', enableKeyboardShortcuts),
    setShowKeyboardHints: (showKeyboardHints: boolean) => updatePreference('showKeyboardHints', showKeyboardHints),
  }
}

// Utility functions
export const exportPreferencesToFile = () => {
  const { exportPreferences } = usePreferencesStore.getState()
  const preferencesJson = exportPreferences()
  const blob = new Blob([preferencesJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'user-preferences.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const importPreferencesFromFile = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const { importPreferences } = usePreferencesStore.getState()
      const success = importPreferences(content)
      resolve(success)
    }
    reader.onerror = () => resolve(false)
    reader.readAsText(file)
  })
}