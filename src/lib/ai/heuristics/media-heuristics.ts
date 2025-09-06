/**
 * Media Heuristics - Orchestrator for Media-Smart Analysis
 * Combines beat analysis, email analysis, freelancer detection, and syndication detection
 */

import { BeatAnalyzer, BeatAnalysis } from './beat-analyzer';
import { EmailAnalyzer, EmailAnalysis } from './email-analyzer';
import { FreelancerAnalyzer, FreelancerProfile } from './freelancer-analyzer';
import { SyndicationDetector, SyndicationAnalysis } from './syndication-detector';

export interface MediaHeuristicsAnalysis {
  contactId: string;
  beatAnalysis: BeatAnalysis;
  emailAnalysis: EmailAnalysis;
  freelancerProfile?: FreelancerProfile;
  syndicationAnalysis?: SyndicationAnalysis;
  overallScore: number;
  recommendations: MediaRecommendation[];
  warnings: string[];
  metadata: {
    analysisVersion: string;
    timestamp: Date;
    processingTime: number;
  };
}

export interface MediaRecommendation {
  type: 'contact_strategy' | 'beat_assignment' | 'email_preference' | 'content_verification';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  confidence: number;
}

export interface ContactInput {
  id: string;
  name: string;
  email: string;
  title?: string;
  bio?: string;
  outlets?: Array<{
    id: string;
    name: string;
    domain: string;
    bylines?: Array<{
      title: string;
      url: string;
      publishedAt: Date;
      beats: string[];
      content?: string;
    }>;
  }>;
  socialProfiles?: {
    twitter?: string;
    linkedin?: string;
  };
}

export interface ContentInput {
  url: string;
  title: string;
  content?: string;
  byline?: string;
  publishedAt: Date;
  domain: string;
  sectionPath?: string;
  canonicalUrl?: string;
  metaTags?: Record<string, string>;
}

export class MediaHeuristics {
  private beatAnalyzer: BeatAnalyzer;
  private emailAnalyzer: EmailAnalyzer;
  private freelancerAnalyzer: FreelancerAnalyzer;
  private syndicationDetector: SyndicationDetector;
  
  constructor() {
    this.beatAnalyzer = new BeatAnalyzer();
    this.emailAnalyzer = new EmailAnalyzer();
    this.freelancerAnalyzer = new FreelancerAnalyzer();
    this.syndicationDetector = new SyndicationDetector();
  }
  
  /**
   * Comprehensive analysis of a media contact
   */
  async analyzeContact(contact: ContactInput): Promise<MediaHeuristicsAnalysis> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const recommendations: MediaRecommendation[] = [];
    
    // 1. Beat Analysis - analyze all content for beat determination
    const beatAnalysis = this.analyzeBeatFromContact(contact);
    
    // 2. Email Analysis
    const emailAnalysis = this.emailAnalyzer.analyzeEmail(
      contact.email,
      undefined,
      {
        contactName: contact.name,
        title: contact.title
      }
    );
    
    // 3. Freelancer Analysis (if multiple outlets)
    let freelancerProfile: FreelancerProfile | undefined;
    if (contact.outlets && contact.outlets.length > 0) {
      // Normalize outlets to match FreelancerAnalyzer expected shape
      const normalizedOutlets = contact.outlets.map(o => ({
        id: o.id,
        name: o.name,
        domain: o.domain,
        bylines: (o.bylines ?? []).map(b => ({
          title: b.title,
          url: b.url,
          publishedAt: b.publishedAt,
          beats: b.beats
        }))
      }));

      freelancerProfile = this.freelancerAnalyzer.analyzeFreelancer({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        title: contact.title,
        bio: contact.bio,
        outlets: normalizedOutlets,
        socialProfiles: contact.socialProfiles
      });
    }
    
    // 4. Generate recommendations based on all analyses
    this.generateContactRecommendations(
      beatAnalysis,
      emailAnalysis,
      freelancerProfile,
      recommendations,
      warnings
    );
    
    // 5. Calculate overall score
    const overallScore = this.calculateOverallScore(
      beatAnalysis,
      emailAnalysis,
      freelancerProfile
    );
    
    const processingTime = Date.now() - startTime;
    
