'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMediaQuery } from '@/hooks/use-media-query';

interface MobileResponsiveSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Mobile-responsive collapsible section
 */
export function MobileResponsiveSection({
  title,
  children,
  defaultOpen = true,
  priority = 'medium'
}: MobileResponsiveSectionProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // On mobile, collapse low priority sections by default
  useEffect(() => {
    if (isMobile && priority === 'low') {
      setIsOpen(false);
    }
  }, [isMobile, priority]);

  if (!isMobile) {
    return <div className="space-y-4">{children}</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              {title}
              <div className="flex items-center space-x-2">
                {priority === 'high' && (
                  <div className="h-2 w-2 bg-red-500 rounded-full" />
                )}
                {priority === 'medium' && (
                  <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Mobile-optimized metric cards grid
 */
export function MobileMetricsGrid({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {children}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

/**
 * Mobile-optimized chart container with touch support
 */
export function MobileChartContainer({ 
  children, 
  title,
  onRefresh 
}: { 
  children: React.ReactNode;
  title?: string;
  onRefresh?: () => void;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className={isMobile ? 'touch-pan-x touch-pan-y' : ''}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {isMobile && onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </CardHeader>
      )}
      <CardContent className={isMobile ? 'p-3' : ''}>
        <div className={isMobile ? 'overflow-x-auto' : ''}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Pull-to-refresh component for mobile
 */
export function PullToRefresh({ 
  onRefresh, 
  children 
}: { 
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !startY) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, 100));
      setIsPulling(distance > 50);
    }
  };

  const handleTouchEnd = async () => {
    if (!isMobile) return;
    
    if (isPulling && pullDistance > 50) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
    setStartY(0);
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-primary/10 transition-all duration-200 ease-out z-10"
          style={{ 
            height: `${pullDistance}px`,
            transform: `translateY(-${100 - pullDistance}px)`
          }}
        >
          <div className="flex items-center space-x-2 text-primary">
            <RefreshCw className={`h-4 w-4 ${isPulling ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isPulling ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${Math.min(pullDistance, 50)}px)` }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Mobile-optimized tabs with swipe support
 */
export function MobileSwipeTabs({
  tabs,
  activeTab,
  onTabChange,
  children
}: {
  tabs: Array<{ value: string; label: string }>;
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const currentIndex = tabs.findIndex(tab => tab.value === activeTab);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    
    const deltaX = currentX - startX;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        onTabChange(tabs[currentIndex - 1].value);
      } else if (deltaX < 0 && currentIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        onTabChange(tabs[currentIndex + 1].value);
      }
    }

    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Swipe indicator */}
      {isDragging && Math.abs(currentX - startX) > 20 && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-primary/20 rounded-full px-3 py-1">
            <div className="flex space-x-1">
              {tabs.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 w-6 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-primary' : 'bg-primary/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: isDragging 
            ? `translateX(${(currentX - startX) * 0.3}px)` 
            : 'translateX(0)'
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Mobile-optimized activity feed with infinite scroll
 */
export function MobileActivityFeed({
  items,
  onLoadMore,
  hasMore = true,
  isLoading = false
}: {
  items: any[];
  onLoadMore: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  // Intersection observer for infinite scroll
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        handleLoadMore();
      }
    }, {
      threshold: 0.1
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoading, hasMore]);

  if (!isMobile) {
    return null; // Use regular activity feed on desktop
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {items.map((item, index) => (
        <div key={index} className="p-3 bg-muted/30 rounded-lg">
          {/* Mobile-optimized activity item */}
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
            </div>
          </div>
        </div>
      ))}
      
      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          ) : (
            <Button variant="ghost" onClick={handleLoadMore} className="text-sm">
              Load more activities
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
