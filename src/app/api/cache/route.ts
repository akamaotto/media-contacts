/**
 * Cache Management API Routes
 * API endpoints for cache management and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { warmCache, getCacheStats, clearCache } from '@/lib/actions/cache-actions';

/**
 * GET /api/cache/stats
 * Get cache statistics
 */
export async function GET() {
  try {
    const result = await getCacheStats();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error }, 
        { status: 401 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/cache/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/warm
 * Warm up the cache
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'warm':
        const warmResult = await warmCache();
        if (!warmResult.success) {
          return NextResponse.json(
            { error: warmResult.error }, 
            { status: 401 }
          );
        }
        return NextResponse.json(warmResult);
        
      case 'clear':
        const clearResult = await clearCache();
        if (!clearResult.success) {
          return NextResponse.json(
            { error: clearResult.error }, 
            { status: 401 }
          );
        }
        return NextResponse.json(clearResult);
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' }, 
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in POST /api/cache:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}