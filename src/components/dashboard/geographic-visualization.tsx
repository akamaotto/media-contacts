'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Globe, 
  RefreshCw, 
  Filter, 
  MapPin, 
  Users,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GeographicDataPoint {
  countryCode: string;
  countryName: string;
  contactCount: number;
  coordinates: [number, number];
  flagEmoji?: string;
}

interface GeographicVisualizationProps {
  className?: string;
  height?: number;
}



export function GeographicVisualization({ 
  className, 
  height = 400
}: GeographicVisualizationProps) {
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  // Holds geographic data points for visualization
  const [geoData, setGeoData] = useState<GeographicDataPoint[]>([]);
  

  const fetchGeographicData = async () => {
    try {
      setError(null);
      const response = await fetch('/api/dashboard/charts?type=geographic');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch geographic data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setGeoData(data.data || []);
    } catch (err) {
      console.error('Error fetching geographic data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load geographic data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGeographicData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGeographicData();
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'map' ? 'list' : 'map');
  };

  // Calculate color intensity based on contact count
  const getColorIntensity = (count: number, maxCount: number) => {
    if (maxCount === 0) return 0;
    return Math.min(count / maxCount, 1);
  };

  // Get color based on intensity
  const getIntensityColor = (intensity: number) => {
    const opacity = Math.max(0.1, intensity);
    return `rgba(59, 130, 246, ${opacity})`; // Blue with varying opacity
  };

  const maxContactCount = Math.max(...geoData.map(d => d.contactCount), 1);
  const totalContacts = geoData.reduce((sum, d) => sum + d.contactCount, 0);

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 border rounded-lg">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-2/3 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
      <h3 className="text-sm font-medium text-destructive mb-1">
        Failed to load geographic data
      </h3>
      <p className="text-xs text-destructive/80 mb-3">
        {error}
      </p>
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        Try Again
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Globe className="h-8 w-8 text-muted-foreground mb-2" />
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        No geographic data available
      </h3>
      <p className="text-xs text-muted-foreground">
        Add contacts with country information to see geographic distribution
      </p>
    </div>
  );

  const renderCountryCard = (country: GeographicDataPoint) => {
    const intensity = getColorIntensity(country.contactCount, maxContactCount);
    const percentage = totalContacts > 0 ? (country.contactCount / totalContacts * 100).toFixed(1) : '0';
    
    return (
      <div
        key={country.countryCode}
        className="group relative p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer"
        style={{ backgroundColor: getIntensityColor(intensity) }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {country.flagEmoji && (
              <span className="text-lg">{country.flagEmoji}</span>
            )}
            <div>
              <h4 className="font-medium text-sm">{country.countryName}</h4>
              <p className="text-xs text-muted-foreground">{country.countryCode}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {percentage}%
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{country.contactCount.toLocaleString()}</span>
          <span className="text-muted-foreground">
            {country.contactCount === 1 ? 'contact' : 'contacts'}
          </span>
        </div>
        
        {country.coordinates && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <MapPin className="h-3 w-3" />
            <span>{country.coordinates[0].toFixed(2)}, {country.coordinates[1].toFixed(2)}</span>
          </div>
        )}
        
        {/* Hover tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          <div className="font-medium">{country.countryName}</div>
          <div>{country.contactCount} contacts ({percentage}%)</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const sortedData = [...geoData].sort((a, b) => b.contactCount - a.contactCount);
    
    return (
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{geoData.length}</div>
            <div className="text-xs text-muted-foreground">Countries</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{totalContacts.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Contacts</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {geoData.length > 0 ? Math.round(totalContacts / geoData.length) : 0}
            </div>
            <div className="text-xs text-muted-foreground">Avg per Country</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{maxContactCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Highest Count</div>
          </div>
        </div>
        
        {/* Country Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedData.map(renderCountryCard)}
        </div>
      </div>
    );
  };

  const renderMapPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
      <Globe className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">
        Interactive Map Coming Soon
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        An interactive world map visualization will be available here. 
        For now, use the list view to explore geographic distribution.
      </p>
      <Button variant="outline" onClick={toggleViewMode}>
        <Eye className="h-4 w-4 mr-2" />
        View as List
      </Button>
    </div>
  );

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Geographic Distribution
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Media contacts distribution across countries and regions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleViewMode}
            className="h-8 px-3 text-xs"
          >
            {viewMode === 'list' ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                Map
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                List
              </>
            )}
          </Button>
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn(
              'h-3 w-3',
              (isLoading || isRefreshing) && 'animate-spin'
            )} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div style={{ minHeight: height }}>
          {isLoading && renderLoadingSkeleton()}
          {error && !isLoading && renderErrorState()}
          {!isLoading && !error && geoData.length === 0 && renderEmptyState()}
          
          {!isLoading && !error && geoData.length > 0 && (
            <>
              {viewMode === 'list' ? renderListView() : renderMapPlaceholder()}
            </>
          )}
        </div>
        
        {/* Data Summary */}
        {!isLoading && !error && geoData.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {geoData.length} {geoData.length === 1 ? 'country' : 'countries'} • {totalContacts.toLocaleString()} total contacts
            </span>
            <span>
              Updated {new Date().toLocaleTimeString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
