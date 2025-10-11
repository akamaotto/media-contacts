/**
 * AI Search API Route with Feature Flag Integration
 * Demonstrates how to use feature flags to control API behavior
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  isServerFeatureEnabled, 
  withFeatureFlag, 
  logFeatureFlagEvaluation 
} from '@/lib/feature-flags/server-utils';

// Mock AI search function
async function performAISearch(query: string, userId?: string, provider?: string) {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock different results based on provider
  if (provider === 'openai') {
    return [
      {
        id: '1',
        name: 'John Doe',
        title: 'Tech Reporter',
        email: 'john.doe@example.com',
        outlet: 'Tech News',
        relevanceScore: 0.95
      },
      {
        id: '2',
        name: 'Jane Smith',
        title: 'Science Writer',
        email: 'jane.smith@example.com',
        outlet: 'Science Daily',
        relevanceScore: 0.87
      }
    ];
  } else if (provider === 'anthropic') {
    return [
      {
        id: '3',
        name: 'Bob Johnson',
        title: 'Business Journalist',
        email: 'bob.johnson@example.com',
        outlet: 'Business Times',
        relevanceScore: 0.92
      }
    ];
  } else {
    return [
      {
        id: '4',
        name: 'Alice Brown',
        title: 'Health Reporter',
        email: 'alice.brown@example.com',
        outlet: 'Health Today',
        relevanceScore: 0.89
      }
    ];
  }
}

// Main handler with feature flag check
async function handleAISearch(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId } = body;
    
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: query'
      }, { status: 400 });
    }
    
    // Check which AI provider to use
    let provider = 'openai'; // default
    try {
      const anthropicEnabled = await isServerFeatureEnabled('ai-search-provider-anthropic', { userId });
      if (anthropicEnabled) {
        provider = 'anthropic';
      }
    } catch (error) {
      console.error('Failed to check AI provider feature flag:', error);
    }
    
    // Check if caching is enabled
    let useCache = false;
    try {
      useCache = await isServerFeatureEnabled('ai-search-caching', { userId });
    } catch (error) {
      console.error('Failed to check caching feature flag:', error);
    }
    
    // Log the evaluation
    await logFeatureFlagEvaluation(
      'ai-search-enabled',
      { userId, ip: request.ip },
      true,
      'AI search API called'
    );
    
    // Perform search
    const results = await performAISearch(query, userId, provider);
    
    return NextResponse.json({
      success: true,
      data: {
        results,
        provider,
        cached: useCache // In a real implementation, check if results came from cache
      },
      message: 'AI search completed successfully'
    });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform AI search'
    }, { status: 500 });
  }
}

// Fallback handler when AI search is disabled
async function handleAISearchDisabled() {
  return NextResponse.json({
    success: false,
    error: 'AI search is currently unavailable',
    message: 'Please try again later or contact support'
  }, { status: 503 });
}

// Wrap the handler with feature flag check
export const POST = withFeatureFlag('ai-search-enabled', {
  fallback: handleAISearchDisabled
})(handleAISearch);

// GET handler for checking AI search status
export async function GET(request: NextRequest) {
  try {
    // Check if AI search is enabled
    const enabled = await isServerFeatureEnabled('ai-search-enabled');
    
    // Check if advanced options are enabled
    const advancedOptionsEnabled = await isServerFeatureEnabled('ai-search-advanced-options');
    
    // Check which AI provider is enabled
    let provider = 'openai'; // default
    try {
      const anthropicEnabled = await isServerFeatureEnabled('ai-search-provider-anthropic');
      if (anthropicEnabled) {
        provider = 'anthropic';
      }
    } catch (error) {
      console.error('Failed to check AI provider feature flag:', error);
    }
    
    // Check if caching is enabled
    let cachingEnabled = false;
    try {
      cachingEnabled = await isServerFeatureEnabled('ai-search-caching');
    } catch (error) {
      console.error('Failed to check caching feature flag:', error);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        enabled,
        advancedOptionsEnabled,
        provider,
        cachingEnabled
      },
      message: 'AI search status retrieved successfully'
    });
  } catch (error) {
    console.error('Failed to get AI search status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get AI search status'
    }, { status: 500 });
  }
}