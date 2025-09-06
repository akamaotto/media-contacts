/**
 * Validation utilities for region and country data integrity
 * This module applies Rust-inspired principles including:
 * - Explicit type handling
 * - Comprehensive validation
 * - Proper handling of potentially undefined values
 * - Clear documentation
 * - Fail-fast validation approach
 */

import type { PrismaClient } from '@prisma/client';

/**
 * RegionValidationResult represents the output of a validation operation
 * with explicit success/failure indicators and detailed error information
 */
interface RegionValidationResult {
  integrityPassed: boolean;
  missingRegionCodes: string[];
  databaseIntegrity: {
    regionsInDb: number;
    missingInDb: string[];
    hasAllRegions: boolean;
  };
  normalizationIssues: {
    caseDiscrepancies: boolean;
    whitespaceDiscrepancies: boolean;
    examples: Array<{original: string, normalized: string}>;
  };
  detailedReport: string;
}

// Type definitions for region and country data structures
interface Region {
  code: string;
  name: string;
  category: string;
  parentCode?: string;
  description?: string;
}

interface Country {
  code: string;
  name: string;
  continent_code?: string;
  subregion?: string[];
  region?: string[];
  [key: string]: any;
}

/**
 * Normalizes a region code by:
 * 1. Removing all whitespace
 * 2. Converting to uppercase
 * 3. Removing any special characters
 * 
 * @param code - The region code to normalize
 * @returns The normalized region code or undefined if input is null/undefined
 */
export function normalizeRegionCode(code: string | null | undefined): string | undefined {
  if (code === null || code === undefined) {
    return undefined;
  }
  
  // Strip whitespace and convert to uppercase
  return code.trim().toUpperCase();
}

/**
 * Validates the integrity of region-country relationships by checking:
 * 1. All region codes referenced by countries exist in region data
 * 2. Region codes are properly normalized
 * 3. All regions exist in the database
 * 
 * @param prisma - PrismaClient instance for database queries
 * @param countrySourceData - Array of country data objects
 * @param regionSourceData - Array of region data objects
 * @returns A detailed validation result with explicit success/failure indicators
 */
