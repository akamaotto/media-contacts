/**
 * Freelancer Analyzer - Multi-Outlet Handling with Weighted Recency
 * Handles freelancers who work for multiple outlets with proper recency weighting
 */

export interface FreelancerProfile {
  contactId: string;
  name: string;
  email: string;
  isFreelancer: boolean;
  confidence: number;
  outlets: OutletAssociation[];
  primaryOutlet?: OutletAssociation;
  recentActivity: ActivitySummary;
  contactStrategy: ContactStrategy;
  reasoning: string;
}

export interface OutletAssociation {
  outletId: string;
  outletName: string;
  outletDomain: string;
  relationship: 'staff' | 'freelancer' | 'contributor' | 'stringer' | 'unknown';
  confidence: number;
  recencyScore: number;
  activityLevel: 'high' | 'medium' | 'low';
  lastByline: Date;
  totalBylines: number;
  recentBylines: number; // Last 90 days
  averageFrequency: number; // Articles per month
  beats: string[];
  evidence: Evidence[];
}

export interface Evidence {
  type: 'byline' | 'bio' | 'social' | 'email' | 'masthead';
  source: string;
  content: string;
  timestamp: Date;
  confidence: number;
}

export interface ActivitySummary {
  totalOutlets: number;
  activeOutlets: number; // Active in last 90 days
  primaryOutletScore: number;
  diversityIndex: number; // 0-1, higher = more diverse
  recencyPattern: 'consistent' | 'sporadic' | 'declining' | 'increasing';
  lastActivity: Date;
}

export interface ContactStrategy {
  preferredOutlet: string;
  contactTiming: 'immediate' | 'monitor' | 'seasonal';
  pitchApproach: 'outlet_specific' | 'multi_outlet' | 'personal_brand';
  notes: string[];
  warnings: string[];
}

/**
 * Patterns that indicate freelancer status
 */
const FREELANCER_INDICATORS = {
  bio_patterns: [
    /freelance/i,
    /independent/i,
    /contributor/i,
    /writes for/i,
    /bylines in/i,
    /work has appeared in/i,
    /published in/i,
    /covers .+ for multiple/i
  ],
  
  title_patterns: [
    /freelance/i,
    /independent/i,
    /contributor/i,
    /correspondent/i,
    /stringer/i
  ],
  
  email_patterns: [
    /@gmail\./i,
    /@yahoo\./i,
    /@hotmail\./i,
    /@outlook\./i,
    /@icloud\./i,
    /personal domain patterns/
  ],
  
  social_patterns: [
    /freelance/i,
    /independent journalist/i,
    /writes for/i,
    /bylines:/i
  ]
};

/**
 * Outlet relationship strength indicators
 */
const RELATIONSHIP_INDICATORS = {
  staff: {
    patterns: [
      /staff writer/i,
      /senior writer/i,
      /editor/i,
      /reporter/i,
      /correspondent/i
    ],
    email_domain_match: true,
    masthead_presence: true,
    bio_on_site: true,
    min_frequency: 4 // articles per month
  },
  
  freelancer: {
    patterns: [
      /freelance/i,
      /contributing/i,
      /contributor/i
    ],
    email_domain_match: false,
    irregular_frequency: true,
    multiple_outlets: true
  },
  
  stringer: {
    patterns: [
      /stringer/i,
      /correspondent/i
    ],
    location_specific: true,
    event_based: true
  }
};

export class FreelancerAnalyzer {
  /**
   * Analyze a contact to determine if they're a freelancer and their outlet relationships
   */
  analyzeFreelancer(contact: {
    id: string;
    name: string;
    email: string;
    title?: string;
    bio?: string;
    outlets: Array<{
      id: string;
      name: string;
      domain: string;
      bylines: Array<{
        title: string;
        url: string;
        publishedAt: Date;
        beats: string[];
      }>;
      relationship?: string;
      lastActivity?: Date;
    }>;
    socialProfiles?: {
      twitter?: string;
      linkedin?: string;
    };
  }): FreelancerProfile {
    
    // 1. Determine if contact is a freelancer
    const freelancerAnalysis = this.detectFreelancerStatus(contact);
    
    // 2. Analyze outlet relationships
    const outletAssociations = this.analyzeOutletRelationships(contact);
    
    // 3. Calculate recency scores and determine primary outlet
    const scoredOutlets = this.calculateRecencyScores(outletAssociations);
    const primaryOutlet = this.determinePrimaryOutlet(scoredOutlets);
    
    // 4. Generate activity summary
    const activitySummary = this.generateActivitySummary(scoredOutlets);
    
    // 5. Develop contact strategy
    const contactStrategy = this.developContactStrategy(
      freelancerAnalysis.isFreelancer,
      scoredOutlets,
      primaryOutlet,
      activitySummary
    );
    
    return {
      contactId: contact.id,
      name: contact.name,
      email: contact.email,
      isFreelancer: freelancerAnalysis.isFreelancer,
      confidence: freelancerAnalysis.confidence,
      outlets: scoredOutlets,
      primaryOutlet,
      recentActivity: activitySummary,
      contactStrategy,
      reasoning: freelancerAnalysis.reasoning
    };
  }
  
