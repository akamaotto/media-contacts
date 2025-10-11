
/**
 * Settings Panel Component
 * Comprehensive user preferences interface with tabs and organized sections
 */

"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { 
  Settings, 
  Palette, 
  Globe, 
  Search, 
  Monitor, 
  Accessibility, 
  Bell, 
  Shield, 
  Download, 
  Upload, 
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor as MonitorIcon,
  Zap,
  Keyboard,
  MousePointer,
  Volume2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { HelpTooltip } from "@/components/ui/tooltip"
import { 
  useThemePreferences, 
  useSearchPreferences, 
  useTablePreferences, 
  useAccessibilityPreferences,
  usePreferencesStore 
} from "@/lib/user-preferences"
import { getMicrocopy } from "@/lib/constants/microcopy"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function SettingsPanel({ isOpen, onClose, className }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("appearance")
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  const { preferences, resetPreferences, exportPreferences, importPreferences } = usePreferencesStore()
  const themePrefs = useThemePreferences()
  const searchPrefs = useSearchPreferences()
  const tablePrefs = useTablePreferences()
  const accessibilityPrefs = useAccessibilityPreferences()

  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const success = importPreferences(text)
      setSaveStatus(success ? "success" : "error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (error) {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    }
  }, [importPreferences])

  const handleExport = useCallback(() => {
    const preferencesJson = exportPreferences()
    const blob = new Blob([preferencesJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "preferences.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportPreferences])

  const handleReset = useCallback(() => {
    if (confirm("Are you sure you want to reset all settings to their defaults?")) {
      resetPreferences()
      setHasChanges(false)
    }
  }, [resetPreferences])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setHasChanges(false)
    setSaveStatus("success")
    setTimeout(() => setSaveStatus("idle"), 3000)
  }, [])

  if (!isOpen) return null

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm", className)}>
      <div className="w-full max-w-4xl max-h-[90vh] bg-background rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Settings</h2>
              <p className="text-sm text-muted-foreground">Customize your experience and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "success" && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Saved
              </Badge>
            )}
            {saveStatus === "error" && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                Error
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-6 pt-2">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="appearance" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </TabsTrigger>
                <TabsTrigger value="display" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline">Display</span>
                </TabsTrigger>
                <TabsTrigger value="accessibility" className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  <span className="hidden sm:inline">Accessibility</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Advanced</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="appearance" className="space-y-6 mt-0">
                <AppearanceSettings themePrefs={themePrefs} />
              </TabsContent>

              <TabsContent value="search" className="space-y-6 mt-0">
                <SearchSettings searchPrefs={searchPrefs} />
              </TabsContent>

              <TabsContent value="display" className="space-y-6 mt-0">
                <DisplaySettings tablePrefs={tablePrefs} />
              </TabsContent>

              <TabsContent value="accessibility" className="space-y-6 mt-0">
                <AccessibilitySettings accessibilityPrefs={accessibilityPrefs} />
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6 mt-0">
                <NotificationSettings />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-0">
                <AdvancedSettings />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <label htmlFor="import-settings">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </span>
              </Button>
            </label>
            <input
              id="import-settings"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Appearance Settings Component
function AppearanceSettings({ themePrefs }: { themePrefs: ReturnType<typeof useThemePreferences> }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme and appearance settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={themePrefs.theme} onValueChange={themePrefs.setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <MonitorIcon className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Display density</Label>
            <Select value={themePrefs.displayDensity} onValueChange={themePrefs.setDisplayDensity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reduce motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
              <Switch
                checked={themePrefs.reduceMotion}
                onCheckedChange={themePrefs.setReduceMotion}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High contrast</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
              <Switch
                checked={themePrefs.highContrast}
                onCheckedChange={themePrefs.setHighContrast}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Large text</Label>
                <p className="text-sm text-muted-foreground">
                  Increase font size for better readability
                </p>
              </div>
              <Switch
                checked={themePrefs.largeText}
                onCheckedChange={themePrefs.setLargeText}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Search Settings Component
function SearchSettings({ searchPrefs }: { searchPrefs: ReturnType<typeof useSearchPreferences> }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Default Search Settings
          </CardTitle>
          <CardDescription>
            Configure your preferred search defaults and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default priority</Label>
            <Select value={searchPrefs.defaultPriority} onValueChange={searchPrefs.setDefaultPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low · Slower, saves credits</SelectItem>
                <SelectItem value="medium">Medium · Balanced</SelectItem>
                <SelectItem value="high">High · Fastest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default maximum queries</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[searchPrefs.defaultMaxQueries]}
                onValueChange={([value]) => searchPrefs.setDefaultMaxQueries(value)}
                max={50}
                min={1}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm">{searchPrefs.defaultMaxQueries}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Save search history</Label>
                <p className="text-sm text-muted-foreground">
                  Keep track of your previous searches
                </p>
              </div>
              <Switch
                checked={searchPrefs.saveSearchHistory}
                onCheckedChange={searchPrefs.setSaveSearchHistory}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-save searches</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save successful searches
                </p>
              </div>
              <Switch
                checked={searchPrefs.autoSaveSearches}
                onCheckedChange={searchPrefs.setAutoSaveSearches}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show advanced settings</Label>
                <p className="text-sm text-muted-foreground">
                  Display advanced search options by default
                </p>
              </div>
              <Switch
                checked={searchPrefs.showAdvancedSettings}
                onCheckedChange={searchPrefs.setShowAdvancedSettings}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Display Settings Component
function DisplaySettings({ tablePrefs }: { tablePrefs: ReturnType<typeof useTablePreferences> }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Table & List Display
          </CardTitle>
          <CardDescription>
            Customize how data is displayed in tables and lists
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Items per page</Label>
            <Select value={String(tablePrefs.itemsPerPage)} onValueChange={(value) => tablePrefs.setItemsPerPage(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 items</SelectItem>
                <SelectItem value="25">25 items</SelectItem>
                <SelectItem value="50">50 items</SelectItem>
                <SelectItem value="100">100 items</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show contact previews</Label>
                <p className="text-sm text-muted-foreground">
                  Display preview cards in list view
                </p>
              </div>
              <Switch
                checked={tablePrefs.showPreviews}
                onCheckedChange={tablePrefs.setShowPreviews}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-select first item</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically select the first item in lists
                </p>
              </div>
              <Switch
                checked={tablePrefs.autoSelectFirst}
                onCheckedChange={tablePrefs.setAutoSelectFirst}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Remember filters</Label>
                <p className="text-sm text-muted-foreground">
                  Keep filters applied when returning to a page
                </p>
              </div>
              <Switch
                checked={tablePrefs.rememberFilters}
                onCheckedChange={tablePrefs.setRememberFilters}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Accessibility Settings Component
function AccessibilitySettings({ accessibilityPrefs }: { accessibilityPrefs: ReturnType<typeof useAccessibilityPreferences> }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility Options
          </CardTitle>
          <CardDescription>
            Customize the interface for better accessibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Screen reader optimizations</Label>
                <p className="text-sm text-muted-foreground">
                  Optimize interface for screen readers
                </p>
              </div>
              <Switch
                checked={accessibilityPrefs.screenReaderOptimizations}
                onCheckedChange={accessibilityPrefs.setScreenReaderOptimizations}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Focus visible</Label>
                <p className="text-sm text-muted-foreground">
                  Show clear focus indicators
                </p>
              </div>
              <Switch
                checked={accessibilityPrefs.focusVisible}
                onCheckedChange={accessibilityPrefs.setFocusVisible}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Keyboard navigation</Label>
                <p className="text-sm text-muted-foreground">
                  Enable full keyboard navigation
                </p>
              </div>
              <Switch
                checked={accessibilityPrefs.keyboardNavigation}
                onCheckedChange={accessibilityPrefs.setKeyboardNavigation}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Keyboard shortcuts</Label>
                <p className="text-sm text-muted-foreground">
                  Enable keyboard shortcuts throughout the app
                </p>
              </div>
              <Switch
                checked={accessibilityPrefs.enableKeyboardShortcuts}
                onCheckedChange={accessibilityPrefs.setEnableKeyboardShortcuts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show keyboard hints</Label>
                <p className="text-sm text-muted-foreground">
                  Display keyboard shortcut hints
                </p>
              </div>
              <Switch
                checked={accessibilityPrefs.showKeyboardHints}
                onCheckedChange={accessibilityPrefs.setShowKeyboardHints}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Notification Settings Component
function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Search complete notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when searches are completed
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly summary of activity
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Advanced Settings Component
function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Manage your privacy settings and data sharing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Help us improve by sharing usage analytics
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Crash reporting</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically report errors to help us fix issues
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share usage data</Label>
                <p className="text-sm text-muted-foreground">
               
                  Share anonymized usage data to improve the service
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance
          </CardTitle>
          <CardDescription>
            Optimize application performance and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Confirm before delete</Label>
                <p className="text-sm text-muted-foreground">
                  Show confirmation dialog before deleting items
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-refresh data</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh data in the background
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show tooltips</Label>
                <p className="text-sm text-muted-foreground">
                  Display helpful tooltips throughout the interface
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use a more compact interface layout
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}