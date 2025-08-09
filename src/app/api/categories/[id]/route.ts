import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateCategory, deleteCategory } from '@/backend/categories/actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Categories API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to update categories' },
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
    const { name, description, color, beatIds } = body;
    
    console.log('Categories API: Update data:', { name, description, color, beatIds });

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Update category using the server action
    const updatedCategory = await updateCategory(
      params.id,
      {
        name: name.trim(),
        description: description?.trim() || undefined,
        color: color?.trim() || undefined,
      },
      beatIds
    );

    console.log('Categories API: Successfully updated category:', updatedCategory.id);

    return NextResponse.json({
      message: 'Category updated successfully',
      category: updatedCategory
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    // Handle specific error messages from backend
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
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
      { error: 'Failed to update category - Please check your input and try again' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Categories API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to delete categories' },
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
    console.log('Categories API: Deleting category:', params.id);

    // Delete category using the server action
    const result = await deleteCategory(params.id);

    console.log('Categories API: Successfully deleted category:', params.id);

    return NextResponse.json({
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    
    // Handle specific error messages from backend
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to delete category - Please try again' },
      { status: 500 }
    );
  }
}