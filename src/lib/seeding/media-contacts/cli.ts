#!/usr/bin/env node

// Command-line interface for the media contacts seeding system

import { Command } from 'commander';
import { seedMediaContacts, seedMediaContactsFromCSV, exportMediaContactsToCSV } from './index';
import * as path from 'path';

const program = new Command();

program
  .name('media-contacts-seeder')
  .description('CLI tool for seeding media contacts database')
  .version('1.0.0');

program
  .command('seed')
  .description('Seed media contacts with specified parameters')
  .option('-r, --region <region>', 'Region code (ISO alpha-3)')
  .option('-c, --country <country>', 'Country name')
  .option('-n, --count <number>', 'Number of contacts to seed', '10')
  .option('-b, --beats <beats>', 'Comma-separated list of beats/categories')
  .option('-t, --types <types>', 'Comma-separated list of outlet types')
  .option('-l, --language <language>', 'Language code', 'en')
  .option('--include-email', 'Include email addresses', false)
  .option('--include-social', 'Include social profiles', false)
  .option('--verified-only', 'Only include contacts with verified emails', false)
  .action(async (options) => {
    try {
      const config = {
        region: options.region,
        country: options.country,
        count: parseInt(options.count, 10),
        categories: options.beats ? options.beats.split(',') : ['General'],
        outletTypes: options.types ? options.types.split(',') as any : ['general'],
        language: options.language,
        requirements: {
          includeEmail: options.includeEmail,
          includeSocialProfiles: options.includeSocial,
          verifiedEmailsOnly: options.verifiedOnly
        }
      };
      
      console.log('Seeding media contacts with configuration:', config);
      
      const result = await seedMediaContacts(config);
      
      console.log(`Seeding completed: ${result.successCount} contacts added, ${result.errorCount} errors`);
      
      if (result.errors.length > 0) {
        console.error('Errors:');
        result.errors.forEach(error => console.error(`- ${error}`));
      }
    } catch (error) {
      console.error('Error seeding media contacts:', error);
      process.exit(1);
    }
  });

program
  .command('import-csv')
  .description('Import media contacts from a CSV file')
  .argument('<file>', 'Path to CSV file')
  .action(async (filePath) => {
    try {
      // Resolve relative paths
      const resolvedPath = path.resolve(filePath);
      
      console.log(`Importing media contacts from CSV: ${resolvedPath}`);
      
      const result = await seedMediaContactsFromCSV(resolvedPath);
      
      console.log(`Import completed: ${result.successCount} contacts added, ${result.errorCount} errors`);
      
      if (result.errors.length > 0) {
        console.error('Errors:');
        result.errors.forEach(error => console.error(`- ${error}`));
      }
    } catch (error) {
      console.error('Error importing media contacts from CSV:', error);
      process.exit(1);
    }
  });

program
  .command('export-csv')
  .description('Export media contacts to a CSV file')
  .argument('<file>', 'Path to output CSV file')
  .option('-r, --region <region>', 'Filter by region')
  .option('-c, --country <country>', 'Filter by country')
  .option('-b, --beats <beats>', 'Filter by beats/categories')
  .action(async (filePath, options) => {
    try {
      // Resolve relative paths
      const resolvedPath = path.resolve(filePath);
      
      console.log(`Exporting media contacts to CSV: ${resolvedPath}`);
      
      const filterOptions = {
        region: options.region,
        country: options.country,
        beats: options.beats ? options.beats.split(',') : undefined
      };
      
      const result = await exportMediaContactsToCSV(resolvedPath, filterOptions);
      
      if (result.success) {
        console.log(`Export completed: ${result.count} contacts exported`);
      } else {
        console.error('Export failed:');
        result.errors.forEach(error => console.error(`- ${error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('Error exporting media contacts to CSV:', error);
      process.exit(1);
    }
  });

program
  .command('sample')
  .description('Seed database with sample contacts')
  .action(async () => {
    try {
      console.log('Seeding database with sample contacts...');
      
      const result = await seedMediaContacts({ count: 20 });
      
      console.log(`Sample seeding completed: ${result.successCount} contacts added, ${result.errorCount} errors`);
      
      if (result.errors.length > 0) {
        console.error('Errors:');
        result.errors.forEach(error => console.error(`- ${error}`));
      }
    } catch (error) {
      console.error('Error seeding sample contacts:', error);
      process.exit(1);
    }
  });

program.parse();