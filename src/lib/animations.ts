/**
 * Animations and Transitions System
 * Comprehensive animation utilities and constants for smooth user interactions
 */

import { useAccessibilityPreferences } from './user-preferences'

// Animation duration constants
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 1000,
} as const

// Easing functions
export const EASING_FUNCTIONS = {
  // Linear
  linear: 'linear',
  
  // Ease-in
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInStrong: 'cubic-bezier(0.8, 0, 1, 1)',
  easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  easeInSine: 'cubic-bezier(0.47, 0, 0.745, 0.715)',
  easeInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  easeInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
  
  // Ease-out
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeOutStrong: 'cubic-bezier(0, 0, 0.2, 1)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeOutSine: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // Ease-in-out
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOutStrong: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
  easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
  easeInOutSine: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
  easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',
  easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
  easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const

// Common animation combinations
export const ANIMATION_PRESETS = {
  // Default smooth transitions
  default: {
    duration: ANIMATION_DURATIONS.normal,
    easing: EASING_FUNCTIONS.easeInOut,
  },
  
  // Quick interactions
  quick: {
    duration: ANIMATION_DURATIONS.fast,
    easing: EASING_FUNCTIONS.easeOut,
  },
  
  // Smooth emphasis
  smooth: {
    duration: ANIMATION_DURATIONS.slow,
    easing: EASING_FUNCTIONS.easeInOut,
  },
  
  // Bouncy entrance
  bouncy: {
    duration: ANIMATION_DURATIONS.slow,
    easing: EASING_FUNCTIONS.easeOutBack,
  },
  
  // Gentle fade
  gentle: {
    duration: ANIMATION_DURATIONS.normal,
    easing: EASING_FUNCTIONS.easeOut,
  },
  
  // Sharp emphasis
  sharp: {
    duration: ANIMATION_DURATIONS.fast,
    easing: EASING_FUNCTIONS.easeInStrong,
  },
} as const

// CSS animation classes
export const ANIMATION_CLASSES = {
  // Fade animations
  'fade-in': 'animate-fade-in',
  'fade-out': 'animate-fade-out',
  'fade-in-up': 'animate-fade-in-up',
  'fade-in-down': 'animate-fade-in-down',
  'fade-in-left': 'animate-fade-in-left',
  'fade-in-right': 'animate-fade-in-right',
  
  // Slide animations
  'slide-in-up': 'animate-slide-in-up',
  'slide-in-down': 'animate-slide-in-down',
  'slide-in-left': 'animate-slide-in-left',
  'slide-in-right': 'animate-slide-in-right',
  'slide-out-up': 'animate-slide-out-up',
  'slide-out-down': 'animate-slide-out-down',
  'slide-out-left': 'animate-slide-out-left',
  'slide-out-right': 'animate-slide-out-right',
  
  // Scale animations
  'scale-in': 'animate-scale-in',
  'scale-out': 'animate-scale-out',
  'scale-in-up': 'animate-scale-in-up',
  'scale-in-down': 'animate-scale-in-down',
  
  // Rotate animations
  'rotate-in': 'animate-rotate-in',
  'rotate-out': 'animate-rotate-out',
  
  // Bounce animations
  'bounce-in': 'animate-bounce-in',
  'bounce-out': 'animate-bounce-out',
  
  // Flip animations
  'flip-in': 'animate-flip-in',
  'flip-out': 'animate-flip-out',
  
  // Loading animations
  'spin': 'animate-spin',
  'pulse': 'animate-pulse',
  'ping': 'animate-ping',
  'bounce': 'animate-bounce',
} as const

// Custom animation hook
export function useAnimation(preset: keyof typeof ANIMATION_PRESETS = 'default') {
  const { reduceMotion } = useAccessibilityPreferences()
  
  const getAnimationStyle = useCallback((customPreset?: keyof typeof ANIMATION_PRESETS) => {
    if (reduceMotion) {
      return {
        transition: 'none',
        animation: 'none',
      }
    }
    
    const selectedPreset = ANIMATION_PRESETS[customPreset || preset]
    return {
      transition: `all ${selectedPreset.duration}ms ${selectedPreset.easing}`,
    }
  }, [preset, reduceMotion])
  
  const getAnimationClass = useCallback((animationName: keyof typeof ANIMATION_CLASSES) => {
    if (reduceMotion) return ''
    return ANIMATION_CLASSES[animationName]
  }, [reduceMotion])
  
  return {
    getAnimationStyle,
    getAnimationClass,
    shouldAnimate: !reduceMotion,
  }
}

// Utility functions for animations
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const createStaggeredAnimation = (
  elements: HTMLElement[],
  animationClass: string,
  staggerDelay: number = ANIMATION_DURATIONS.fast
) => {
  elements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add(animationClass)
    }, index * staggerDelay)
  })
}

export const createScrollTriggeredAnimation = (
  element: HTMLElement,
  animationClass: string,
  threshold: number = 0.1
) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(animationClass)
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold }
  )
  
  observer.observe(element)
  return observer
}

// Performance optimized animation utilities
export const useOptimizedAnimation = () => {
  const { reduceMotion } = useAccessibilityPreferences()
  
  const requestAnimation = useCallback((callback: () => void) => {
    if (reduceMotion) {
      callback()
      return
    }
    
    requestAnimationFrame(callback)
  }, [reduceMotion])
  
  const cancelAnimation = useCallback((animationId: number) => {
    cancelAnimationFrame(animationId)
  }, [])
  
  return {
    requestAnimation,
    cancelAnimation,
    shouldAnimate: !reduceMotion,
  }
}