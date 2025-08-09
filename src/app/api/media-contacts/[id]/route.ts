import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ActivityTrackingService } from '@/backend/dashboard/activity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media-contacts/[id] - Get single contact details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    console.log('Media contacts [id] GET API: Session check:', { hasSession: !!session, userId: session?.user?.id });
    
    // TEMPORARY: Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Media contacts [id] GET API: No session found, but allowing request for debugging');
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contact = await prisma.mediaContact.findUnique({
      where: { id },
      include: {
        outlets: { select: { id: true, name: true, description: true, website: true } },
        countries: { 
          select: { 
            id: true, 
            name: true, 
            code: true,
            phone_code: true,
            capital: true,
            flag_emoji: true
          } 
        },
        beats: { select: { id: true, name: true, description: true } }
      }
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });

  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

/**
 * PUT /api/media-contacts/[id] - Update contact
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    console.log('Media contacts [id] PUT API: Session check:', { hasSession: !!session, userId: session?.user?.id });
    
    // TEMPORARY: Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Media contacts [id] PUT API: No session found, but allowing request for debugging');
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Update contact with relationships
    const updatedContact = await prisma.mediaContact.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email.trim(),
        title: title?.trim() || '',
        bio: bio?.trim() || null,
        socials: socials || [],
        authorLinks: authorLinks || [],
        email_verified_status: Boolean(email_verified_status),
        outlets: {
          set: outletIds.map((id: string) => ({ id }))
        },
        countries: {
          set: countryIds.map((id: string) => ({ id }))
        },
        beats: {
          set: beatIds.map((id: string) => ({ id }))
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
        type: 'update',
        entity: 'media_contact',
        entityId: updatedContact.id,
        entityName: updatedContact.name,
        userId: session.user.id,
        details: {
          email: updatedContact.email,
          title: updatedContact.title,
          outlets: updatedContact.outlets?.map(o => o.name) || [],
          countries: updatedContact.countries?.map(c => c.name) || [],
          beats: updatedContact.beats?.map(b => b.name) || []
        }
      });
    }

    return NextResponse.json({ 
      message: 'Contact updated successfully',
      contact: updatedContact 
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

/**
 * DELETE /api/media-contacts/[id] - Delete contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Get contact details before deletion for activity logging
    const contactToDelete = await prisma.mediaContact.findUnique({
      where: { id },
      select: { name: true, email: true }
    });

    if (!contactToDelete) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Delete the contact
    await prisma.mediaContact.delete({
      where: { id }
    });

    // Log activity
    if (session.user.id) {
      const activityService = new ActivityTrackingService();
      await activityService.logActivity({
        type: 'delete',
        entity: 'media_contact',
        entityId: id,
        entityName: contactToDelete.name,
        userId: session.user.id,
        details: {
          email: contactToDelete.email
        }
      });
    }

    return NextResponse.json({ message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}