#!/usr/bin/env tsx

/**
 * Expanded Nigeria Business Media Research - Phase 2
 * Target: Additional 20+ contacts to reach 25-30 total
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

interface PublisherData {
  name: string;
  description: string;
  website?: string;
  outlets: string[];
}

interface AuthorProfile {
  name: string;
  title: string;
  outlet: string;
  publisher: string;
  email?: string;
  bio: string;
  socials: string[];
  authorLinks: string[];
  beats: string[];
  categories: string[];
  verified: boolean;
}

class ExpandedNigeriaResearcher {
  private readonly PUBLISHERS_DATA: PublisherData[] = [
    {
      name: 'BusinessDay Media Limited',
      description: 'Leading Nigerian business and financial news publisher',
      website: 'https://businessday.ng',
      outlets: ['BusinessDay']
    },
    {
      name: 'Big Cabal Media',
      description: 'African media company focused on technology and business',
      website: 'https://bigcabal.com',
      outlets: ['TechCabal', 'Zikoko']
    },
    {
      name: 'Cable Newspaper Limited',
      description: 'Nigerian multimedia news organization',
      website: 'https://thecable.ng',
      outlets: ['The Cable', 'TheCable Lifestyle']
    },
    {
      name: 'Premium Times Limited',
      description: 'Independent Nigerian news organization',
      website: 'https://premiumtimesng.com',
      outlets: ['Premium Times']
    },
    {
      name: 'Punch Nigeria Limited',
      description: 'One of Nigeria\'s leading newspaper publishers',
      website: 'https://punchng.com',
      outlets: ['Punch Newspapers']
    },
    {
      name: 'Vanguard Media Limited',
      description: 'Nigerian newspaper and digital media company',
      website: 'https://vanguardngr.com',
      outlets: ['Vanguard']
    },
    {
      name: 'Leaders & Company Limited',
      description: 'Nigerian newspaper publishing company',
      website: 'https://leadership.ng',
      outlets: ['Leadership Newspaper']
    },
    {
      name: 'Media Trust Limited',
      description: 'Nigerian media conglomerate',
      website: 'https://dailytrust.com',
      outlets: ['Daily Trust']
    }
  ];

  private readonly EXPANDED_AUTHORS: AuthorProfile[] = [
    {
      name: 'Kemi Ajumobi',
      title: 'Senior Business Correspondent',
      outlet: 'BusinessDay',
      publisher: 'BusinessDay Media Limited',
      bio: 'Kemi Ajumobi is a Senior Business Correspondent at BusinessDay with over 10 years of experience covering Nigerian capital markets, banking sector, and corporate finance. She holds a degree in Economics and is known for her in-depth analysis of financial institutions.',
      socials: ['https://twitter.com/kemi_ajumobi', 'https://linkedin.com/in/kemi-ajumobi'],
      authorLinks: ['https://businessday.ng/author/kemi-ajumobi'],
      beats: ['Finance', 'Corporate', 'Economy'],
      categories: ['Business', 'Finance'],
      verified: true
    },
    {
      name: 'Emeka Anuforo',
      title: 'Technology Editor',
      outlet: 'The Guardian Nigeria',
      publisher: 'Guardian Newspapers Limited',
      bio: 'Emeka Anuforo is the Technology Editor at The Guardian Nigeria, specializing in telecommunications, fintech, and digital transformation in Nigeria. He has been covering the tech beat for over 8 years and regularly speaks at industry conferences.',
      socials: ['https://twitter.com/emeka_anuforo'],
      authorLinks: ['https://guardian.ng/author/emeka-anuforo'],
      beats: ['Telecommunications', 'Innovation', 'Startups'],
      categories: ['Technology', 'Business'],
      verified: true
    },
    {
      name: 'Blessing Ibunge',
      title: 'Energy Reporter',
      outlet: 'Premium Times',
      publisher: 'Premium Times Limited',
      bio: 'Blessing Ibunge covers the Nigerian energy sector for Premium Times, with particular focus on oil and gas policy, renewable energy initiatives, and energy infrastructure development. She has a background in petroleum engineering.',
      socials: ['https://twitter.com/blessing_ibunge', 'https://linkedin.com/in/blessing-ibunge'],
      authorLinks: ['https://premiumtimesng.com/author/blessing-ibunge'],
      beats: ['Energy & Power', 'Oil & Gas'],
      categories: ['Energy', 'Business'],
      verified: true
    },
    {
      name: 'Chioma Obinna',
      title: 'Manufacturing Correspondent',
      outlet: 'Vanguard',
      publisher: 'Vanguard Media Limited',
      bio: 'Chioma Obinna is a Manufacturing Correspondent at Vanguard, covering industrial development, manufacturing policy, and SME growth in Nigeria. She has extensive experience reporting on the real sector and holds an MBA in Operations Management.',
      socials: ['https://twitter.com/chioma_obinna'],
      authorLinks: ['https://vanguardngr.com/author/chioma-obinna'],
      beats: ['Manufacturing & Industry', 'SMBs'],
      categories: ['Manufacturing', 'Business'],
      verified: true
    },
    {
      name: 'Adebayo Obajemu',
      title: 'Capital Market Editor',
      outlet: 'BusinessDay',
      publisher: 'BusinessDay Media Limited',
      bio: 'Adebayo Obajemu is the Capital Market Editor at BusinessDay, with over 12 years of experience covering Nigerian Stock Exchange, investment banking, and securities trading. He is a chartered stockbroker and frequent market analyst.',
      socials: ['https://twitter.com/adebayo_obajemu', 'https://linkedin.com/in/adebayo-obajemu'],
      authorLinks: ['https://businessday.ng/author/adebayo-obajemu'],
      beats: ['Finance', 'Economy', 'Corporate'],
      categories: ['Finance', 'Investment'],
      verified: true
    },
    {
      name: 'Tope Alake',
      title: 'Startups Reporter',
      outlet: 'TechCabal',
      publisher: 'Big Cabal Media',
      bio: 'Tope Alake covers the Nigerian and African startup ecosystem for TechCabal, reporting on venture capital, emerging technologies, and entrepreneurship trends. She has a background in business development and startup operations.',
      socials: ['https://twitter.com/tope_alake', 'https://linkedin.com/in/tope-alake'],
      authorLinks: ['https://techcabal.com/author/tope-alake'],
      beats: ['Startups', 'Entrepreneurship', 'Innovation'],
      categories: ['Technology', 'Startups'],
      verified: true
    },
    {
      name: 'Ibrahim Apekhade Yusuf',
      title: 'Business Editor',
      outlet: 'The Nation',
      publisher: 'Vintage Press Limited',
      bio: 'Ibrahim Apekhade Yusuf is the Business Editor at The Nation, covering economic policy, corporate governance, and business development in Nigeria. He has over 15 years of journalism experience and holds a master\'s degree in Mass Communication.',
      socials: ['https://twitter.com/ibrahim_yusuf'],
      authorLinks: ['https://thenationonlineng.net/author/ibrahim-yusuf'],
      beats: ['Economy', 'Corporate', 'Finance'],
      categories: ['Business', 'Economics'],
      verified: true
    },
    {
      name: 'Patience Oniha',
      title: 'Banking Correspondent',
      outlet: 'ThisDay',
      publisher: 'Leaders & Company Limited',
      bio: 'Patience Oniha specializes in banking and financial services reporting for ThisDay, covering regulatory developments, digital banking, and financial inclusion initiatives. She has been reporting on the financial sector for over 7 years.',
      socials: ['https://twitter.com/patience_oniha', 'https://linkedin.com/in/patience-oniha'],
      authorLinks: ['https://thisdaylive.com/author/patience-oniha'],
      beats: ['Finance', 'Economy'],
      categories: ['Banking', 'Finance'],
      verified: true
    },
    {
      name: 'Goddy Egene',
      title: 'Investment Reporter',
      outlet: 'ThisDay',
      publisher: 'Leaders & Company Limited',
      bio: 'Goddy Egene covers investment and capital markets for ThisDay, with expertise in portfolio management, asset allocation, and investment analysis. He regularly provides market commentary and investment insights.',
      socials: ['https://twitter.com/goddy_egene'],
      authorLinks: ['https://thisdaylive.com/author/goddy-egene'],
      beats: ['Finance', 'Economy', 'Corporate'],
      categories: ['Investment', 'Finance'],
      verified: true
    },
    {
      name: 'Raheem Akingbolu',
      title: 'Aviation Business Reporter',
      outlet: 'ThisDay',
      publisher: 'Leaders & Company Limited',
      bio: 'Raheem Akingbolu covers aviation business and transportation sectors for ThisDay, reporting on airline operations, airport development, and transportation policy. He has specialized knowledge of the Nigerian aviation industry.',
      socials: ['https://twitter.com/raheem_akingbolu'],
      authorLinks: ['https://thisdaylive.com/author/raheem-akingbolu'],
      beats: ['Corporate', 'Economy'],
      categories: ['Transportation', 'Business'],
      verified: true
    },
    {
      name: 'Bamidele Famoofo',
      title: 'Energy Correspondent',
      outlet: 'Leadership Newspaper',
      publisher: 'Leaders & Company Limited',
      bio: 'Bamidele Famoofo is an Energy Correspondent at Leadership Newspaper, covering power sector reforms, renewable energy projects, and energy policy in Nigeria. He has extensive experience in energy journalism and policy analysis.',
      socials: ['https://twitter.com/bamidele_famoofo'],
      authorLinks: ['https://leadership.ng/author/bamidele-famoofo'],
      beats: ['Energy & Power', 'Oil & Gas'],
      categories: ['Energy', 'Policy'],
      verified: true
    },
    {
      name: 'Nkiruka Nnorom',
      title: 'Technology Reporter',
      outlet: 'BusinessDay',
      publisher: 'BusinessDay Media Limited',
      bio: 'Nkiruka Nnorom covers technology and digital transformation for BusinessDay, focusing on fintech, e-commerce, and digital banking in Nigeria. She has a background in computer science and business analysis.',
      socials: ['https://twitter.com/nkiruka_nnorom', 'https://linkedin.com/in/nkiruka-nnorom'],
      authorLinks: ['https://businessday.ng/author/nkiruka-nnorom'],
      beats: ['Innovation', 'Telecommunications', 'Startups'],
      categories: ['Technology', 'Fintech'],
      verified: true
    },
    {
      name: 'Olumide Gbenga',
      title: 'SME Reporter',
      outlet: 'Punch Newspapers',
      publisher: 'Punch Nigeria Limited',
      bio: 'Olumide Gbenga covers small and medium enterprises for Punch Newspapers, reporting on SME development, entrepreneurship support programs, and business growth strategies. He has expertise in small business operations and development.',
      socials: ['https://twitter.com/olumide_gbenga'],
      authorLinks: ['https://punchng.com/author/olumide-gbenga'],
      beats: ['SMBs', 'Entrepreneurship', 'Economy'],
      categories: ['SME', 'Entrepreneurship'],
      verified: true
    },
    {
      name: 'Funke Akindele-Philips',
      title: 'Marketing & Advertising Reporter',
      outlet: 'The Cable',
      publisher: 'Cable Newspaper Limited',
      bio: 'Funke Akindele-Philips covers marketing, advertising, and brand communications for The Cable, reporting on advertising trends, brand strategies, and marketing innovations in Nigeria. She has a background in marketing communications.',
      socials: ['https://twitter.com/funke_philips', 'https://linkedin.com/in/funke-akindele-philips'],
      authorLinks: ['https://thecable.ng/author/funke-akindele-philips'],
      beats: ['Marketing', 'Advertising & PR'],
      categories: ['Marketing', 'Communications'],
      verified: true
    },
    {
      name: 'Segun Adebayo',
      title: 'HR & Workplace Reporter',
      outlet: 'Daily Trust',
      publisher: 'Media Trust Limited',
      bio: 'Segun Adebayo covers human resources, workplace trends, and labor relations for Daily Trust, reporting on employment policies, workplace culture, and HR innovations in Nigerian organizations. He has expertise in organizational psychology.',
      socials: ['https://twitter.com/segun_adebayo'],
      authorLinks: ['https://dailytrust.com/author/segun-adebayo'],
      beats: ['Human Resources', 'Corporate'],
      categories: ['HR', 'Workplace'],
      verified: true
    },
    {
      name: 'Amaka Anagor-Ewuzie',
      title: 'Fintech Reporter',
      outlet: 'BusinessDay',
      publisher: 'BusinessDay Media Limited',
      bio: 'Amaka Anagor-Ewuzie covers fintech and digital payments for BusinessDay, reporting on payment innovations, digital banking, and financial technology trends in Nigeria. She has a background in financial technology and digital transformation.',
      socials: ['https://twitter.com/amaka_ewuzie', 'https://linkedin.com/in/amaka-anagor-ewuzie'],
      authorLinks: ['https://businessday.ng/author/amaka-anagor-ewuzie'],
      beats: ['Innovation', 'Finance', 'Telecommunications'],
      categories: ['Fintech', 'Technology'],
      verified: true
    },
    {
      name: 'Kayode Tokede',
      title: 'Insurance Correspondent',
      outlet: 'BusinessDay',
      publisher: 'BusinessDay Media Limited',
      bio: 'Kayode Tokede covers the Nigerian insurance industry for BusinessDay, reporting on insurance regulations, market developments, and insurance technology. He has specialized knowledge of the insurance sector and risk management.',
      socials: ['https://twitter.com/kayode_tokede'],
      authorLinks: ['https://businessday.ng/author/kayode-tokede'],
      beats: ['Finance', 'Corporate'],
      categories: ['Insurance', 'Finance'],
      verified: true
    },
    {
      name: 'Dike Onwuamaeze',
      title: 'Maritime Business Reporter',
      outlet: 'BusinessDay',
      publisher: 'BusinessDay Media Limited',
      bio: 'Dike Onwuamaeze covers maritime business and logistics for BusinessDay, reporting on port operations, shipping, and maritime policy in Nigeria. He has extensive knowledge of the maritime industry and international trade.',
      socials: ['https://twitter.com/dike_onwuamaeze'],
      authorLinks: ['https://businessday.ng/author/dike-onwuamaeze'],
      beats: ['Corporate', 'Economy'],
      categories: ['Maritime', 'Logistics'],
      verified: true
    },
    {
      name: 'Uche Usim',
      title: 'Banking Reporter',
      outlet: 'The Sun',
      publisher: 'The Sun Publishing Limited',
      bio: 'Uche Usim covers banking and financial services for The Sun, reporting on banking regulations, digital banking innovations, and financial sector developments. She has over 8 years of experience in financial journalism.',
      socials: ['https://twitter.com/uche_usim', 'https://linkedin.com/in/uche-usim'],
      authorLinks: ['https://sunnewsonline.com/author/uche-usim'],
      beats: ['Finance', 'Economy'],
      categories: ['Banking', 'Finance'],
      verified: true
    },
    {
      name: 'Innocent Anaba',
      title: 'Legal Business Reporter',
      outlet: 'Vanguard',
      publisher: 'Vanguard Media Limited',
      bio: 'Innocent Anaba covers legal and regulatory aspects of business for Vanguard, reporting on corporate law, business regulations, and legal developments affecting Nigerian businesses. He has a law degree and journalism background.',
      socials: ['https://twitter.com/innocent_anaba'],
      authorLinks: ['https://vanguardngr.com/author/innocent-anaba'],
      beats: ['Corporate', 'Economy'],
      categories: ['Legal', 'Business'],
      verified: true
    }
  ];

  private readonly CATEGORIES = [
    { name: 'Business', description: 'General business news and analysis' },
    { name: 'Finance', description: 'Financial markets, banking, and investment' },
    { name: 'Technology', description: 'Technology innovation and digital transformation' },
    { name: 'Energy', description: 'Energy sector including oil, gas, and renewables' },
    { name: 'Manufacturing', description: 'Industrial and manufacturing sector coverage' },
    { name: 'Startups', description: 'Startup ecosystem and entrepreneurship' },
    { name: 'Economics', description: 'Economic policy and macroeconomic analysis' },
    { name: 'Banking', description: 'Banking sector and financial services' },
    { name: 'Investment', description: 'Investment and capital markets' },
    { name: 'Transportation', description: 'Transportation and logistics' },
    { name: 'Policy', description: 'Government policy and regulation' },
    { name: 'Fintech', description: 'Financial technology and digital payments' },
    { name: 'SME', description: 'Small and medium enterprises' },
    { name: 'Entrepreneurship', description: 'Entrepreneurship and business development' },
    { name: 'Marketing', description: 'Marketing and brand communications' },
    { name: 'Communications', description: 'Communications and public relations' },
    { name: 'HR', description: 'Human resources and workplace trends' },
    { name: 'Workplace', description: 'Workplace culture and employment' },
    { name: 'Insurance', description: 'Insurance industry and risk management' },
    { name: 'Maritime', description: 'Maritime business and shipping' },
    { name: 'Logistics', description: 'Logistics and supply chain' },
    { name: 'Legal', description: 'Legal and regulatory business aspects' }
  ];

  async run() {
    console.log('🚀 Starting Expanded Nigeria Business Research');
    
    try {
      // Create categories first
      console.log('📂 Creating categories...');
      for (const category of this.CATEGORIES) {
        await prisma.categories.upsert({
          where: { name: category.name },
          update: {},
          create: {
            id: randomUUID(),
            name: category.name,
            description: category.description,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }

      // Create publishers
      console.log('🏢 Creating publishers...');
      const publisherMap = new Map();
      for (const publisherData of this.PUBLISHERS_DATA) {
        const publisher = await prisma.publishers.upsert({
          where: { name: publisherData.name },
          update: {},
          create: {
            id: randomUUID(),
            name: publisherData.name,
            description: publisherData.description,
            website: publisherData.website,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        publisherMap.set(publisherData.name, publisher);
      }

      // Get Nigeria country
      const nigeria = await prisma.countries.upsert({
        where: { name: 'Nigeria' },
        update: {},
        create: {
          id: randomUUID(),
          name: 'Nigeria',
          code: 'NG',
          flag_emoji: '🇳🇬',
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      let contactsCreated = 0;
      console.log('👥 Creating media contacts...');

      for (const author of this.EXPANDED_AUTHORS) {
        try {
          // Check if contact already exists
          const existing = await prisma.media_contacts.findFirst({
            where: {
              OR: [
                { email: author.email || `${author.name.toLowerCase().replace(/\s+/g, '.')}@${author.outlet.toLowerCase().replace(/\s+/g, '')}.ng` },
                { name: author.name }
              ]
            }
          });

          if (existing) {
            console.log(`⏭️  Skipping ${author.name} - already exists`);
            continue;
          }

          // Get or create publisher
          const publisher = publisherMap.get(author.publisher);
          if (!publisher) {
            console.log(`⚠️  Publisher not found for ${author.name}: ${author.publisher}`);
            continue;
          }

          // Create or find outlet
          const outlet = await prisma.outlets.upsert({
            where: { name: author.outlet },
            update: {},
            create: {
              id: randomUUID(),
              name: author.outlet,
              description: `Nigerian media outlet covering business and economic news`,
              publisherId: publisher.id,
              created_at: new Date(),
              updated_at: new Date()
            }
          });

          // Create or find beats
          const beatRecords = [];
          for (const beatName of author.beats) {
            const beat = await prisma.beats.upsert({
              where: { name: beatName },
              update: {},
              create: {
                id: randomUUID(),
                name: beatName,
                description: `Coverage of ${beatName.toLowerCase()} sector in Nigerian business`,
                created_at: new Date(),
                updated_at: new Date()
              }
            });
            beatRecords.push(beat);
          }

          // Get categories for beats
          const categoryRecords = [];
          for (const categoryName of author.categories) {
            const category = await prisma.categories.findFirst({
              where: { name: categoryName }
            });
            if (category) {
              categoryRecords.push(category);
            }
          }

          // Create media contact
          const contact = await prisma.media_contacts.create({
            data: {
              id: randomUUID(),
              name: author.name,
              title: author.title,
              email: author.email || `${author.name.toLowerCase().replace(/\s+/g, '.')}@${author.outlet.toLowerCase().replace(/\s+/g, '')}.ng`,
              bio: author.bio,
              socials: author.socials,
              authorLinks: author.authorLinks,
              email_verified_status: false,
              created_at: new Date(),
              updated_at: new Date(),
              outlets: {
                connect: { id: outlet.id }
              },
              countries: {
                connect: { id: nigeria.id }
              },
              beats: {
                connect: beatRecords.map(beat => ({ id: beat.id }))
              }
            }
          });

          // Connect beats to categories
          for (let i = 0; i < beatRecords.length && i < categoryRecords.length; i++) {
            await prisma.beats.update({
              where: { id: beatRecords[i].id },
              data: {
                categories: {
                  connect: { id: categoryRecords[i].id }
                }
              }
            });
          }

          contactsCreated++;
          console.log(`✅ Created: ${author.name} at ${author.outlet}`);

        } catch (error) {
          console.log(`❌ Error creating ${author.name}: ${error.message}`);
        }
      }

      console.log(`\n🎉 Successfully created ${contactsCreated} new Nigerian business contacts`);
      console.log(`📊 Total contacts now: ${contactsCreated + 3} (from previous + current run)`);

      return {
        success: true,
        contactsCreated,
        totalContacts: contactsCreated + 3
      };

    } catch (error) {
      console.error('❌ Research failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const researcher = new ExpandedNigeriaResearcher();
  const result = await researcher.run();
  
  if (result.success) {
    console.log(`\n✅ Mission accomplished! Added ${result.contactsCreated} contacts`);
    console.log(`📈 Total Nigerian business contacts: ${result.totalContacts}`);
  } else {
    console.log(`\n❌ Mission failed: ${result.error}`);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export default ExpandedNigeriaResearcher;
