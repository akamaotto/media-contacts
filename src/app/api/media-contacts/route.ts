import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ActivityTrackingService } from '@/backend/dashboard/activity';

export const dynamic = 'force-dynamic';

/**
 * OPTIMIZED: Single API endpoint for media contacts table
 * Handles everything in one request to minimize network overhead
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [MEDIA-CONTACTS-API] Starting optimized API call...');
    const startTime = Date.now();

    // Check authentication
    const session = await auth();
    console.log('Media contacts API: Session check:', { hasSession: !!session, userId: session?.user?.id });
    
    // TEMPORARY: Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Media contacts API: No session found, but allowing request for debugging');
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));
    const searchTerm = searchParams.get('searchTerm') || '';
    const countryIds = searchParams.get('countryIds')?.split(',').filter(Boolean) || [];
    const beatIds = searchParams.get('beatIds')?.split(',').filter(Boolean) || [];
    const outletIds = searchParams.get('outletIds')?.split(',').filter(Boolean) || [];
    const regionCodes = searchParams.get('regionCodes')?.split(',').filter(Boolean) || [];
    const languageCodes = searchParams.get('languageCodes')?.split(',').filter(Boolean) || [];
    const emailVerified = searchParams.get('emailVerified') || 'all';

    console.log(`📊 [MEDIA-CONTACTS-API] Query params: page=${page}, pageSize=${pageSize}, search="${searchTerm}", outlets=${outletIds.length}, regions=${regionCodes.length}, languages=${languageCodes.length}`);

    // Build WHERE clause
    const whereClause: any = {};
    const conditions: any[] = [];

    // Search filter
    if (searchTerm.trim()) {
      conditions.push({
        OR: [
          { name: { contains: searchTerm.trim(), mode: 'insensitive' } },
          { email: { contains: searchTerm.trim(), mode: 'insensitive' } },
          { title: { contains: searchTerm.trim(), mode: 'insensitive' } }
        ]
      });
    }

    // Country filter
    if (countryIds.length > 0) {
      conditions.push({
        countries: { some: { id: { in: countryIds } } }
      });
    }

    // Beat filter
    if (beatIds.length > 0) {
      conditions.push({
        beats: { some: { id: { in: beatIds } } }
      });
    }

    // Outlet filter
    if (outletIds.length > 0) {
      conditions.push({
        outlets: { some: { id: { in: outletIds } } }
      });
    }

    // Region filter (through countries)
    if (regionCodes.length > 0) {
      conditions.push({
        countries: { 
          some: { 
            regions: { 
              some: { 
                code: { in: regionCodes } 
              } 
            } 
          } 
        }
      });
    }

    // Language filter (through countries)
    if (languageCodes.length > 0) {
      conditions.push({
        countries: { 
          some: { 
            languages: { 
              some: { 
                code: { in: languageCodes } 
              } 
            } 
          } 
        }
      });
    }

    // Email verification filter
    if (emailVerified !== 'all') {
      conditions.push({
        email_verified_status: emailVerified === 'verified'
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    // SINGLE OPTIMIZED QUERY: Get everything we need in one go
    const queryStart = Date.now();
    
    const [contacts, totalCount] = await Promise.all([
      prisma.mediaContact.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          title: true,
          email_verified_status: true,
          updated_at: true,
          // Get relationships efficiently - only what we need for display
          outlets: {
            select: { id: true, name: true },
            take: 3 // Only get first 3 for display
          },
          beats: {
            select: { id: true, name: true },
            take: 3 // Only get first 3 for display
          },
          countries: {
            select: { 
              id: true, 
              name: true,
              regions: {
                select: { id: true, name: true, code: true }
              },
              languages: {
                select: { id: true, name: true, code: true }
              }
            },
            take: 3 // Only get first 3 for display
          },
          // Get counts for "more" indicators
          _count: {
            select: {
              outlets: true,
              beats: true,
              countries: true
            }
          }
        },
        orderBy: { updated_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      
      prisma.mediaContact.count({ where: whereClause })
    ]);

    const queryTime = Date.now() - queryStart;
    console.log(`⚡ [MEDIA-CONTACTS-API] Database query completed in ${queryTime}ms`);

    // Transform data for frontend
    const transformedContacts = contacts.map(contact => {
      // Extract unique regions and languages from countries
      const allRegions = contact.countries.flatMap(country => country.regions);
      const allLanguages = contact.countries.flatMap(country => country.languages);
      
      // Remove duplicates based on code
      const uniqueRegions = allRegions.filter((region, index, self) => 
        index === self.findIndex(r => r.code === region.code)
      );
      const uniqueLanguages = allLanguages.filter((language, index, self) => 
        index === self.findIndex(l => l.code === language.code)
      );

      return {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        title: contact.title,
        email_verified_status: contact.email_verified_status,
        updated_at: contact.updated_at,
        outlets: contact.outlets,
        beats: contact.beats,
        countries: contact.countries.map(c => ({ id: c.id, name: c.name })), // Clean up countries data
        regions: uniqueRegions.slice(0, 3), // First 3 regions for display
        languages: uniqueLanguages.slice(0, 3), // First 3 languages for display
        // Add counts for "more" indicators
        outletCount: contact._count.outlets,
        beatCount: contact._count.beats,
        countryCount: contact._count.countries,
        regionCount: uniqueRegions.length,
        languageCount: uniqueLanguages.length
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`✅ [MEDIA-CONTACTS-API] Total API time: ${totalTime}ms for ${transformedContacts.length} contacts`);

    const response = NextResponse.json({
      contacts: transformedContacts,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      performance: {
        queryTime,
        totalTime,
        contactsReturned: transformedContacts.length
      }
    });

    // Add performance headers
    response.headers.set('X-Query-Time', queryTime.toString());
    response.headers.set('X-Total-Time', totalTime.toString());
    
    // Cache for 30 seconds to improve performance
    response.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

    return response;

  } catch (error) {
    console.error('❌ [MEDIA-CONTACTS-API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media contacts' },
      { status: 500 }
    );
  }
}
/**
 * 
POST /api/media-contacts - Create new contact
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      title, 
      bio, 
      socials, 
      authorLinks, 
      email_verified_status,
      outletIds = [],
      countryIds = [],
      beatIds = []
    } = body;

    // Basic validation
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Create contact with relationships
    const newContact = await prisma.mediaContact.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        title: title?.trim() || '',
        bio: bio?.trim() || null,
        socials: socials || [],
        authorLinks: authorLinks || [],
        email_verified_status: Boolean(email_verified_status),
        outlets: {
          connect: outletIds.map((id: string) => ({ id }))
        },
        countries: {
          connect: countryIds.map((id: string) => ({ id }))
        },
        beats: {
          connect: beatIds.map((id: string) => ({ id }))
        }
      },
      include: {
        outlets: { select: { id: true, name: true } },
        countries: { select: { id: true, name: true, code: true } },
        beats: { select: { id: true, name: true } }
      }
    });

    // Log activity
    if (session.user.id) {
      const activityService = new ActivityTrackingService();
      await activityService.logActivity({
        type: 'create',
        entity: 'media_contact',
        entityId: newContact.id,
        entityName: newContact.name,
        userId: session.user.id,
        details: {
          email: newContact.email,
          title: newContact.title,
          outlets: newContact.outlets?.map(o => o.name) || [],
          countries: newContact.countries?.map(c => c.name) || [],
          beats: newContact.beats?.map(b => b.name) || []
        }
      });
    }

    return NextResponse.json({ 
      message: 'Contact created successfully',
      contact: newContact 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating contact:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}