  /**
   * Detect if a contact is likely a freelancer
   */
  private detectFreelancerStatus(contact: any): {
    isFreelancer: boolean;
    confidence: number;
    reasoning: string;
  } {
    let freelancerScore = 0;
    const indicators: string[] = [];
    
    // Check bio patterns
    if (contact.bio) {
      for (const pattern of FREELANCER_INDICATORS.bio_patterns) {
        if (pattern.test(contact.bio)) {
          freelancerScore += 0.3;
          indicators.push(`Bio contains freelancer indicator: ${pattern.source}`);
        }
      }
    }
    
    // Check title patterns
    if (contact.title) {
      for (const pattern of FREELANCER_INDICATORS.title_patterns) {
        if (pattern.test(contact.title)) {
          freelancerScore += 0.25;
          indicators.push(`Title indicates freelancer: ${contact.title}`);
        }
      }
    }
    
    // Check email domain (personal vs. outlet domain)
    const emailDomain = contact.email.split('@')[1];
    const hasOutletEmail = contact.outlets.some((outlet: { domain: string }) => 
      outlet.domain === emailDomain
    );
    
    if (!hasOutletEmail) {
      for (const pattern of FREELANCER_INDICATORS.email_patterns) {
        if (pattern.test(contact.email)) {
          freelancerScore += 0.2;
          indicators.push('Uses personal email domain');
          break;
        }
      }
    }
    
    // Check multiple outlet presence
    if (contact.outlets.length > 1) {
      freelancerScore += 0.3 + (contact.outlets.length - 1) * 0.1;
      indicators.push(`Writes for ${contact.outlets.length} outlets`);
    }
    
    // Check byline frequency patterns
    const frequencyAnalysis = this.analyzeBylineFrequency(contact.outlets);
    if (frequencyAnalysis.isIrregular) {
      freelancerScore += 0.2;
      indicators.push('Irregular publishing pattern across outlets');
    }
    
    // Check social media indicators
    if (contact.socialProfiles) {
      const socialText = Object.values(contact.socialProfiles).join(' ');
      for (const pattern of FREELANCER_INDICATORS.social_patterns) {
        if (pattern.test(socialText)) {
          freelancerScore += 0.15;
          indicators.push('Social media indicates freelancer status');
          break;
        }
      }
    }
    
    const confidence = Math.min(freelancerScore, 1.0);
    const isFreelancer = confidence > 0.6;
    
    const reasoning = isFreelancer 
      ? `Likely freelancer (${(confidence * 100).toFixed(0)}% confidence): ${indicators.join(', ')}`
      : `Likely staff writer (${((1 - confidence) * 100).toFixed(0)}% confidence)`;
    
    return { isFreelancer, confidence, reasoning };
  }
  
