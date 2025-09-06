/**
 * Test script to demonstrate email verification process
 * This shows how the system handles different email verification scenarios
 */

import { verifyEmail, batchVerifyEmails } from './email-verification-utils';

// Test cases
const testContacts = [
  // Valid professional emails
  { name: "Lynley Donnelly", email: "ldonnelly@iol.co.za", outlet: "Business Day" },
  { name: "Martin Creamer", email: "martin.creamer@creamermedia.co.za", outlet: "Engineering News" },
  
  // Email with wrong domain but still professional
  { name: "Freelance Journalist", email: "writer@newsagency.com", outlet: "Business Day" },
  
  // Personal email
  { name: "Guest Contributor", email: "contributor@gmail.com", outlet: "Financial Mail" },
  
  // Invalid format
  { name: "Editor", email: "editor-at-company.com", outlet: "ITWeb" }
];

console.log("=== EMAIL VERIFICATION TEST RESULTS ===\n");

// Test individual verification
for (const contact of testContacts) {
  const result = verifyEmail(contact.email, contact.outlet);
  console.log(`Contact: ${contact.name}`);
  console.log(`Email: ${contact.email}`);
  console.log(`Outlet: ${contact.outlet}`);
  console.log(`Verified: ${result.verified}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Issues: ${result.issues.length > 0 ? result.issues.join(', ') : 'None'}`);
  console.log("---");
}

console.log("\n=== BATCH VERIFICATION ===\n");

// Test batch verification
const batchResults = batchVerifyEmails(testContacts);
const verifiedCount = batchResults.filter(r => r.verification.verified).length;
const highConfidenceCount = batchResults.filter(r => r.verification.confidence === 'high').length;

console.log(`Total contacts: ${testContacts.length}`);
console.log(`Verified contacts: ${verifiedCount}`);
console.log(`High confidence contacts: ${highConfidenceCount}`);
console.log(`Verification rate: ${((verifiedCount / testContacts.length) * 100).toFixed(1)}%`);

console.log("\n=== RECOMMENDATIONS ===");
console.log("1. Only mark emails as verified if confidence is 'high'");
console.log("2. For 'medium' confidence, consider manual verification");
console.log("3. Skip contacts with 'low' confidence in production");
console.log("4. Implement email verification workflow for new contacts");