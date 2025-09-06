'use client';

import React, { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Enhanced Keyboard Shortcuts Hook
 * Provides comprehensive keyboard navigation and shortcuts
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Skip if user is typing in input fields
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       (activeElement as HTMLElement).contentEditable === 'true')
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  const showShortcutsHelp = useCallback(() => {
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(shortcut);
      return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    let helpText = 'Keyboard Shortcuts:\n\n';
    Object.entries(groupedShortcuts).forEach(([category, categoryShortcuts]) => {
      helpText += `${category}:\n`;
      categoryShortcuts.forEach(shortcut => {
        const keys = [
          shortcut.ctrl && 'Ctrl',
          shortcut.shift && 'Shift', 
          shortcut.alt && 'Alt',
          shortcut.key.toUpperCase()
        ].filter(Boolean).join(' + ');
        helpText += `  ${keys}: ${shortcut.description}\n`;
      });
      helpText += '\n';
    });

    console.log(helpText);
    toast.info('Keyboard shortcuts logged to console', {
      description: 'Check the browser console for the full list'
    });
  }, [shortcuts]);

  return { showShortcutsHelp };
}

interface MediaContactsKeyboardShortcutsProps {
  onAddContact: () => void;
  onSearch: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onShowHelp: () => void;
  enabled?: boolean;
}

/**
 * Media Contacts Specific Keyboard Shortcuts
 * Provides shortcuts optimized for media contacts management
 */
export function useMediaContactsShortcuts({
  onAddContact,
  onSearch,
  onRefresh,
  onExport,
  onImport,
  onShowHelp,
  enabled = true
}: MediaContactsKeyboardShortcutsProps) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrl: true,
      action: onAddContact,
      description: 'Add new contact',
      category: 'Actions'
    },
    {
      key: 'f',
      ctrl: true,
      action: onSearch,
      description: 'Focus search',
      category: 'Navigation'
    },
    {
      key: 'r',
      ctrl: true,
      action: onRefresh,
      description: 'Refresh data',
      category: 'Actions'
    },
    {
      key: 'e',
      ctrl: true,
      shift: true,
      action: onExport,
      description: 'Export contacts',
      category: 'Data'
    },
    {
      key: 'i',
      ctrl: true,
      shift: true,
      action: onImport,
      description: 'Import contacts',
      category: 'Data'
    },
    {
      key: '?',
      action: onShowHelp,
      description: 'Show keyboard shortcuts',
      category: 'Help'
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals/sheets
        const closeButtons = document.querySelectorAll('[aria-label*="Close"], [data-dismiss="modal"]');
        closeButtons.forEach(button => (button as HTMLElement).click());
      },
      description: 'Close modals/dialogs',
      category: 'Navigation'
    }
  ];

  const { showShortcutsHelp } = useKeyboardShortcuts({ shortcuts, enabled });

  return { showShortcutsHelp };
}

/**
 * Focus Management Utilities
 * Provides enhanced focus management for better accessibility
 */
export class FocusManager {
  private static previouslyFocusedElement: HTMLElement | null = null;

  /**
   * Trap focus within a container element
   */
  static trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * Save currently focused element for later restoration
   */
  static saveFocus() {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
  }

  /**
   * Restore previously saved focus
   */
  static restoreFocus() {
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }

  /**
   * Move focus to the next/previous focusable element
   */
  static moveFocus(direction: 'next' | 'previous') {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % focusableElements.length
      : (currentIndex - 1 + focusableElements.length) % focusableElements.length;

    focusableElements[nextIndex].focus();
  }
}

/**
 * Screen Reader Announcements
 * Provides utilities for making announcements to screen readers
 */
export class ScreenReaderAnnouncer {
  private static liveRegion: HTMLElement | null = null;

  /**
   * Initialize the live region for announcements
   */
  static init() {
    if (this.liveRegion) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce a message to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) this.init();
    
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.liveRegion) this.liveRegion.textContent = '';
      }, 1000);
    }
  }
}

// Initialize screen reader announcer when module loads
if (typeof window !== 'undefined') {
  ScreenReaderAnnouncer.init();
}