  /**
   * Analyze relationships with each outlet
   */
  private analyzeOutletRelationships(contact: any): OutletAssociation[] {
    return contact.outlets.map((outlet: { id: string; name: string; domain: string; bylines: Array<{ publishedAt: Date | string; beats?: string[] }> }) => {
      const evidence: Evidence[] = [];
      let relationshipScore = 0;
      let relationship: OutletAssociation['relationship'] = 'unknown';
      
      // Analyze email domain match
      const emailDomain = contact.email.split('@')[1];
      const emailMatches = outlet.domain === emailDomain;
      
      if (emailMatches) {
        relationshipScore += 0.4;
        relationship = 'staff';
        evidence.push({
          type: 'email',
          source: 'Email domain analysis',
          content: `Email domain matches outlet domain: ${emailDomain}`,
          timestamp: new Date(),
          confidence: 0.9
        });
      }
      
      // Analyze byline frequency
      const bylineAnalysis = this.analyzeOutletBylines(outlet.bylines);
      relationshipScore += bylineAnalysis.frequencyScore;
      
      if (bylineAnalysis.isRegular && bylineAnalysis.frequency > 4) {
        relationship = emailMatches ? 'staff' : 'freelancer';
      } else if (bylineAnalysis.frequency > 0) {
        relationship = 'contributor';
      }
      
      // Analyze title/bio for outlet-specific mentions
      if (contact.title && contact.title.toLowerCase().includes(outlet.name.toLowerCase())) {
        relationshipScore += 0.3;
        evidence.push({
          type: 'bio',
          source: 'Title analysis',
          content: `Title mentions outlet: ${contact.title}`,
          timestamp: new Date(),
          confidence: 0.8
        });
      }
      
      // Calculate activity level
      const activityLevel = this.calculateActivityLevel(bylineAnalysis);
      
      return {
        outletId: outlet.id,
        outletName: outlet.name,
        outletDomain: outlet.domain,
        relationship,
        confidence: Math.min(relationshipScore, 1.0),
        recencyScore: 0, // Will be calculated later
        activityLevel,
        lastByline: bylineAnalysis.lastByline,
        totalBylines: bylineAnalysis.totalBylines,
        recentBylines: bylineAnalysis.recentBylines,
        averageFrequency: bylineAnalysis.frequency,
        beats: bylineAnalysis.beats,
        evidence
      };
    });
  }
  
  /**
   * Calculate recency scores with weighted decay
   */
  private calculateRecencyScores(outlets: OutletAssociation[]): OutletAssociation[] {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    return outlets.map(outlet => {
      let recencyScore = 0;
      
      if (outlet.lastByline) {
        const daysSinceLastByline = (now.getTime() - outlet.lastByline.getTime()) / (24 * 60 * 60 * 1000);
        
        // Exponential decay with 30-day half-life
        const decayFactor = Math.exp(-daysSinceLastByline / 30);
        recencyScore = decayFactor;
        
        // Boost for very recent activity (last 7 days)
        if (daysSinceLastByline <= 7) {
          recencyScore *= 1.5;
        }
        
        // Boost for consistent recent activity
        if (outlet.recentBylines > 2) {
          recencyScore *= 1.2;
        }
        
        // Penalty for very old activity (>180 days)
        if (daysSinceLastByline > 180) {
          recencyScore *= 0.5;
        }
      }
      
      // Factor in total relationship strength
      recencyScore *= outlet.confidence;
      
      // Factor in activity level
      const activityMultiplier = {
        'high': 1.3,
        'medium': 1.0,
        'low': 0.7
      }[outlet.activityLevel];
      
      recencyScore *= activityMultiplier;
      
      return {
        ...outlet,
        recencyScore: Math.min(recencyScore, 1.0)
      };
    });
  }
  
