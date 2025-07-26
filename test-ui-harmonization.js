#!/usr/bin/env node

/**
 * UI Harmonization Integration Test Script
 * 
 * This script performs comprehensive testing of the harmonized UI patterns
 * to ensure consistency across all features and validate requirements.
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logTest(name, status, message = '') {
  const result = { name, status, message };
  testResults.details.push(result);
  
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else if (status === 'FAIL') {
    testResults.failed++;
    console.log(`❌ ${name}: ${message}`);
  } else if (status === 'WARN') {
    testResults.warnings++;
    console.log(`⚠️  ${name}: ${message}`);
  }
  
  if (message) {
    console.log(`   ${message}`);
  }
}

function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function testFileNamingConsistency() {
  console.log('\n🔍 Testing File Naming Consistency...');
  
  const featureMap = {
    'publishers': 'publisher',
    'beats': 'beat',
    'categories': 'category',
    'outlets': 'outlet',
    'countries': 'country',
    'regions': 'region',
    'languages': 'language'
  };
  
  Object.entries(featureMap).forEach(([feature, singular]) => {
    const featurePath = `src/components/features/${feature}`;
    
    // Check for add sheet
    const addSheetPath = `${featurePath}/add-${singular}-sheet.tsx`;
    const addSheetExists = fs.existsSync(addSheetPath);
    
    if (addSheetExists) {
      logTest(`${feature} add sheet naming`, 'PASS');
    } else {
      logTest(`${feature} add sheet naming`, 'FAIL', `Expected ${addSheetPath} to exist`);
    }
    
    // Check for edit sheet
    const editSheetPath = `${featurePath}/edit-${singular}-sheet.tsx`;
    const editSheetExists = fs.existsSync(editSheetPath);
    
    if (editSheetExists) {
      logTest(`${feature} edit sheet naming`, 'PASS');
    } else {
      logTest(`${feature} edit sheet naming`, 'FAIL', `Expected ${editSheetPath} to exist`);
    }
    
    // Check for old modal files (should not exist)
    const oldAddModalPath = `${featurePath}/add-${singular}-modal.tsx`;
    const oldEditModalPath = `${featurePath}/edit-${singular}-modal.tsx`;
    
    if (!fs.existsSync(oldAddModalPath)) {
      logTest(`${feature} old add modal removed`, 'PASS');
    } else {
      logTest(`${feature} old add modal removed`, 'FAIL', `Old modal file still exists: ${oldAddModalPath}`);
    }
    
    if (!fs.existsSync(oldEditModalPath)) {
      logTest(`${feature} old edit modal removed`, 'PASS');
    } else {
      logTest(`${feature} old edit modal removed`, 'FAIL', `Old modal file still exists: ${oldEditModalPath}`);
    }
  });
}

function testSheetComponentConsistency() {
  console.log('\n🔍 Testing Sheet Component Consistency...');
  
  const featureMap = {
    'publishers': 'publisher',
    'beats': 'beat',
    'categories': 'category',
    'outlets': 'outlet'
  };
  
  Object.entries(featureMap).forEach(([feature, singular]) => {
    const addSheetPath = `src/components/features/${feature}/add-${singular}-sheet.tsx`;
    const editSheetPath = `src/components/features/${feature}/edit-${singular}-sheet.tsx`;
    
    const addSheetContent = readFileIfExists(addSheetPath);
    const editSheetContent = readFileIfExists(editSheetPath);
    
    if (addSheetContent) {
      // Test Sheet component usage
      if (addSheetContent.includes('import {') && addSheetContent.includes('Sheet,')) {
        logTest(`${feature} add sheet uses Sheet component`, 'PASS');
      } else {
        logTest(`${feature} add sheet uses Sheet component`, 'FAIL', 'Does not import Sheet component');
      }
      
      // Test consistent width patterns
      if (addSheetContent.includes('sm:max-w-md') || addSheetContent.includes('sm:max-w-2xl')) {
        logTest(`${feature} add sheet has consistent width`, 'PASS');
      } else {
        logTest(`${feature} add sheet has consistent width`, 'FAIL', 'Missing consistent width class');
      }
      
      // Test overflow handling
      if (addSheetContent.includes('overflow-y-auto')) {
        logTest(`${feature} add sheet handles overflow`, 'PASS');
      } else {
        logTest(`${feature} add sheet handles overflow`, 'WARN', 'Missing overflow-y-auto class');
      }
      
      // Test form validation
      if (addSheetContent.includes('zodResolver') && addSheetContent.includes('useForm')) {
        logTest(`${feature} add sheet has form validation`, 'PASS');
      } else {
        logTest(`${feature} add sheet has form validation`, 'FAIL', 'Missing form validation setup');
      }
      
      // Test loading states
      if (addSheetContent.includes('isSubmitting') && addSheetContent.includes('Loader2')) {
        logTest(`${feature} add sheet has loading states`, 'PASS');
      } else {
        logTest(`${feature} add sheet has loading states`, 'FAIL', 'Missing loading state handling');
      }
    }
    
    if (editSheetContent) {
      // Similar tests for edit sheets
      if (editSheetContent.includes('import {') && editSheetContent.includes('Sheet,')) {
        logTest(`${feature} edit sheet uses Sheet component`, 'PASS');
      } else {
        logTest(`${feature} edit sheet uses Sheet component`, 'FAIL', 'Does not import Sheet component');
      }
    }
  });
}

function testTableComponentConsistency() {
  console.log('\n🔍 Testing Table Component Consistency...');
  
  const features = ['publishers', 'beats', 'categories', 'outlets'];
  
  features.forEach(feature => {
    const tablePath = `src/components/features/${feature}/${feature}-table.tsx`;
    const tableContent = readFileIfExists(tablePath);
    
    if (tableContent) {
      // Test search input pattern
      if (tableContent.includes('Search') && tableContent.includes('placeholder="Search')) {
        logTest(`${feature} table has search input`, 'PASS');
      } else {
        logTest(`${feature} table has search input`, 'FAIL', 'Missing search input pattern');
      }
      
      // Test dropdown menu actions
      if (tableContent.includes('DropdownMenu') && tableContent.includes('MoreHorizontal')) {
        logTest(`${feature} table has dropdown actions`, 'PASS');
      } else {
        logTest(`${feature} table has dropdown actions`, 'FAIL', 'Missing dropdown menu pattern');
      }
      
      // Test count badges
      if (tableContent.includes('Badge') && tableContent.includes('font-mono')) {
        logTest(`${feature} table has count badges`, 'PASS');
      } else {
        logTest(`${feature} table has count badges`, 'WARN', 'Missing count badge pattern');
      }
      
      // Test empty states
      if (tableContent.includes('No ') && tableContent.includes('found')) {
        logTest(`${feature} table has empty states`, 'PASS');
      } else {
        logTest(`${feature} table has empty states`, 'FAIL', 'Missing empty state messages');
      }
      
      // Test loading states
      if (tableContent.includes('Loading') && tableContent.includes('Loader2')) {
        logTest(`${feature} table has loading states`, 'PASS');
      } else {
        logTest(`${feature} table has loading states`, 'FAIL', 'Missing loading state handling');
      }
    } else {
      logTest(`${feature} table exists`, 'FAIL', `Table file not found: ${tablePath}`);
    }
  });
}

function testImportReferences() {
  console.log('\n🔍 Testing Import References...');
  
  const features = ['publishers', 'beats', 'categories', 'outlets'];
  
  features.forEach(feature => {
    const clientViewPath = `src/components/features/${feature}/${feature}-client-view.tsx`;
    const clientViewContent = readFileIfExists(clientViewPath);
    
    if (clientViewContent) {
      // Test that it imports sheet components, not modal components
      if (clientViewContent.includes('-sheet') && !clientViewContent.includes('-modal')) {
        logTest(`${feature} client view imports sheets`, 'PASS');
      } else if (clientViewContent.includes('-modal')) {
        logTest(`${feature} client view imports sheets`, 'FAIL', 'Still importing modal components');
      } else {
        logTest(`${feature} client view imports sheets`, 'WARN', 'Could not verify sheet imports');
      }
    }
  });
}

function testAccessibilityFeatures() {
  console.log('\n🔍 Testing Accessibility Features...');
  
  const featureMap = {
    'publishers': 'publisher',
    'beats': 'beat',
    'categories': 'category',
    'outlets': 'outlet'
  };
  
  Object.entries(featureMap).forEach(([feature, singular]) => {
    const addSheetPath = `src/components/features/${feature}/add-${singular}-sheet.tsx`;
    const tablePath = `src/components/features/${feature}/${feature}-table.tsx`;
    
    const addSheetContent = readFileIfExists(addSheetPath);
    const tableContent = readFileIfExists(tablePath);
    
    if (addSheetContent) {
      // Test form labels
      if (addSheetContent.includes('FormLabel') || addSheetContent.includes('<Label')) {
        logTest(`${feature} add sheet has form labels`, 'PASS');
      } else {
        logTest(`${feature} add sheet has form labels`, 'FAIL', 'Missing form labels');
      }
      
      // Test form descriptions
      if (addSheetContent.includes('SheetDescription')) {
        logTest(`${feature} add sheet has descriptions`, 'PASS');
      } else {
        logTest(`${feature} add sheet has descriptions`, 'WARN', 'Missing sheet description');
      }
    }
    
    if (tableContent) {
      // Test screen reader support
      if (tableContent.includes('sr-only')) {
        logTest(`${feature} table has screen reader support`, 'PASS');
      } else {
        logTest(`${feature} table has screen reader support`, 'WARN', 'Missing screen reader labels');
      }
    }
  });
}

function testResponsiveDesign() {
  console.log('\n🔍 Testing Responsive Design Patterns...');
  
  const featureMap = {
    'publishers': 'publisher',
    'beats': 'beat',
    'categories': 'category',
    'outlets': 'outlet'
  };
  
  Object.entries(featureMap).forEach(([feature, singular]) => {
    const addSheetPath = `src/components/features/${feature}/add-${singular}-sheet.tsx`;
    const addSheetContent = readFileIfExists(addSheetPath);
    
    if (addSheetContent) {
      // Test responsive width classes
      if (addSheetContent.includes('w-full') && addSheetContent.includes('sm:max-w-')) {
        logTest(`${feature} add sheet is responsive`, 'PASS');
      } else {
        logTest(`${feature} add sheet is responsive`, 'FAIL', 'Missing responsive width classes');
      }
    }
  });
}

function generateReport() {
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📝 Total Tests: ${testResults.passed + testResults.failed + testResults.warnings}`);
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed + testResults.warnings)) * 100).toFixed(1);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
  }
  
  if (testResults.warnings > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.details
      .filter(test => test.status === 'WARN')
      .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
  }
  
  // Write detailed report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      successRate: successRate + '%'
    },
    details: testResults.details
  };
  
  fs.writeFileSync('ui-harmonization-test-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Detailed report saved to: ui-harmonization-test-report.json');
}

// Run all tests
console.log('🚀 Starting UI Harmonization Integration Tests...');

testFileNamingConsistency();
testSheetComponentConsistency();
testTableComponentConsistency();
testImportReferences();
testAccessibilityFeatures();
testResponsiveDesign();

generateReport();

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);