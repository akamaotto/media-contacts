#!/usr/bin/env tsx

/**
 * Fix Nigerian Business Media Contacts Country Relationships
 * 
 * This script fixes the missing country relationships for Nigerian journalists
 * that were created but not properly linked to Nigeria.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixNigerianContacts() {
  try {
    console.log('🔧 Fixing Nigerian media contacts country relationships...');

    // Get Nigeria country ID
    const nigeria = await prisma.countries.findUnique({
      where: { name: 'Nigeria' }
    });

    if (!nigeria) {
      throw new Error('Nigeria not found in countries table');
    }

    console.log(`✅ Found Nigeria: ${nigeria.id}`);

    // Get all Nigerian business journalists (BusinessDay and TechCabal)
    const nigerianContacts = await prisma.media_contacts.findMany({
      where: {
        OR: [
          { email: { contains: '@businessday.ng' } },
          { email: { contains: '@techcabal.com' } }
        ]
      },
      include: {
        countries: true,
        outlets: true
      }
    });

    console.log(`📊 Found ${nigerianContacts.length} Nigerian business journalists`);

    let updated = 0;
    let alreadyLinked = 0;

    for (const contact of nigerianContacts) {
      // Check if already linked to Nigeria
      const hasNigeria = contact.countries.some(c => c.id === nigeria.id);
      
      if (hasNigeria) {
        console.log(`✓ ${contact.name} already linked to Nigeria`);
        alreadyLinked++;
        continue;
      }

      // Connect to Nigeria
      await prisma.media_contacts.update({
        where: { id: contact.id },
        data: {
          countries: {
            connect: { id: nigeria.id }
          }
        }
      });

      console.log(`🔗 Connected ${contact.name} to Nigeria`);
      updated++;
    }

    // Verify the fix
    const verificationCount = await prisma.media_contacts.count({
      where: {
        countries: {
          some: { name: 'Nigeria' }
        }
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 RELATIONSHIP FIX SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Contacts updated: ${updated}`);
    console.log(`✓ Already linked: ${alreadyLinked}`);
    console.log(`🇳🇬 Total Nigerian contacts: ${verificationCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error fixing relationships:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute
fixNigerianContacts().catch(console.error);
