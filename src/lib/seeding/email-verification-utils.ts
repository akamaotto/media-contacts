/**
 * Email Verification Utilities for Media Contact Seeding
 * 
 * This module provides utilities for verifying email addresses of media contacts
 * during the seeding process.
 */

// Known email domains for South African outlets
const OUTLET_EMAIL_DOMAINS: Record<string, string[]> = {
  "Business Day": ["iol.co.za"],
  "Financial Mail": ["financialmail.co.za"],
  "The Citizen": ["citizen.co.za"],
  "Mail & Guardian": ["mailguardian.co.za"],
  "IOL Business": ["iol.co.za"],
  "Engineering News": ["creamermedia.co.za", "engineeringnews.co.za"],
  "ITWeb": ["itweb.co.za"],
  "MyBroadband": ["mybroadband.co.za"],
  "BizCommunity": ["bizcommunity.com"],
  "Energy News Network": ["energynews.co.za"]
};

/**
 * Validate email format
 */
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Verify if email domain matches the outlet
 */
function isEmailDomainMatchingOutlet(email: string, outlet: string): boolean {
  const emailDomain = email.split('@')[1];
  const validDomains = OUTLET_EMAIL_DOMAINS[outlet] || [];
  return validDomains.includes(emailDomain);
}

/**
 * Check if email is likely to be a professional contact email
 * (not personal emails like gmail.com, yahoo.com, etc.)
 */
function isProfessionalEmail(email: string): boolean {
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'icloud.com', 'aol.com', 'protonmail.com'
  ];
  
  const emailDomain = email.split('@')[1];
  return !personalDomains.includes(emailDomain.toLowerCase());
}

/**
 * Comprehensive email verification
 * Returns verification status and confidence level
 */
export function verifyEmail(email: string, outlet: string): { 
  verified: boolean; 
  confidence: 'high' | 'medium' | 'low'; 
  issues: string[] 
} {
  const issues: string[] = [];
  
  // Basic format validation
  if (!isValidEmailFormat(email)) {
    issues.push('Invalid email format');
    return { verified: false, confidence: 'low', issues };
  }
  
  // Professional email check
  if (!isProfessionalEmail(email)) {
    issues.push('Email uses personal domain');
  }
  
  // Domain matching check
  if (!isEmailDomainMatchingOutlet(email, outlet)) {
    issues.push('Email domain does not match outlet');
  }
  
  // Determine verification status and confidence
  if (issues.length === 0) {
    return { verified: true, confidence: 'high', issues };
  } else if (issues.length === 1 && issues[0] === 'Email domain does not match outlet') {
    return { verified: true, confidence: 'medium', issues };
  } else {
    return { verified: false, confidence: 'low', issues };
  }
}

/**
 * Batch verify emails for multiple contacts
 */
export function batchVerifyEmails(contacts: Array<{name: string, email: string, outlet: string}>): 
  Array<{name: string, email: string, verification: ReturnType<typeof verifyEmail>}> {
  
  return contacts.map(contact => ({
    name: contact.name,
    email: contact.email,
    verification: verifyEmail(contact.email, contact.outlet)
  }));
}

// Example usage:
// const verificationResult = verifyEmail("ldonnelly@iol.co.za", "Business Day");
// console.log(verificationResult);
// Output: { verified: true, confidence: 'high', issues: [] }