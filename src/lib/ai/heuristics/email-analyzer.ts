/**
 * Email Analyzer - Media-Smart Email Detection and Classification
 * Detects alias emails (tips@, newsdesk@, hello@) and classifies email types
 */

export interface EmailAnalysis {
  emailType: 'personal' | 'alias' | 'generic' | 'department' | 'unknown';
  aliasType?: 'tips' | 'newsdesk' | 'editorial' | 'press' | 'contact' | 'info' | 'hello';
  confidence: number;
  isDirectContact: boolean;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestions?: {
    alternativeEmails?: string[];
    contactMethod?: string;
    notes?: string;
  };
}

export interface EmailPattern {
  pattern: RegExp;
  type: EmailAnalysis['emailType'];
  aliasType?: EmailAnalysis['aliasType'];
  priority: EmailAnalysis['priority'];
  confidence: number;
  description: string;
}

/**
 * Comprehensive email patterns for media outlets
 */
const EMAIL_PATTERNS: EmailPattern[] = [
  // Personal email patterns (highest priority)
  {
    pattern: /^[a-z]+\.[a-z]+@/i, // firstname.lastname@
    type: 'personal',
    priority: 'high',
    confidence: 0.9,
    description: 'First name and last name format'
  },
  {
    pattern: /^[a-z]+[a-z0-9]*@/i, // firstname@ or firstnamelastname@
    type: 'personal',
    priority: 'high',
    confidence: 0.8,
    description: 'Personal name format'
  },
  {
    pattern: /^[a-z]\.[a-z]+@/i, // f.lastname@
    type: 'personal',
    priority: 'high',
    confidence: 0.85,
    description: 'First initial and last name'
  },
  
  // Tips and submission aliases
  {
    pattern: /^tips@/i,
    type: 'alias',
    aliasType: 'tips',
    priority: 'medium',
    confidence: 0.95,
    description: 'Tips submission email'
  },
  {
    pattern: /^tip@/i,
    type: 'alias',
    aliasType: 'tips',
    priority: 'medium',
    confidence: 0.9,
    description: 'Tip submission email'
  },
  {
    pattern: /^story@/i,
    type: 'alias',
    aliasType: 'tips',
    priority: 'medium',
    confidence: 0.85,
    description: 'Story submission email'
  },
  {
    pattern: /^news@/i,
    type: 'alias',
    aliasType: 'tips',
    priority: 'medium',
    confidence: 0.8,
    description: 'News submission email'
  },
  
  // Editorial and newsroom aliases
  {
    pattern: /^newsdesk@/i,
    type: 'alias',
    aliasType: 'newsdesk',
    priority: 'medium',
    confidence: 0.95,
    description: 'Newsdesk email'
  },
  {
    pattern: /^newsroom@/i,
    type: 'alias',
    aliasType: 'newsdesk',
    priority: 'medium',
    confidence: 0.9,
    description: 'Newsroom email'
  },
  {
    pattern: /^editorial@/i,
    type: 'alias',
    aliasType: 'editorial',
    priority: 'medium',
    confidence: 0.9,
    description: 'Editorial team email'
  },
  {
    pattern: /^editor@/i,
    type: 'alias',
    aliasType: 'editorial',
    priority: 'medium',
    confidence: 0.85,
    description: 'Editor email'
  },
  {
    pattern: /^editors@/i,
    type: 'alias',
    aliasType: 'editorial',
    priority: 'medium',
    confidence: 0.85,
    description: 'Editors team email'
  },
  
  // Press and media relations
  {
    pattern: /^press@/i,
    type: 'alias',
    aliasType: 'press',
    priority: 'high',
    confidence: 0.95,
    description: 'Press relations email'
  },
  {
    pattern: /^media@/i,
    type: 'alias',
    aliasType: 'press',
    priority: 'high',
    confidence: 0.9,
    description: 'Media relations email'
  },
  {
    pattern: /^pr@/i,
    type: 'alias',
    aliasType: 'press',
    priority: 'high',
    confidence: 0.85,
    description: 'PR team email'
  },
  
  // General contact aliases
  {
    pattern: /^contact@/i,
    type: 'alias',
    aliasType: 'contact',
    priority: 'low',
    confidence: 0.8,
    description: 'General contact email'
  },
  {
    pattern: /^hello@/i,
    type: 'alias',
    aliasType: 'hello',
    priority: 'low',
    confidence: 0.75,
    description: 'General hello email'
  },
  {
    pattern: /^hi@/i,
    type: 'alias',
    aliasType: 'hello',
    priority: 'low',
    confidence: 0.7,
    description: 'General hi email'
  },
  {
    pattern: /^info@/i,
    type: 'alias',
    aliasType: 'info',
    priority: 'low',
    confidence: 0.75,
    description: 'General info email'
  },
  
  // Department-specific emails
  {
    pattern: /^business@/i,
    type: 'department',
    priority: 'medium',
    confidence: 0.8,
    description: 'Business department email'
  },
  {
    pattern: /^tech@/i,
    type: 'department',
    priority: 'medium',
    confidence: 0.8,
    description: 'Technology department email'
  },
  {
    pattern: /^sports@/i,
    type: 'department',
    priority: 'medium',
    confidence: 0.8,
    description: 'Sports department email'
  },
  {
    pattern: /^politics@/i,
    type: 'department',
    priority: 'medium',
    confidence: 0.8,
    description: 'Politics department email'
  },
  
  // Generic/administrative emails (lowest priority)
  {
    pattern: /^admin@/i,
    type: 'generic',
    priority: 'low',
    confidence: 0.9,
    description: 'Administrative email'
  },
  {
    pattern: /^support@/i,
    type: 'generic',
    priority: 'low',
    confidence: 0.9,
    description: 'Support email'
  },
  {
    pattern: /^help@/i,
    type: 'generic',
    priority: 'low',
    confidence: 0.85,
    description: 'Help desk email'
  },
  {
    pattern: /^noreply@/i,
    type: 'generic',
    priority: 'low',
    confidence: 0.95,
    description: 'No-reply email'
  },
  {
    pattern: /^no-reply@/i,
    type: 'generic',
    priority: 'low',
    confidence: 0.95,
    description: 'No-reply email'
  }
];

