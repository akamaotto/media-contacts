import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllCategories, createCategory } from '@/backend/categories/actions';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Categories API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Categories API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to create categories' },
        { status: 401 }
      );
    }

    if (!session.user?.id) {
      console.error('Categories API: Session exists but no user ID');
      return NextResponse.json(
        { error: 'Invalid session - Please log in again' },
        { status: 401 }
      );
    }

    console.log('Categories API: Authenticated user:', session.user.email);

    const body = await request.json();
    const { name, description, color } = body;

    console.log('Categories API: Request data:', { name, description, color });

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Validate color if provided
    if (color && typeof color !== 'string') {
      return NextResponse.json(
        { error: 'Color must be a string' },
        { status: 400 }
      );
    }

    // Create category in database
    const newCategory = await createCategory({
      name: name.trim(),
      description: description?.trim() || undefined,
      color: color?.trim() || undefined,
    });

    console.log('Categories API: Successfully created category:', newCategory.id);

    return NextResponse.json({
      message: 'Category created successfully',
      category: newCategory
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Handle specific error messages from backend
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
      
      if (error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database error - Please try again' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create category - Please check your input and try again' },
      { status: 500 }
    );
  }
}