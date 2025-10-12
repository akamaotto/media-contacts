/**
 * AI Contacts Import API Endpoint
 * Handles importing contacts from AI search results into the main database
 */

import { NextRequest, NextResponse } from 'next/server';
// Removed imports for missing modules

// Simple middleware wrapper function
function withAIMiddleware(handler: any) {
  return handler;
}
import { PrismaClient, DiscoverySource } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// import { SearchOrchestrationService } from '@/lib/ai/search-orchestration';
import { randomUUID } from 'crypto';

// Initialize Prisma client
const prisma = new PrismaClient();
// let orchestrationService: SearchOrchestrationService | null = null;

// async function getOrchestrationService() {
//   if (!orchestrationService) {
//     orchestrationService = new SearchOrchestrationService(prisma);
//     await orchestrationService.initialize();
//   }
//   return orchestrationService;
// }

// POST endpoint - Import contacts
async function importContactsHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Get validated data from middleware
    const validatedData = (request as any).__validatedData;
    const importRequest: {
      searchId: string;
      contactIds: string[];
      targetLists?: string[];
      tags?: string[];
    } = validatedData.body;

    // Validate required fields
    if (!importRequest.searchId || !importRequest.contactIds?.length) {
      return NextResponse.json({
        success: false,
        error: 'searchId and contactIds are required',
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Get the search results to extract contact data
    // In a real implementation, you'd fetch the search results from your orchestration service
    // For now, we'll assume the contactIds correspond to existing contacts in the search results

    const service = await getOrchestrationService();
    const searchStatus = await service.getSearchStatus(importRequest.searchId, session.user.id);

    if (!searchStatus) {
      return NextResponse.json({
        success: false,
        error: 'Search not found or access denied',
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const contactsById = new Map<string, any>();
    (searchStatus.contacts || []).forEach((contact: any) => {
      if (contact?.id) {
        contactsById.set(contact.id, contact);
      }
    });

    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process each contact for import
    for (const contactId of importRequest.contactIds) {
      try {
        const contactData = contactsById.get(contactId);

        if (!contactData) {
          errors.push(`Contact ${contactId} was not found in search results`);
          failedCount++;
          continue;
        }

        const email = contactData.email || contactData.primaryEmail;

        if (!email) {
          errors.push(`Contact ${contactId} is missing an email address`);
          failedCount++;
          continue;
        }

        // Prevent duplicate entries based on email
        const existingContact = await prisma.media_contacts.findFirst({
          where: {
            OR: [
              { email },
              { ai_search_id: importRequest.searchId, discovery_metadata: { path: ['originalContactId'], equals: contactId } }
            ]
          }
        });

        if (existingContact) {
          errors.push(`Contact ${contactId} already exists in the contact database`);
          failedCount++;
          continue;
        }

        const displayName = contactData.name || contactData.fullName || 'Unknown Contact';
        const title = contactData.title || contactData.position || 'Reporter';
        const socials = Array.isArray(contactData.socialProfiles)
          ? contactData.socialProfiles
              .map((profile: any) => profile?.url)
              .filter((url: string | undefined): url is string => Boolean(url))
          : [];
        const authorLinks = Array.isArray(contactData.sources)
          ? contactData.sources
              .map((source: any) => source?.url)
              .filter((url: string | undefined): url is string => Boolean(url))
          : contactData.metadata?.authorLinks ?? [];

        // Create new contact in database
        const newContact = await prisma.media_contacts.create({
          data: {
            id: randomUUID(),
            name: displayName,
            title,
            bio: contactData.bio || contactData.summary || null,
            email,
            socials,
            authorLinks,
            discovery_source: DiscoverySource.AI_SEARCH,
            discovery_method: contactData.metadata?.discoveryMethod || 'ai_search_orchestration',
            ai_confidence_score: contactData.confidenceScore
              ? Math.round(contactData.confidenceScore * 100)
              : null,
            discovered_at: new Date(),
            ai_search_id: importRequest.searchId,
            discovery_metadata: {
              originalContactId: contactId,
              sourceUrl: contactData.sourceUrl || contactData.url,
              tags: importRequest.tags,
              metrics: contactData.metrics,
              createdAt: contactData.createdAt ?? new Date().toISOString()
            },
            updated_at: new Date()
          }
        });

        importedCount++;

        // Log the import
        await AILogger.logBusiness({
          event: 'contact_imported',
          correlationId: context.correlationId,
          userId: context.userId,
          entityType: 'media_contact',
          entityId: newContact.id,
          changes: {
            searchId: importRequest.searchId,
            source: 'ai_search',
            tags: importRequest.tags
          }
        });

      } catch (error) {
        console.error(`Failed to import contact ${contactId}:`, error);
        errors.push(`Failed to import contact ${contactId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedCount++;
      }
    }

    // Create import record
    const importRecord = await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'AI_CONTACTS_IMPORTED',
        entityType: 'bulk_import',
        entityId: importRequest.searchId,
        details: {
          importedCount,
          failedCount,
          totalContacts: importRequest.contactIds.length,
          errors,
          searchId: importRequest.searchId,
          tags: importRequest.tags
        },
        createdAt: new Date(),
      }
    });

    const apiResponse: AIResponse = {
      success: true,
      data: {
        importId: importRecord.id,
        status: 'completed',
        imported: importedCount,
        failed: failedCount,
        total: importRequest.contactIds.length,
        errors: errors.length > 0 ? errors : undefined,
        importedAt: new Date().toISOString()
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      rateLimit: (request as any).__rateLimitInfo
    };

    // Log performance
    await AILogger.logPerformance({
      operation: 'ai_contacts_import',
      duration: Date.now() - startTime,
      correlationId: context.correlationId,
      userId: context.userId,
      metadata: {
        importId: importRecord.id,
        contactCount: importRequest.contactIds.length,
        successCount: importedCount,
        failureCount: failedCount
      }
    });

    return NextResponse.json(apiResponse, { status: 200 });

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_contacts_import' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint - Get import status/history
async function getImportStatusHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');
    const searchId = searchParams.get('searchId');
    const limit = parseInt(searchParams.get('limit') || '20');

    let imports;

    if (importId) {
      // Get specific import
      imports = await prisma.activityLog.findMany({
        where: {
          id: importId,
          action: 'AI_CONTACTS_IMPORTED',
          userId: context.userId
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });
    } else if (searchId) {
      // Get imports for specific search
      imports = await prisma.activityLog.findMany({
        where: {
          action: 'AI_CONTACTS_IMPORTED',
          userId: context.userId,
          details: {
            path: ['searchId'],
            equals: searchId
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } else {
      // Get all imports for user
      imports = await prisma.activityLog.findMany({
        where: {
          action: 'AI_CONTACTS_IMPORTED',
          userId: context.userId
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    }

    const apiResponse: AIResponse = {
      success: true,
      data: {
        imports: imports.map(imp => ({
          id: imp.id,
          searchId: imp.details?.searchId,
          status: 'completed',
          imported: imp.details?.importedCount || 0,
          failed: imp.details?.failedCount || 0,
          total: imp.details?.totalContacts || 0,
          errors: imp.details?.errors || [],
          createdAt: imp.createdAt
        })),
        total: imports.length
      },
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(apiResponse);

  } catch (error) {
    await AILogger.logError({
      error: error as Error,
      correlationId: context.correlationId,
      userId: context.userId,
      context: { operation: 'ai_contacts_import_status' }
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      correlationId: context.correlationId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Main request handler
async function contactsImportHandler(
  request: NextRequest,
  context: any
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'import';

  switch (request.method) {
    case 'POST':
      if (action === 'import') {
        return importContactsHandler(request, context);
      }
      break;

    case 'GET':
      if (action === 'status' || !action) {
        return getImportStatusHandler(request, context);
      }
      break;

    default:
      return NextResponse.json({
        success: false,
        error: `Method ${request.method} not allowed`,
        correlationId: context.correlationId,
        timestamp: new Date().toISOString()
      }, { status: 405 });
  }

  return NextResponse.json({
    success: false,
    error: 'Invalid request. Supported actions: import, status',
    correlationId: context.correlationId,
    timestamp: new Date().toISOString()
  }, { status: 400 });
}

// Export the middleware-wrapped handlers
export const POST = withAIMiddleware(contactsImportHandler);
export const GET = withAIMiddleware(contactsImportHandler);