/**
 * Domain-specific email patterns for major media outlets
 */
const DOMAIN_SPECIFIC_PATTERNS: Record<string, {
  personalPatterns: RegExp[];
  aliasPatterns: Record<string, RegExp[]>;
  notes: string;
}> = {
  'nytimes.com': {
    personalPatterns: [/^[a-z]+@/, /^[a-z]+\.[a-z]+@/],
    aliasPatterns: {
      tips: [/^tips@/, /^nytnews@/],
      editorial: [/^letters@/, /^opinion@/]
    },
    notes: 'NYTimes typically uses firstname@ or firstname.lastname@ for reporters'
  },
  'wsj.com': {
    personalPatterns: [/^[a-z]+\.[a-z]+@/],
    aliasPatterns: {
      tips: [/^tips@/, /^wsjnews@/],
      press: [/^press@/]
    },
    notes: 'WSJ uses firstname.lastname@ format consistently'
  },
  'washingtonpost.com': {
    personalPatterns: [/^[a-z]+@/, /^[a-z]+\.[a-z]+@/],
    aliasPatterns: {
      tips: [/^tips@/, /^wpnews@/],
      editorial: [/^letters@/]
    },
    notes: 'Washington Post uses various personal formats'
  },
  'reuters.com': {
    personalPatterns: [/^[a-z]+\.[a-z]+@/],
    aliasPatterns: {
      tips: [/^tips@/, /^newsroom@/],
      press: [/^media@/]
    },
    notes: 'Reuters uses firstname.lastname@ format'
  },
  'bloomberg.com': {
    personalPatterns: [/^[a-z]+@/, /^[a-z]+\.[a-z]+@/],
    aliasPatterns: {
      tips: [/^tips@/, /^news@/],
      press: [/^press@/]
    },
    notes: 'Bloomberg uses firstname@ or firstname.lastname@'
  }
};