  /**
   * Determine the primary outlet based on recency and relationship strength
   */
  private determinePrimaryOutlet(outlets: OutletAssociation[]): OutletAssociation | undefined {
    if (outlets.length === 0) return undefined;
    
    // Sort by combined score of recency and relationship confidence
    const scored = outlets.map(outlet => ({
      outlet,
      score: (outlet.recencyScore * 0.6) + (outlet.confidence * 0.4)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    const primary = scored[0];
    
    // Only return as primary if score is above threshold
    return primary.score > 0.3 ? primary.outlet : undefined;
  }
  
  /**
   * Generate activity summary
   */
  private generateActivitySummary(outlets: OutletAssociation[]): ActivitySummary {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const activeOutlets = outlets.filter(outlet => 
      outlet.lastByline && outlet.lastByline > ninetyDaysAgo
    );
    
    const totalBylines = outlets.reduce((sum, outlet) => sum + outlet.totalBylines, 0);
    const recentBylines = outlets.reduce((sum, outlet) => sum + outlet.recentBylines, 0);
    
    // Calculate diversity index (how evenly distributed across outlets)
    const diversityIndex = this.calculateDiversityIndex(outlets);
    
    // Determine recency pattern
    const recencyPattern = this.determineRecencyPattern(outlets);
    
    // Find most recent activity
    const lastActivity = outlets.reduce((latest, outlet) => {
      if (!outlet.lastByline) return latest;
      return !latest || outlet.lastByline > latest ? outlet.lastByline : latest;
    }, null as Date | null);
    
    // Calculate primary outlet score
    const primaryOutletScore = outlets.length > 0 
      ? Math.max(...outlets.map(o => o.recencyScore))
      : 0;
    
    return {
      totalOutlets: outlets.length,
      activeOutlets: activeOutlets.length,
      primaryOutletScore,
      diversityIndex,
      recencyPattern,
      lastActivity: lastActivity || new Date(0)
    };
  }
  
  /**
   * Develop contact strategy based on analysis
   */
  private developContactStrategy(
    isFreelancer: boolean,
    outlets: OutletAssociation[],
    primaryOutlet: OutletAssociation | undefined,
    activity: ActivitySummary
  ): ContactStrategy {
    const notes: string[] = [];
    const warnings: string[] = [];
    
    let contactTiming: ContactStrategy['contactTiming'] = 'immediate';
    let pitchApproach: ContactStrategy['pitchApproach'] = 'outlet_specific';
    const preferredOutlet = primaryOutlet?.outletName || 'Unknown';
    
    if (isFreelancer) {
      pitchApproach = 'personal_brand';
      notes.push('Contact writes for multiple outlets - pitch to their personal brand/expertise');
      
      if (activity.diversityIndex > 0.7) {
        notes.push('Highly diversified across outlets - consider broad, expertise-based pitches');
      }
      
      if (primaryOutlet && primaryOutlet.recencyScore > 0.7) {
        notes.push(`Most active at ${primaryOutlet.outletName} - consider outlet-specific angle`);
        pitchApproach = 'outlet_specific';
      }
      
      if (activity.activeOutlets === 0) {
        contactTiming = 'monitor';
        warnings.push('No recent activity - may be inactive or between assignments');
      } else if (activity.activeOutlets === 1) {
        notes.push('Currently focused on one outlet - good timing for pitches');
      }
      
    } else {
      // Staff writer
      pitchApproach = 'outlet_specific';
      notes.push('Staff writer - use outlet-specific pitches and follow outlet guidelines');
      
      if (activity.recencyPattern === 'declining') {
        contactTiming = 'monitor';
        warnings.push('Activity appears to be declining - verify current status');
      }
    }
    
    // Seasonal patterns
    if (activity.recencyPattern === 'sporadic') {
      contactTiming = 'monitor';
      notes.push('Sporadic publishing pattern - monitor for active periods');
    }
    
    // Multi-outlet strategy
    if (outlets.length > 3) {
      notes.push(`Writes for ${outlets.length} outlets - very well-connected freelancer`);
      pitchApproach = 'multi_outlet';
    }
    
    return {
      preferredOutlet,
      contactTiming,
      pitchApproach,
      notes,
      warnings
    };
  }
  
  /**
   * Analyze byline frequency for an outlet
   */
  private analyzeBylineFrequency(outlets: Array<{ bylines: Array<{ publishedAt: Date | string }> }>): {
    isIrregular: boolean;
    averageGap: number;
    pattern: string;
  } {
    let totalGaps = 0;
    let gapCount = 0;
    let isIrregular = false;
    
    for (const outlet of outlets) {
      if (outlet.bylines.length < 2) continue;
      
      const sortedBylines = outlet.bylines.sort((a: { publishedAt: Date | string }, b: { publishedAt: Date | string }) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      
      for (let i = 1; i < sortedBylines.length; i++) {
        const gap = new Date(sortedBylines[i-1].publishedAt).getTime() - 
                   new Date(sortedBylines[i].publishedAt).getTime();
        const gapDays = gap / (24 * 60 * 60 * 1000);
        
        totalGaps += gapDays;
        gapCount++;
        
        // Check for irregular patterns (gaps > 60 days or very frequent < 3 days)
        if (gapDays > 60 || gapDays < 3) {
          isIrregular = true;
        }
      }
    }
    
    const averageGap = gapCount > 0 ? totalGaps / gapCount : 0;
    
    return {
      isIrregular,
      averageGap,
      pattern: averageGap > 30 ? 'sporadic' : averageGap < 7 ? 'frequent' : 'regular'
    };
  }
  
  /**
   * Analyze bylines for a specific outlet
   */
  private analyzeOutletBylines(bylines: Array<{ publishedAt: Date | string; beats?: string[]; title?: string; url?: string }>): {
    totalBylines: number;
    recentBylines: number;
    lastByline: Date;
    frequency: number;
    isRegular: boolean;
    beats: string[];
    frequencyScore: number;
  } {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const recentBylines = bylines.filter(byline => 
      new Date(byline.publishedAt) > ninetyDaysAgo
    ).length;
    
    const yearBylines = bylines.filter(byline => 
      new Date(byline.publishedAt) > oneYearAgo
    ).length;
    
    const lastByline = bylines.length > 0 
      ? new Date(Math.max(...bylines.map(b => new Date(b.publishedAt).getTime())))
      : new Date(0);
    
    const frequency = yearBylines / 12; // Articles per month
    const isRegular = frequency > 1 && recentBylines > 0;
    
    // Extract beats from bylines
    const beats = [...new Set(bylines.flatMap(byline => byline.beats || []))];
    
    // Calculate frequency score for relationship analysis
    let frequencyScore = 0;
    if (frequency > 8) frequencyScore = 0.4; // Very frequent
    else if (frequency > 4) frequencyScore = 0.3; // Regular
    else if (frequency > 1) frequencyScore = 0.2; // Occasional
    else if (frequency > 0) frequencyScore = 0.1; // Rare
    
    return {
      totalBylines: bylines.length,
      recentBylines,
      lastByline,
      frequency,
      isRegular,
      beats,
      frequencyScore
    };
  }
  
  /**
   * Calculate activity level based on byline analysis
   */
  private calculateActivityLevel(bylineAnalysis: any): 'high' | 'medium' | 'low' {
    if (bylineAnalysis.frequency > 4 && bylineAnalysis.recentBylines > 2) {
      return 'high';
    } else if (bylineAnalysis.frequency > 1 && bylineAnalysis.recentBylines > 0) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * Calculate diversity index (how evenly distributed across outlets)
   */
  private calculateDiversityIndex(outlets: OutletAssociation[]): number {
    if (outlets.length <= 1) return 0;
    
    const totalBylines = outlets.reduce((sum, outlet) => sum + outlet.totalBylines, 0);
    if (totalBylines === 0) return 0;
    
    // Calculate Shannon diversity index
    let diversity = 0;
    for (const outlet of outlets) {
      if (outlet.totalBylines > 0) {
        const proportion = outlet.totalBylines / totalBylines;
        diversity -= proportion * Math.log2(proportion);
      }
    }
    
    // Normalize to 0-1 scale
    const maxDiversity = Math.log2(outlets.length);
    return maxDiversity > 0 ? diversity / maxDiversity : 0;
  }
  
  /**
   * Determine recency pattern from outlet activity
   */
  private determineRecencyPattern(outlets: OutletAssociation[]): ActivitySummary['recencyPattern'] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const recentActivity = outlets.filter(o => o.lastByline && o.lastByline > thirtyDaysAgo).length;
    const mediumActivity = outlets.filter(o => o.lastByline && o.lastByline > ninetyDaysAgo).length;
    const totalActivity = outlets.filter(o => o.totalBylines > 0).length;
    
    if (recentActivity > mediumActivity * 0.8) {
      return 'increasing';
    } else if (recentActivity === 0 && mediumActivity > 0) {
      return 'declining';
    } else if (mediumActivity < totalActivity * 0.5) {
      return 'sporadic';
    } else {
      return 'consistent';
    }
  }
  
  /**
   * Batch analyze multiple contacts for freelancer status
   */
  analyzeFreelancers(contacts: any[]): FreelancerProfile[] {
    return contacts.map(contact => this.analyzeFreelancer(contact));
  }
  
  /**
   * Update freelancer profile with new byline data
   */
  updateFreelancerProfile(
    profile: FreelancerProfile, 
    newBylines: Array<{
      outletId: string;
      bylines: any[];
    }>
  ): FreelancerProfile {
    // Update outlet associations with new byline data
    const updatedOutlets = profile.outlets.map(outlet => {
      const newOutletBylines = newBylines.find(nb => nb.outletId === outlet.outletId);
      if (newOutletBylines) {
        const bylineAnalysis = this.analyzeOutletBylines(newOutletBylines.bylines);
        return {
          ...outlet,
          lastByline: bylineAnalysis.lastByline,
          totalBylines: bylineAnalysis.totalBylines,
          recentBylines: bylineAnalysis.recentBylines,
          averageFrequency: bylineAnalysis.frequency,
          beats: bylineAnalysis.beats,
          activityLevel: this.calculateActivityLevel(bylineAnalysis)
        };
      }
      return outlet;
    });
    
    // Recalculate scores and strategy
    const scoredOutlets = this.calculateRecencyScores(updatedOutlets);
    const primaryOutlet = this.determinePrimaryOutlet(scoredOutlets);
    const activitySummary = this.generateActivitySummary(scoredOutlets);
    const contactStrategy = this.developContactStrategy(
      profile.isFreelancer,
      scoredOutlets,
      primaryOutlet,
      activitySummary
    );
    
    return {
      ...profile,
      outlets: scoredOutlets,
      primaryOutlet,
      recentActivity: activitySummary,
      contactStrategy
    };
  }
}