export async function validateRegionCountryIntegrity(
  prisma: PrismaClient,
  countrySourceData: Country[],
  regionSourceData: Region[]
): Promise<RegionValidationResult> {
  console.log('\n[VALIDATION] Running region-country integrity validation...');
  
  // Initialize validation state
  const referencedRegionCodes = new Set<string>();
  const missingRegionCodes = new Set<string>();
  const normalizationIssues: {
    caseDiscrepancies: boolean;
    whitespaceDiscrepancies: boolean;
    examples: Array<{original: string, normalized: string}>;
  } = {
    caseDiscrepancies: false,
    whitespaceDiscrepancies: false,
    examples: []
  };
  
  // Create normalized map of region codes for efficient lookup
  const availableRegionCodes = new Map<string, string>();
  for (const region of regionSourceData) {
    const originalCode = region.code;
    const normalizedCode = normalizeRegionCode(originalCode);
    
    if (normalizedCode) {
      availableRegionCodes.set(normalizedCode, originalCode);
      
      // Check for normalization issues
      if (originalCode !== normalizedCode) {
        if (originalCode.trim() !== originalCode) {
          normalizationIssues.whitespaceDiscrepancies = true;
        }
        if (originalCode.toUpperCase() !== originalCode) {
          normalizationIssues.caseDiscrepancies = true;
        }
        
        if (normalizationIssues.examples.length < 5) {
          normalizationIssues.examples.push({
            original: originalCode,
            normalized: normalizedCode
          });
        }
      }
    }
  }
  
  console.log(`[VALIDATION] Total available region codes in source data: ${availableRegionCodes.size}`);
  
  // Detailed validation results to build report
  const detailedResults: string[] = [];
  
  // Validate each country's region references
  for (const country of countrySourceData) {
    const countryName = country.name || 'Unknown';
    const countryCode = country.code || 'Unknown';
    const countryMissingCodes: string[] = [];
    
    // Process all types of region references a country might have
    const processRegionCode = (code: string | null | undefined, type: string) => {
      if (code === null || code === undefined) return;
      
      const normalizedCode = normalizeRegionCode(code);
      if (!normalizedCode) return;
      
      referencedRegionCodes.add(normalizedCode);
      
      if (!availableRegionCodes.has(normalizedCode)) {
        countryMissingCodes.push(normalizedCode);
        missingRegionCodes.add(normalizedCode);
        detailedResults.push(`Country ${countryName} (${countryCode}) references unknown ${type} code: ${normalizedCode}`);
      }
    };
    
    // Process continent code
    if (country.continent_code) {
      processRegionCode(country.continent_code, 'continent');
    }
    
    // Process subregion codes
    if (Array.isArray(country.subregion)) {
      for (const code of country.subregion) {
        processRegionCode(code, 'subregion');
      }
    } else if (country.subregion) {
      processRegionCode(country.subregion as unknown as string, 'subregion');
    }
    
    // Process region codes
    if (Array.isArray(country.region)) {
      for (const code of country.region) {
        processRegionCode(code, 'region');
      }
    } else if (country.region) {
      processRegionCode(country.region as unknown as string, 'region');
    }
    
    // Report country-specific issues
    if (countryMissingCodes.length > 0) {
      detailedResults.push(`Country ${countryName} (${countryCode}) is missing ${countryMissingCodes.length} regions: ${countryMissingCodes.join(', ')}`);
    }
  }
  
  // Check database integrity - use explicit type casting to avoid PrismaClient property access error
  const dbRegions = await (prisma as any).region?.findMany() || [];
  const dbRegionCodes = new Map<string, string>();
  
  for (const region of dbRegions) {
    const normalizedCode = normalizeRegionCode(region.code);
    if (normalizedCode) {
      dbRegionCodes.set(normalizedCode, region.code);
    }
  }
  
  // Find regions missing from database
  const missingInDb = Array.from(availableRegionCodes.keys())
    .filter(code => !dbRegionCodes.has(code));
    
  // Generate detailed report
  const dbIntegrityStatus = missingInDb.length === 0 ? 
    'PASSED: All regions exist in database' : 
    `FAILED: ${missingInDb.length} regions are missing from database`;
    
  const normalizationStatus = 
    !normalizationIssues.caseDiscrepancies && !normalizationIssues.whitespaceDiscrepancies ?
    'PASSED: All region codes properly normalized' :
    'FAILED: Normalization issues detected in region codes';
    
  const overallStatus = missingRegionCodes.size === 0 && missingInDb.length === 0 ? 
    'PASSED: All validations successful' : 
    'FAILED: Validation issues detected';
    
  // Build comprehensive report
  const report = [
    '===== REGION-COUNTRY VALIDATION REPORT =====',
    overallStatus,
    '',
    '--- DATA INTEGRITY ---',
    `Referenced Region Codes: ${referencedRegionCodes.size}`,
    `Missing Region Codes: ${missingRegionCodes.size}`,
    missingRegionCodes.size > 0 ? `Missing Codes: ${Array.from(missingRegionCodes).join(', ')}` : 'No missing codes',
    '',
    '--- DATABASE INTEGRITY ---',
    `Regions in Database: ${dbRegions.length}`,
    `Regions in Source Data: ${availableRegionCodes.size}`,
    dbIntegrityStatus,
    missingInDb.length > 0 ? `Missing from DB: ${missingInDb.join(', ')}` : 'No missing regions',
    '',
    '--- NORMALIZATION ---',
    normalizationStatus,
    `Case Discrepancies: ${normalizationIssues.caseDiscrepancies ? 'Yes' : 'No'}`,
    `Whitespace Issues: ${normalizationIssues.whitespaceDiscrepancies ? 'Yes' : 'No'}`,
    normalizationIssues.examples.length > 0 ? 
      `Examples: ${normalizationIssues.examples.map(ex => `${ex.original} -> ${ex.normalized}`).join(', ')}` : 
      'No examples',
    '',
    '--- DETAILED ISSUES ---',
    ...detailedResults,
    '==========================================='
  ].join('\n');
  
  // Print summary report
  console.log(`[VALIDATION SUMMARY]\n${report}`);
  
  // Return structured result for programmatic use
  return {
    integrityPassed: missingRegionCodes.size === 0,
    missingRegionCodes: Array.from(missingRegionCodes),
    databaseIntegrity: {
      regionsInDb: dbRegions.length,
      missingInDb,
      hasAllRegions: missingInDb.length === 0
    },
    normalizationIssues,
    detailedReport: report
  };
}