export class EmailAnalyzer {
  /**
   * Analyze an email address for type, priority, and contact recommendations
   */
  analyzeEmail(email: string, domain?: string, context?: {
    outletName?: string;
    contactName?: string;
    title?: string;
  }): EmailAnalysis {
    const emailLower = email.toLowerCase();
    const emailDomain = domain || this.extractDomain(email);
    
    // Find matching patterns
    const matchingPatterns = EMAIL_PATTERNS.filter(pattern => 
      pattern.pattern.test(emailLower)
    );
    
    if (matchingPatterns.length === 0) {
      return this.createUnknownAnalysis(email);
    }
    
    // Get the highest confidence match
    const bestMatch = matchingPatterns.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    // Check for domain-specific patterns
    const domainAnalysis = this.analyzeDomainSpecific(emailLower, emailDomain);
    
    // Combine analyses
    const finalAnalysis = this.combineAnalyses(bestMatch, domainAnalysis, email, context);
    
    return finalAnalysis;
  }
  
  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : '';
  }
  
  /**
   * Analyze email against domain-specific patterns
   */
  private analyzeDomainSpecific(email: string, domain: string): Partial<EmailAnalysis> | null {
    const domainPatterns = DOMAIN_SPECIFIC_PATTERNS[domain];
    if (!domainPatterns) return null;
    
    // Check personal patterns
    for (const pattern of domainPatterns.personalPatterns) {
      if (pattern.test(email)) {
        return {
          emailType: 'personal',
          confidence: 0.95,
          priority: 'high',
          reasoning: `Matches ${domain} personal email pattern`
        };
      }
    }
    
    // Check alias patterns
    for (const [aliasType, patterns] of Object.entries(domainPatterns.aliasPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(email)) {
          return {
            emailType: 'alias',
            aliasType: aliasType as EmailAnalysis['aliasType'],
            confidence: 0.9,
            priority: aliasType === 'press' ? 'high' : 'medium',
            reasoning: `Matches ${domain} ${aliasType} alias pattern`
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Combine pattern analysis with domain-specific analysis
   */
  private combineAnalyses(
    patternMatch: EmailPattern,
    domainAnalysis: Partial<EmailAnalysis> | null,
    email: string,
    context?: {
      outletName?: string;
      contactName?: string;
      title?: string;
    }
  ): EmailAnalysis {
    // Domain-specific analysis takes precedence
    if (domainAnalysis && domainAnalysis.confidence && domainAnalysis.confidence > patternMatch.confidence) {
      return {
        emailType: domainAnalysis.emailType || patternMatch.type,
        aliasType: domainAnalysis.aliasType || patternMatch.aliasType,
        confidence: domainAnalysis.confidence,
        isDirectContact: domainAnalysis.emailType === 'personal',
        priority: domainAnalysis.priority || patternMatch.priority,
        reasoning: domainAnalysis.reasoning || patternMatch.description,
        suggestions: this.generateSuggestions(email, domainAnalysis.emailType || patternMatch.type, context)
      };
    }
    
    // Use pattern match
    return {
      emailType: patternMatch.type,
      aliasType: patternMatch.aliasType,
      confidence: patternMatch.confidence,
      isDirectContact: patternMatch.type === 'personal',
      priority: patternMatch.priority,
      reasoning: patternMatch.description,
      suggestions: this.generateSuggestions(email, patternMatch.type, context)
    };
  }
  
  /**
   * Create analysis for unknown email patterns
   */
  private createUnknownAnalysis(email: string): EmailAnalysis {
    const localPart = email.split('@')[0];
    
    // Heuristic checks for unknown patterns
    let confidence = 0.3;
    let emailType: EmailAnalysis['emailType'] = 'unknown';
    let priority: EmailAnalysis['priority'] = 'low';
    
    // Check if it looks like a personal email
    if (localPart.includes('.') && localPart.length > 3) {
      emailType = 'personal';
      confidence = 0.6;
      priority = 'medium';
    } else if (localPart.length < 4 || /^\d+$/.test(localPart)) {
      emailType = 'generic';
      confidence = 0.7;
      priority = 'low';
    }
    
    return {
      emailType,
      confidence,
      isDirectContact: emailType === 'personal',
      priority,
      reasoning: 'Unknown pattern - classified based on heuristics',
      suggestions: this.generateSuggestions(email, emailType)
    };
  }
  
  /**
   * Generate suggestions for better contact methods
   */
  private generateSuggestions(
    email: string,
    emailType: EmailAnalysis['emailType'],
    context?: {
      outletName?: string;
      contactName?: string;
      title?: string;
    }
  ): EmailAnalysis['suggestions'] {
    const suggestions: EmailAnalysis['suggestions'] = {};
    
    switch (emailType) {
      case 'alias':
        suggestions.contactMethod = 'Consider finding a direct reporter email for better response rates';
        suggestions.notes = 'Alias emails may have lower response rates and longer response times';
        
        if (context?.contactName) {
          const domain = this.extractDomain(email);
          suggestions.alternativeEmails = this.generatePersonalEmailSuggestions(context.contactName, domain);
        }
        break;
        
      case 'generic':
        suggestions.contactMethod = 'Look for specific department or reporter emails';
        suggestions.notes = 'Generic emails are typically not monitored by editorial staff';
        break;
        
      case 'department':
        suggestions.contactMethod = 'Good for beat-specific pitches, but personal contacts are preferred';
        suggestions.notes = 'Department emails may route to multiple people';
        break;
        
      case 'personal':
        suggestions.contactMethod = 'Excellent - direct personal contact';
        suggestions.notes = 'Personal emails typically have the highest response rates';
        break;
        
      case 'unknown':
        suggestions.contactMethod = 'Verify email format and consider alternative contact methods';
        suggestions.notes = 'Unknown email pattern - may need verification';
        break;
    }
    
    return suggestions;
  }
  
  /**
   * Generate potential personal email variations
   */
  private generatePersonalEmailSuggestions(contactName: string, domain: string): string[] {
    const suggestions: string[] = [];
    const nameParts = contactName.toLowerCase().split(' ').filter(Boolean);
    
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Common personal email formats
      suggestions.push(
        `${firstName}.${lastName}@${domain}`,
        `${firstName}@${domain}`,
        `${firstName[0]}.${lastName}@${domain}`,
        `${firstName}${lastName}@${domain}`,
        `${firstName}_${lastName}@${domain}`,
        `${firstName}-${lastName}@${domain}`
      );
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
  
  /**
   * Batch analyze multiple emails
   */
  analyzeEmails(emails: Array<{
    email: string;
    domain?: string;
    context?: {
      outletName?: string;
      contactName?: string;
      title?: string;
    };
  }>): EmailAnalysis[] {
    return emails.map(({ email, domain, context }) => 
      this.analyzeEmail(email, domain, context)
    );
  }
  
  /**
   * Rank emails by contact priority
   */
  rankEmailsByPriority(analyses: Array<{ email: string; analysis: EmailAnalysis }>): Array<{ email: string; analysis: EmailAnalysis; score: number }> {
    return analyses
      .map(({ email, analysis }) => ({
        email,
        analysis,
        score: this.calculateEmailScore(analysis)
      }))
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Calculate numerical score for email priority
   */
  calculateEmailScore(analysis: EmailAnalysis): number {
    let score = analysis.confidence * 100;
    
    // Priority multipliers
    switch (analysis.priority) {
      case 'high': score *= 1.5; break;
      case 'medium': score *= 1.0; break;
      case 'low': score *= 0.5; break;
    }
    
    // Email type bonuses
    switch (analysis.emailType) {
      case 'personal': score += 50; break;
      case 'alias': 
        if (analysis.aliasType === 'press') score += 30;
        else if (analysis.aliasType === 'tips') score += 20;
        else score += 10;
        break;
      case 'department': score += 15; break;
      case 'generic': score -= 20; break;
      case 'unknown': score -= 30; break;
    }
    
    return Math.max(0, score);
  }
  
  /**
   * Validate email format and deliverability
   */
  validateEmail(email: string): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      issues.push('Invalid email format');
      return { isValid: false, issues, suggestions: ['Check email format'] };
    }
    
    // Check for common issues
    const localPart = email.split('@')[0];
    const domain = email.split('@')[1];
    
    if (localPart.length > 64) {
      issues.push('Local part too long (>64 characters)');
    }
    
    if (domain.length > 253) {
      issues.push('Domain too long (>253 characters)');
    }
    
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      issues.push('Local part cannot start or end with a dot');
    }
    
    if (localPart.includes('..')) {
      issues.push('Local part cannot contain consecutive dots');
    }
    
    // Check for suspicious patterns
    if (/noreply|no-reply|donotreply/i.test(email)) {
      issues.push('Appears to be a no-reply email');
      suggestions.push('Find an alternative contact email');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }
}