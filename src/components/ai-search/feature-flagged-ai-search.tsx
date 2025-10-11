/**
 * AI Search Component with Feature Flag Integration
 * Demonstrates how to use feature flags to control AI search functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useFeatureFlag, useFeatureFlagVariant } from '@/hooks/use-feature-flag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Settings, Zap, AlertTriangle } from 'lucide-react';

interface AISearchResult {
  id: string;
  name: string;
  title: string;
  email: string;
  outlet: string;
  relevanceScore: number;
  source: string;
}

interface AISearchProps {
  userId?: string;
  className?: string;
}

export default function FeatureFlaggedAISearch({ userId, className }: AISearchProps) {
  // Check if AI search is enabled
  const { enabled: aiSearchEnabled, loading: aiSearchLoading } = useFeatureFlag('ai-search-enabled', {
    context: { userId }
  });

  // Check if advanced options are enabled
  const { enabled: advancedOptionsEnabled } = useFeatureFlag('ai-search-advanced-options', {
    context: { userId }
  });

  // Check which AI provider to use
  const { variant: aiProvider } = useFeatureFlagVariant(
    'ai-search-provider-openai',
    ['openai', 'anthropic', 'google'],
    { context: { userId } }
  );

  // Check if caching is enabled
  const { enabled: cachingEnabled } = useFeatureFlag('ai-search-caching', {
    context: { userId }
  });

  // Component state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState(0);

  // Advanced options state
  const [filters, setFilters] = useState({
    country: '',
    category: '',
    beat: '',
    minRelevanceScore: 0.7
  });

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate API call with different behavior based on feature flags
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock different results based on AI provider
      let mockResults: AISearchResult[] = [];
      
      if (aiProvider === 'openai') {
        mockResults = [
          {
            id: '1',
            name: 'John Doe',
            title: 'Tech Reporter',
            email: 'john.doe@example.com',
            outlet: 'Tech News',
            relevanceScore: 0.95,
            source: 'OpenAI GPT-4'
          },
          {
            id: '2',
            name: 'Jane Smith',
            title: 'Science Writer',
            email: 'jane.smith@example.com',
            outlet: 'Science Daily',
            relevanceScore: 0.87,
            source: 'OpenAI GPT-4'
          }
        ];
      } else if (aiProvider === 'anthropic') {
        mockResults = [
          {
            id: '3',
            name: 'Bob Johnson',
            title: 'Business Journalist',
            email: 'bob.johnson@example.com',
            outlet: 'Business Times',
            relevanceScore: 0.92,
            source: 'Anthropic Claude'
          },
          {
            id: '4',
            name: 'Alice Brown',
            title: 'Health Reporter',
            email: 'alice.brown@example.com',
            outlet: 'Health Today',
            relevanceScore: 0.89,
            source: 'Anthropic Claude'
          }
        ];
      } else {
        mockResults = [
          {
            id: '5',
            name: 'Charlie Wilson',
            title: 'Sports Writer',
            email: 'charlie.wilson@example.com',
            outlet: 'Sports Weekly',
            relevanceScore: 0.85,
            source: 'Google Gemini'
          }
        ];
      }

      // Apply filters if advanced options are enabled
      if (advancedOptionsEnabled) {
        mockResults = mockResults.filter(result => 
          result.relevanceScore >= filters.minRelevanceScore
        );
      }

      setResults(mockResults);
      setSearchCount(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  // If AI search is still loading
  if (aiSearchLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            AI Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading AI Search...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If AI search is not enabled
  if (!aiSearchEnabled) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            AI Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI Search is currently unavailable. Please try again later or contact support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            AI Search
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center">
              <Zap className="mr-1 h-3 w-3" />
              {aiProvider || 'Default'}
            </Badge>
            {cachingEnabled && (
              <Badge variant="secondary" className="flex items-center">
                Cached
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Find media contacts using AI-powered search
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search">
          <TabsList>
            <TabsTrigger value="search">Search</TabsTrigger>
            {advancedOptionsEnabled && (
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="search" className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Search for media contacts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || !query.trim()}>
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Results ({results.length})</h3>
                {results.map((result) => (
                  <div key={result.id} className="border rounded-md p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{result.name}</h4>
                        <p className="text-sm text-muted-foreground">{result.title}</p>
                        <p className="text-sm text-muted-foreground">{result.email}</p>
                        <p className="text-sm text-muted-foreground">{result.outlet}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {Math.round(result.relevanceScore * 100)}%
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.source}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {results.length === 0 && query && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm">Try different keywords or check your spelling</p>
              </div>
            )}
          </TabsContent>
          
          {advancedOptionsEnabled && (
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    placeholder="e.g., United States"
                    value={filters.country}
                    onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="e.g., Technology"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Beat</label>
                  <Input
                    placeholder="e.g., AI Startups"
                    value={filters.beat}
                    onChange={(e) => setFilters(prev => ({ ...prev, beat: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Min Relevance Score</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.minRelevanceScore}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minRelevanceScore: parseFloat(e.target.value) 
                    }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Search count: {searchCount}
                </div>
                <Button onClick={() => setFilters({
                  country: '',
                  category: '',
                  beat: '',
                  minRelevanceScore: 0.7
                })} variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}