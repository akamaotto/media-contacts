import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiKeyManager } from '@/lib/security/api-key-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyId = params.keyId;
  const result = await apiKeyManager.rotateAPIKey(keyId);

  if (!result) {
    return NextResponse.json(
      { error: 'API key not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: 'API key rotated successfully',
    apiKey: result.apiKey,
    key: result.key, // Only returned once!
    warning: 'Save this new key securely. The old key has been deactivated.',
    timestamp: new Date().toISOString()
  });
}
