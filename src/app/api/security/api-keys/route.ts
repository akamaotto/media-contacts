import { NextRequest, NextResponse } from 'next/server';
import { apiKeyManager, API_PERMISSIONS } from '@/lib/security/api-key-manager';
import { createSecureAPIHandler } from '@/lib/security/security-middleware';

/**
 * GET /api/security/api-keys
 * Get user's API keys
 */
export const GET = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const apiKeys = apiKeyManager.getUserAPIKeys(context.userId!);
    
    return NextResponse.json({
      apiKeys,
      total: apiKeys.length,
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true
  }
);

/**
 * POST /api/security/api-keys
 * Create a new API key
 */
export const POST = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const body = await request.json();
    const { name, permissions, expiresAt, metadata } = body;

    if (!name || !permissions) {
      return NextResponse.json(
        { error: 'name and permissions are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'permissions must be an array' },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions = Object.values(API_PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Users can't grant admin permissions to themselves
    if (permissions.includes(API_PERMISSIONS.ADMIN) && !context.permissions.includes('admin')) {
      return NextResponse.json(
        { error: 'Cannot grant admin permissions' },
        { status: 403 }
      );
    }

    const result = apiKeyManager.generateAPIKey({
      name,
      userId: context.userId!,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata
    });

    return NextResponse.json({
      message: 'API key created successfully',
      apiKey: result.apiKey,
      key: result.key, // Only returned once!
      warning: 'Save this key securely. It will not be shown again.',
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true,
    requiredPermission: 'api_keys:create'
  }
);

/**
 * POST /api/security/api-keys/{keyId}/rotate
 * Rotate an API key
 */
// Note: key-specific routes are implemented under /api/security/api-keys/[keyId]/*