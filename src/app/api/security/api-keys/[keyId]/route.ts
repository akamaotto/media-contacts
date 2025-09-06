import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiKeyManager } from '@/lib/security/api-key-manager';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyId = params.keyId;
  const success = await apiKeyManager.revokeAPIKey(keyId);

  if (!success) {
    return NextResponse.json(
      { error: 'API key not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: 'API key revoked successfully',
    keyId,
    timestamp: new Date().toISOString()
  });
}
