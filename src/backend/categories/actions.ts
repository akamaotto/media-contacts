"use server";

import { prisma } from "@/lib/prisma";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  beatCount?: number;
  outletCount?: number;
  beats?: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  outlets?: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
}

/**
 * Server action to fetch all categories from the database with beat and outlet counts
 * @returns Array of Category objects with counts and relationships
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    console.log('Fetching all categories from database with beat and outlet counts...');
    
    // Validate Prisma client availability
    if (!prisma) {
      throw new Error('Prisma client is not available');
    }
    
    const categories = await prisma.category.findMany({
      include: {
        beats: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    // Transform data to include counts
    const transformedCategories: Category[] = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      beatCount: category.beats.length,
      outletCount: category.outlets.length,
      beats: category.beats,
      outlets: category.outlets,
    }));
    
    console.log(`Successfully fetched ${transformedCategories.length} categories from database`);
    return transformedCategories;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    // Return empty array as fallback
    return [];
  }
}

/**
 * Server action to create a new category in database
 * @param categoryData - Category data to create
 * @returns Created Category object
 */
export async function createCategory(categoryData: { 
  name: string; 
  description?: string; 
  color?: string; 
}): Promise<Category> {
  try {
    console.log('Creating category:', categoryData);
    
    const newCategory = await prisma.category.create({
      data: {
        name: categoryData.name.trim(),
        description: categoryData.description?.trim() || null,
        color: categoryData.color?.trim() || null,
      },
      include: {
        beats: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
    });
    
    const transformedCategory: Category = {
      id: newCategory.id,
      name: newCategory.name,
      description: newCategory.description,
      color: newCategory.color,
      beatCount: newCategory.beats.length,
      outletCount: newCategory.outlets.length,
      beats: newCategory.beats,
      outlets: newCategory.outlets,
    };
    
    console.log('Successfully created category:', newCategory.id);
    return transformedCategory;
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Category with name "${categoryData.name}" already exists`);
    }
    
    throw new Error('Failed to create category');
  }
}

/**
 * Server action to update an existing category in database
 * @param id - Category ID to update
 * @param categoryData - Updated category data
 * @returns Updated Category object
 */
export async function updateCategory(
  id: string, 
  categoryData: { name: string; description?: string; color?: string; }
): Promise<Category> {
  try {
    console.log('Updating category:', id, categoryData);
    
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: categoryData.name.trim(),
        description: categoryData.description?.trim() || null,
        color: categoryData.color?.trim() || null,
      },
      include: {
        beats: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
    });
    
    const transformedCategory: Category = {
      id: updatedCategory.id,
      name: updatedCategory.name,
      description: updatedCategory.description,
      color: updatedCategory.color,
      beatCount: updatedCategory.beats.length,
      outletCount: updatedCategory.outlets.length,
      beats: updatedCategory.beats,
      outlets: updatedCategory.outlets,
    };
    
    console.log('Successfully updated category:', updatedCategory.id);
    return transformedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error(`Category with name "${categoryData.name}" already exists`);
    }
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new Error('Category not found');
    }
    
    throw new Error('Failed to update category');
  }
}

/**
 * Server action to delete a category from database
 * @param id - Category ID to delete
 * @returns Success message
 */
export async function deleteCategory(id: string): Promise<{ message: string }> {
  try {
    console.log('Deleting category:', id);
    
    await prisma.category.delete({
      where: { id },
    });
    
    console.log('Successfully deleted category:', id);
    return { message: 'Category deleted successfully' };
  } catch (error) {
    console.error('Error deleting category:', error);
    
    // Handle not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      throw new Error('Category not found');
    }
    
    throw new Error('Failed to delete category');
  }
}

/**
 * Search for categories by name
 * @param query The search query string
 * @returns Array of matching categories
 */
export async function searchCategories(query: string): Promise<Category[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        beats: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        outlets: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
      orderBy: {
        name: 'asc',
      },
      take: 10,
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      beatCount: category.beats.length,
      outletCount: category.outlets.length,
      beats: category.beats,
      outlets: category.outlets,
    }));
  } catch (error) {
    console.error('Error searching categories:', error);
    return [];
  }
}
