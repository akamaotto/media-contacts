import { prisma } from '@/lib/prisma';

/**
 * Seed initial categories for the media contacts system
 * These categories represent common editorial themes in media organizations
 */
export async function seedCategories() {
  console.log('🌱 Seeding initial categories...');

  const initialCategories = [
    {
      name: 'Technology',
      description: 'Technology news, software, hardware, AI, and digital innovation',
      color: '#3B82F6', // Blue
    },
    {
      name: 'Business',
      description: 'Business news, finance, economics, markets, and corporate coverage',
      color: '#10B981', // Green
    },
    {
      name: 'Health',
      description: 'Healthcare, medical research, wellness, and public health coverage',
      color: '#EF4444', // Red
    },
    {
      name: 'Politics',
      description: 'Political news, government, policy, and public affairs',
      color: '#8B5CF6', // Purple
    },
    {
      name: 'Science',
      description: 'Scientific research, discoveries, climate, and environmental coverage',
      color: '#06B6D4', // Cyan
    },
    {
      name: 'Entertainment',
      description: 'Entertainment industry, media, culture, and lifestyle coverage',
      color: '#F59E0B', // Amber
    },
    {
      name: 'Sports',
      description: 'Sports coverage, athletics, and recreational activities',
      color: '#84CC16', // Lime
    },
    {
      name: 'Education',
      description: 'Education news, academic research, and learning institutions',
      color: '#6366F1', // Indigo
    },
  ];

  try {
    // Check if categories already exist
    const existingCategories = await prisma.category.findMany();
    
    if (existingCategories.length > 0) {
      console.log(`📋 Found ${existingCategories.length} existing categories, skipping seed`);
      return existingCategories;
    }

    // Create categories
    const createdCategories = [];
    for (const categoryData of initialCategories) {
      try {
        const category = await prisma.category.create({
          data: categoryData,
        });
        createdCategories.push(category);
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        console.warn(`⚠️ Category "${categoryData.name}" might already exist:`, error);
      }
    }

    console.log(`🎉 Successfully seeded ${createdCategories.length} categories`);
    return createdCategories;
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

/**
 * Auto-categorize existing beats based on common patterns
 * This is a helper function to migrate existing beats to categories
 */
export async function autoCategorizeBeat(beatName: string): Promise<string[]> {
  const name = beatName.toLowerCase();
  const categories: string[] = [];

  // Technology patterns
  if (name.includes('tech') || name.includes('ai') || name.includes('software') || 
      name.includes('digital') || name.includes('cyber') || name.includes('data') ||
      name.includes('cloud') || name.includes('mobile') || name.includes('web')) {
    categories.push('Technology');
  }

  // Business patterns
  if (name.includes('business') || name.includes('finance') || name.includes('market') ||
      name.includes('economy') || name.includes('startup') || name.includes('venture') ||
      name.includes('investment') || name.includes('corporate') || name.includes('trade')) {
    categories.push('Business');
  }

  // Health patterns
  if (name.includes('health') || name.includes('medical') || name.includes('pharma') ||
      name.includes('wellness') || name.includes('medicine') || name.includes('hospital') ||
      name.includes('drug') || name.includes('biotech')) {
    categories.push('Health');
  }

  // Politics patterns
  if (name.includes('politic') || name.includes('government') || name.includes('policy') ||
      name.includes('election') || name.includes('congress') || name.includes('senate') ||
      name.includes('white house') || name.includes('regulation')) {
    categories.push('Politics');
  }

  // Science patterns
  if (name.includes('science') || name.includes('research') || name.includes('climate') ||
      name.includes('environment') || name.includes('energy') || name.includes('space') ||
      name.includes('physics') || name.includes('chemistry') || name.includes('biology')) {
    categories.push('Science');
  }

  // Entertainment patterns
  if (name.includes('entertainment') || name.includes('media') || name.includes('film') ||
      name.includes('music') || name.includes('celebrity') || name.includes('culture') ||
      name.includes('arts') || name.includes('gaming')) {
    categories.push('Entertainment');
  }

  // Sports patterns
  if (name.includes('sport') || name.includes('football') || name.includes('basketball') ||
      name.includes('baseball') || name.includes('soccer') || name.includes('olympic') ||
      name.includes('athlete') || name.includes('fitness')) {
    categories.push('Sports');
  }

  // Education patterns
  if (name.includes('education') || name.includes('school') || name.includes('university') ||
      name.includes('college') || name.includes('academic') || name.includes('learning') ||
      name.includes('student') || name.includes('teacher')) {
    categories.push('Education');
  }

  // Default to Business if no specific category found
  if (categories.length === 0) {
    categories.push('Business');
  }

  return categories;
}

/**
 * Migrate existing beats to categories
 */
export async function migrateBeatsToCategories() {
  console.log('🔄 Migrating existing beats to categories...');

  try {
    // Ensure categories exist
    await seedCategories();

    // Get all existing beats
    const beats = await prisma.beat.findMany({
      include: {
        categories: true,
      },
    });

    // Get all categories for lookup
    const categories = await prisma.category.findMany();
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]));

    let migratedCount = 0;

    for (const beat of beats) {
      // Skip if beat already has categories
      if (beat.categories.length > 0) {
        console.log(`⏭️ Beat "${beat.name}" already has categories, skipping`);
        continue;
      }

      // Auto-categorize based on beat name
      const suggestedCategoryNames = await autoCategorizeBeat(beat.name);
      const categoryIds = suggestedCategoryNames
        .map(name => categoryMap.get(name))
        .filter(id => id !== undefined) as string[];

      if (categoryIds.length > 0) {
        try {
          await prisma.beat.update({
            where: { id: beat.id },
            data: {
              categories: {
                connect: categoryIds.map(id => ({ id })),
              },
            },
          });
          
          console.log(`✅ Migrated beat "${beat.name}" to categories: ${suggestedCategoryNames.join(', ')}`);
          migratedCount++;
        } catch (error) {
          console.warn(`⚠️ Failed to migrate beat "${beat.name}":`, error);
        }
      }
    }

    console.log(`🎉 Successfully migrated ${migratedCount} beats to categories`);
    return migratedCount;
  } catch (error) {
    console.error('❌ Error migrating beats to categories:', error);
    throw error;
  }
}