    return {
      contactId: contact.id,
      beatAnalysis,
      emailAnalysis,
      freelancerProfile,
      overallScore,
      recommendations,
      warnings,
      metadata: {
        analysisVersion: '1.0.0',
        timestamp: new Date(),
        processingTime
      }
    };
  }
  
  /**
   * Analyze content for syndication and beat information
   */
  async analyzeContent(content: ContentInput): Promise<{
    beatAnalysis: BeatAnalysis;
    syndicationAnalysis: SyndicationAnalysis;
    recommendations: MediaRecommendation[];
    shouldSkip: boolean;
  }> {
    const recommendations: MediaRecommendation[] = [];
    
    // 1. Beat Analysis
    const beatAnalysis = this.beatAnalyzer.analyzeBeat({
      sectionPath: content.sectionPath,
      title: content.title,
      content: content.content,
      byline: content.byline,
      url: content.url
    });
    
    // 2. Syndication Analysis
    const syndicationAnalysis = this.syndicationDetector.analyzeSyndication(content);
    
    // 3. Generate content recommendations
    this.generateContentRecommendations(
      beatAnalysis,
      syndicationAnalysis,
      recommendations
    );
    
    // 4. Determine if content should be skipped
    const shouldSkip = syndicationAnalysis.isSyndicated && syndicationAnalysis.confidence > 0.7;
    
    return {
      beatAnalysis,
      syndicationAnalysis,
      recommendations,
      shouldSkip
    };
  }
  
  /**
   * Batch analyze multiple contacts
   */
  async batchAnalyzeContacts(contacts: ContactInput[]): Promise<MediaHeuristicsAnalysis[]> {
    const analyses = await Promise.all(
      contacts.map(contact => this.analyzeContact(contact))
    );
    
    // Cross-reference analyses for additional insights
    this.crossReferenceAnalyses(analyses);
    
    return analyses;
  }
  
  /**
   * Batch analyze content for syndication filtering
   */
  async batchAnalyzeContent(contents: ContentInput[]): Promise<{
    originalContent: Array<{ content: ContentInput; analysis: any }>;
    syndicatedContent: Array<{ content: ContentInput; analysis: any }>;
    recommendations: MediaRecommendation[];
  }> {
    const analyses = await Promise.all(
      contents.map(content => this.analyzeContent(content))
    );
    
    const originalContent = contents
      .map((content, index) => ({ content, analysis: analyses[index] }))
      .filter(({ analysis }) => !analysis.shouldSkip);
    
    const syndicatedContent = contents
      .map((content, index) => ({ content, analysis: analyses[index] }))
      .filter(({ analysis }) => analysis.shouldSkip);
    
    const recommendations: MediaRecommendation[] = [];
    
    if (syndicatedContent.length > 0) {
      recommendations.push({
        type: 'content_verification',
        priority: 'high',
        title: 'Syndicated Content Detected',
        description: `Found ${syndicatedContent.length} pieces of syndicated content`,
        action: 'Use original sources for contact discovery',
        confidence: 0.9
      });
    }
    
    return {
      originalContent,
      syndicatedContent,
      recommendations
    };
  }
  
  /**
   * Analyze beats from contact's content history
   */
  private analyzeBeatFromContact(contact: ContactInput): BeatAnalysis {
    if (!contact.outlets || contact.outlets.length === 0) {
      // Fallback to bio/title analysis
      return this.beatAnalyzer.analyzeBeat({
        title: contact.title,
        content: contact.bio
      });
    }
    
    // Analyze all bylines to determine beats
    const allAnalyses: BeatAnalysis[] = [];
    
    for (const outlet of contact.outlets) {
      if (outlet.bylines) {
        for (const byline of outlet.bylines) {
          const analysis = this.beatAnalyzer.analyzeBeat({
            sectionPath: this.extractSectionFromUrl(byline.url),
            title: byline.title,
            content: byline.content,
            url: byline.url
          });
          allAnalyses.push(analysis);
        }
      }
    }
    
    if (allAnalyses.length === 0) {
      return this.beatAnalyzer.analyzeBeat({
        title: contact.title,
        content: contact.bio
      });
    }
    
    // Merge all analyses with recency weighting
    return this.beatAnalyzer.mergeBeatAnalyses(allAnalyses);
  }
  
  /**
   * Generate contact-specific recommendations
   */
  private generateContactRecommendations(
    beatAnalysis: BeatAnalysis,
    emailAnalysis: EmailAnalysis,
    freelancerProfile: FreelancerProfile | undefined,
    recommendations: MediaRecommendation[],
    warnings: string[]
  ): void {
    
    // Beat-based recommendations
    if (beatAnalysis.confidence < 0.6) {
      warnings.push('Low confidence in beat assignment - verify manually');
      recommendations.push({
        type: 'beat_assignment',
        priority: 'medium',
        title: 'Verify Beat Assignment',
        description: 'Beat analysis has low confidence',
        action: 'Review recent articles to confirm beat coverage',
        confidence: 1 - beatAnalysis.confidence
      });
    }
    
    if (beatAnalysis.sources.sectionBased.length > 0) {
      recommendations.push({
        type: 'beat_assignment',
        priority: 'high',
        title: 'Section-Based Beats Detected',
        description: 'Beats determined from section analysis (high confidence)',
        action: 'Use section-based beats for targeting',
        confidence: 0.9
      });
    }
    
    // Email-based recommendations
    if (emailAnalysis.emailType === 'alias') {
      warnings.push(`Email is ${emailAnalysis.aliasType} alias - may have lower response rates`);
      recommendations.push({
        type: 'email_preference',
        priority: 'medium',
        title: 'Alias Email Detected',
        description: emailAnalysis.suggestions?.contactMethod || 'Consider finding direct contact',
        action: emailAnalysis.suggestions?.notes || 'Look for personal email address',
        confidence: emailAnalysis.confidence
      });
    }
    
    if (emailAnalysis.emailType === 'personal' && emailAnalysis.priority === 'high') {
      recommendations.push({
        type: 'email_preference',
        priority: 'high',
        title: 'Direct Personal Contact',
        description: 'High-quality personal email address',
        action: 'Prioritize this contact for outreach',
        confidence: emailAnalysis.confidence
      });
    }
    
    // Freelancer-based recommendations
    if (freelancerProfile) {
      if (freelancerProfile.isFreelancer) {
        recommendations.push({
          type: 'contact_strategy',
          priority: 'high',
          title: 'Freelancer Contact Strategy',
          description: freelancerProfile.contactStrategy.pitchApproach === 'personal_brand' 
            ? 'Pitch to personal brand/expertise' 
            : 'Use outlet-specific approach',
          action: freelancerProfile.contactStrategy.notes.join('; '),
          confidence: freelancerProfile.confidence
        });
        
        if (freelancerProfile.contactStrategy.warnings.length > 0) {
          warnings.push(...freelancerProfile.contactStrategy.warnings);
        }
        
        if (freelancerProfile.primaryOutlet) {
          recommendations.push({
            type: 'contact_strategy',
            priority: 'medium',
            title: 'Primary Outlet Identified',
            description: `Most active at ${freelancerProfile.primaryOutlet.outletName}`,
            action: 'Consider outlet-specific pitches for this publication',
            confidence: freelancerProfile.primaryOutlet.confidence
          });
        }
      } else {
        recommendations.push({
          type: 'contact_strategy',
          priority: 'medium',
          title: 'Staff Writer Strategy',
          description: 'Contact appears to be staff writer',
          action: 'Use outlet-specific pitches and follow outlet guidelines',
          confidence: freelancerProfile.confidence
        });
      }
    }
  }
  
  /**
   * Generate content-specific recommendations
   */
  private generateContentRecommendations(
    beatAnalysis: BeatAnalysis,
    syndicationAnalysis: SyndicationAnalysis,
    recommendations: MediaRecommendation[]
  ): void {
    
    // Syndication recommendations
    if (syndicationAnalysis.isSyndicated) {
      recommendations.push(...syndicationAnalysis.recommendations.map(rec => ({
        type: 'content_verification' as const,
        priority: rec.priority,
        title: rec.description,
        description: rec.action,
        action: rec.action,
        confidence: syndicationAnalysis.confidence
      })));
    }
    
    // Beat recommendations
    if (beatAnalysis.sources.sectionBased.length > 0) {
      recommendations.push({
        type: 'beat_assignment',
        priority: 'high',
        title: 'Section-Based Beat Detection',
        description: 'Beats determined from URL section (high confidence)',
        action: 'Prioritize section-based beats over keyword detection',
        confidence: beatAnalysis.confidence
      });
    }
  }
  
  /**
   * Calculate overall contact quality score
   */
  private calculateOverallScore(
    beatAnalysis: BeatAnalysis,
    emailAnalysis: EmailAnalysis,
    freelancerProfile?: FreelancerProfile
  ): number {
    let score = 0;
    let weights = 0;
    
    // Beat analysis score (30% weight)
    score += beatAnalysis.confidence * 30;
    weights += 30;
    
    // Email analysis score (25% weight)
    const emailScore = this.emailAnalyzer.calculateEmailScore(emailAnalysis) / 100;
    score += emailScore * 25;
    weights += 25;
    
    // Freelancer analysis score (20% weight)
    if (freelancerProfile) {
      const freelancerScore = freelancerProfile.isFreelancer ? 
        freelancerProfile.recentActivity.primaryOutletScore : 
        freelancerProfile.confidence;
      score += freelancerScore * 20;
      weights += 20;
    }
    
    // Activity recency (25% weight)
    if (freelancerProfile) {
      const recencyScore = freelancerProfile.recentActivity.activeOutlets > 0 ? 0.8 : 0.3;
      score += recencyScore * 25;
      weights += 25;
    } else {
      // Default recency score if no freelancer profile
      score += 0.6 * 25;
      weights += 25;
    }
    
    return weights > 0 ? Math.min(score / weights, 1.0) : 0;
  }
  
  /**
   * Cross-reference analyses for additional insights
   */
  private crossReferenceAnalyses(analyses: MediaHeuristicsAnalysis[]): void {
    // Group by outlet to identify patterns
    const outletGroups = new Map<string, MediaHeuristicsAnalysis[]>();
    
    for (const analysis of analyses) {
      if (analysis.freelancerProfile?.outlets) {
        for (const outlet of analysis.freelancerProfile.outlets) {
          const existing = outletGroups.get(outlet.outletName) || [];
          existing.push(analysis);
          outletGroups.set(outlet.outletName, existing);
        }
      }
    }
    
    // Add cross-reference recommendations
    for (const [outletName, outletAnalyses] of outletGroups) {
      if (outletAnalyses.length > 1) {
        for (const analysis of outletAnalyses) {
          analysis.recommendations.push({
            type: 'contact_strategy',
            priority: 'low',
            title: 'Multiple Contacts at Outlet',
            description: `Found ${outletAnalyses.length} contacts at ${outletName}`,
            action: 'Consider coordinating outreach to avoid overlap',
            confidence: 0.8
          });
        }
      }
    }
  }
  
  /**
   * Extract section path from URL
   */
  private extractSectionFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return '';
    }
  }
  
  /**
   * Get heuristics statistics
   */
  getStatistics(): {
    totalAnalyses: number;
    beatAnalysisStats: {
      sectionBasedCount: number;
      keywordBasedCount: number;
      averageConfidence: number;
    };
    emailAnalysisStats: {
      personalEmails: number;
      aliasEmails: number;
      genericEmails: number;
    };
    freelancerStats: {
      freelancerCount: number;
      staffCount: number;
      multiOutletCount: number;
    };
    syndicationStats: any;
  } {
    // This would be implemented with actual tracking
    return {
      totalAnalyses: 0,
      beatAnalysisStats: {
        sectionBasedCount: 0,
        keywordBasedCount: 0,
        averageConfidence: 0
      },
      emailAnalysisStats: {
        personalEmails: 0,
        aliasEmails: 0,
        genericEmails: 0
      },
      freelancerStats: {
        freelancerCount: 0,
        staffCount: 0,
        multiOutletCount: 0
      },
      syndicationStats: this.syndicationDetector.getSyndicationStats()
    };
  }
  
  /**
   * Clear caches and reset state
   */
  reset(): void {
    this.syndicationDetector.clearFingerprints();
  }
}