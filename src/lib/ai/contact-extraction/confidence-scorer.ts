/**
 * Confidence Scoring Algorithm
 * Calculates confidence and quality scores for extracted contacts
 */

import {
  ExtractedContact,
  ParsedContent,
  ConfidenceFactors,
  QualityFactors,
  ContactExtractionError,
  ExtractionMethod
} from './types';

export class ConfidenceScorer {
  private readonly weights = {
    // Confidence weights
    nameClarity: 0.25,
    emailPresence: 0.20,
    titleRelevance: 0.15,
    bioCompleteness: 0.15,
    socialVerification: 0.15,
    sourceAuthority: 0.10,

    // Quality weights
    contentFreshness: 0.20,
    sourceCredibility: 0.25,
    informationConsistency: 0.20,
    contactCompleteness: 0.20,
    verificationStatus: 0.15
  };

  /**
   * Calculate comprehensive confidence score for a contact
   */
  calculateConfidenceScore(
    contact: ExtractedContact,
    context: {
      content: ParsedContent;
      sourceCredibility: number;
      contentFreshness: number;
    }
  ): {
    confidenceScore: number;
    confidenceFactors: ConfidenceFactors;
    reasoning: string[];
    recommendations: string[];
  } {
    const reasoning: string[] = [];
    const recommendations: string[] = [];

    // Individual confidence factors
    const nameConfidence = this.calculateNameConfidence(contact.name, reasoning, recommendations);
    const emailConfidence = this.calculateEmailConfidence(contact.email, reasoning, recommendations);
    const titleConfidence = this.calculateTitleConfidence(contact.title, reasoning, recommendations);
    const bioConfidence = this.calculateBioConfidence(contact.bio, reasoning, recommendations);
    const socialConfidence = this.calculateSocialConfidence(contact.socialProfiles, reasoning, recommendations);
    const sourceAuthorityConfidence = this.calculateSourceAuthorityConfidence(context.sourceCredibility, reasoning);

    // Calculate overall confidence
    const overallConfidence = Math.round(
      (nameConfidence * this.weights.nameClarity +
       emailConfidence * this.weights.emailPresence +
       titleConfidence * this.weights.titleRelevance +
       bioConfidence * this.weights.bioCompleteness +
       socialConfidence * this.weights.socialVerification +
       sourceAuthorityConfidence * this.weights.sourceAuthority) * 100
    ) / 100;

    const confidenceFactors: ConfidenceFactors = {
      nameConfidence,
      emailConfidence,
      titleConfidence,
      bioConfidence,
      socialConfidence,
      overallConfidence
    };

    // Generate final reasoning
    if (overallConfidence >= 0.8) {
      reasoning.push('High confidence contact with complete information');
    } else if (overallConfidence >= 0.6) {
      reasoning.push('Medium confidence contact with some verification');
    } else {
      reasoning.push('Lower confidence contact, needs additional verification');
    }

    return {
      confidenceScore: overallConfidence,
      confidenceFactors,
      reasoning,
      recommendations
    };
  }

  /**
   * Calculate quality score for a contact
   */
  calculateQualityScore(
    contact: ExtractedContact,
    context: {
      content: ParsedContent;
      sourceCredibility: number;
      contentFreshness: number;
      consistencyScore: number;
    }
  ): {
    qualityScore: number;
    qualityFactors: QualityFactors;
    reasoning: string[];
    improvementSuggestions: string[];
  } {
    const reasoning: string[] = [];
    const improvementSuggestions: string[] = [];

    // Individual quality factors
    const sourceCredibility = this.normalizeSourceCredibility(context.sourceCredibility, reasoning);
    const contentFreshness = this.normalizeContentFreshness(context.contentFreshness, reasoning);
    const informationConsistency = this.normalizeInformationConsistency(context.consistencyScore, reasoning, improvementSuggestions);
    const contactCompleteness = this.calculateContactCompleteness(contact, reasoning, improvementSuggestions);
    const verificationStatus = this.calculateVerificationStatusScore(contact.verificationStatus, reasoning, improvementSuggestions);

    // Calculate overall quality
    const overallQuality = Math.round(
      (sourceCredibility * this.weights.sourceCredibility +
       contentFreshness * this.weights.contentFreshness +
       informationConsistency * this.weights.informationConsistency +
       contactCompleteness * this.weights.contactCompleteness +
       verificationStatus * this.weights.verificationStatus) * 100
    ) / 100;

    const qualityFactors: QualityFactors = {
      sourceCredibility,
      contentFreshness,
      contactCompleteness,
      informationConsistency,
      overallQuality
    };

    // Generate final reasoning
    if (overallQuality >= 0.8) {
      reasoning.push('High quality contact from authoritative source');
    } else if (overallQuality >= 0.6) {
      reasoning.push('Good quality contact with moderate verification');
    } else {
      reasoning.push('Quality concerns detected, needs review');
    }

    return {
      qualityScore: overallQuality,
      qualityFactors,
      reasoning,
      improvementSuggestions
    };
  }

  /**
   * Calculate relevance score for contact based on content context
   */
  calculateRelevanceScore(
    contact: ExtractedContact,
    content: ParsedContent,
    targetCriteria?: {
      beats?: string[];
      outlets?: string[];
      regions?: string[];
      languages?: string[];
    }
  ): number {
    let relevanceScore = 0.5; // Base score

    const contentLower = content.content.toLowerCase();
    const titleLower = content.title?.toLowerCase() || '';
    const authorLower = content.author?.toLowerCase() || '';

    // Check for journalist indicators
    const journalistIndicators = ['journalist', 'reporter', 'editor', 'author', 'writer', 'correspondent', 'contributor'];
    const contactText = `${contact.name} ${contact.title} ${contact.bio}`.toLowerCase();

    if (journalistIndicators.some(indicator => contactText.includes(indicator))) {
      relevanceScore += 0.2;
    }

    // Check for media outlet mentions
    if (contact.bio) {
      const mediaIndicators = ['new york times', 'washington post', 'cnn', 'bbc', 'reuters', 'associated press'];
      if (mediaIndicators.some(indicator => contact.bio.toLowerCase().includes(indicator))) {
        relevanceScore += 0.15;
      }
    }

    // Check if contact appears in author/byline sections
    if (contact.name.toLowerCase() === authorLower || contentLower.includes(`by ${contact.name.toLowerCase()}`)) {
      relevanceScore += 0.15;
    }

    // Check for contact information in content
    if (contact.email && contentLower.includes(contact.email.toLowerCase())) {
      relevanceScore += 0.1;
    }

    // Check title relevance
    if (contact.title) {
      const relevantTitles = ['editor', 'reporter', 'journalist', 'writer', 'contributor', 'correspondent'];
      if (relevantTitles.some(title => contact.title!.toLowerCase().includes(title))) {
        relevanceScore += 0.1;
      }
    }

    // Check against target criteria if provided
    if (targetCriteria) {
      if (targetCriteria.beats && targetCriteria.beats.length > 0) {
        const beatMatch = targetCriteria.beats.some(beat =>
          contact.bio?.toLowerCase().includes(beat.toLowerCase())
        );
        if (beatMatch) relevanceScore += 0.1;
      }

      if (targetCriteria.outlets && targetCriteria.outlets.length > 0) {
        const outletMatch = targetCriteria.outlets.some(outlet =>
          content.metadata.domain?.toLowerCase().includes(outlet.toLowerCase()) ||
          contact.bio?.toLowerCase().includes(outlet.toLowerCase())
        );
        if (outletMatch) relevanceScore += 0.1;
      }

      if (targetCriteria.languages && targetCriteria.languages.length > 0) {
        const langMatch = targetCriteria.languages.some(lang =>
          content.language === lang || contact.metadata.languages?.includes(lang)
        );
        if (langMatch) relevanceScore += 0.05;
      }
    }

    return Math.min(relevanceScore, 1.0);
  }

  /**
   * Calculate name confidence score
   */
  private calculateNameConfidence(name: string, reasoning: string[], recommendations: string[]): number {
    let confidence = 0;

    if (!name || name.trim().length === 0) {
      reasoning.push('Missing name');
      recommendations.push('Contact should have a valid name');
      return 0;
    }

    const cleanName = name.trim();

    // Check name format
    const nameParts = cleanName.split(' ').filter(part => part.length > 0);

    if (nameParts.length >= 2) {
      confidence += 0.4; // First + last name
      reasoning.push('Complete name provided');
    } else if (nameParts.length === 1) {
      confidence += 0.2; // Single name
      reasoning.push('Single name provided');
      recommendations.push('Consider finding full name');
    }

    // Check for realistic name patterns
    if (this.isRealisticName(cleanName)) {
      confidence += 0.3;
      reasoning.push('Name format appears realistic');
    } else {
      reasoning.push('Name format seems unusual');
      recommendations.push('Verify name authenticity');
    }

    // Check for title contamination
    if (this.hasTitleContamination(cleanName)) {
      confidence -= 0.2;
      reasoning.push('Name may contain title information');
      recommendations.push('Separate name from title');
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(cleanName)) {
      confidence -= 0.3;
      reasoning.push('Name contains suspicious patterns');
      recommendations.push('Review name for authenticity');
    }

    // Length bonus
    if (cleanName.length >= 5 && cleanName.length <= 30) {
      confidence += 0.1;
      reasoning.push('Name length is appropriate');
    }

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Calculate email confidence score
   */
  private calculateEmailConfidence(email?: string, reasoning: string[], recommendations: string[]): number {
    if (!email) {
      reasoning.push('No email provided');
      recommendations.push('Add email address if available');
      return 0;
    }

    let confidence = 0;

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(email)) {
      confidence += 0.3;
      reasoning.push('Valid email format');
    } else {
      reasoning.push('Invalid email format');
      return 0;
    }

    // Professional vs generic email
    if (this.isProfessionalEmail(email)) {
      confidence += 0.4;
      reasoning.push('Professional email format');
    } else if (this.isGenericEmail(email)) {
      confidence += 0.1;
      reasoning.push('Generic email format');
      recommendations.push('Look for personal email alternative');
    }

    // Domain credibility
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      if (this.isCredibleDomain(domain)) {
        confidence += 0.2;
        reasoning.push('Email domain appears credible');
      } else if (this.isSuspiciousDomain(domain)) {
        confidence -= 0.2;
        reasoning.push('Email domain seems suspicious');
        recommendations.push('Verify email domain authenticity');
      }
    }

    // Personalization indicators
    if (this.isPersonalizedEmail(email)) {
      confidence += 0.1;
      reasoning.push('Email appears personalized');
    }

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Calculate title confidence score
   */
  private calculateTitleConfidence(title?: string, reasoning: string[], recommendations: string[]): number {
    if (!title) {
      reasoning.push('No title provided');
      recommendations.push('Add professional title if available');
      return 0;
    }

    let confidence = 0;

    // Professional title indicators
    const professionalTitles = [
      'editor', 'reporter', 'journalist', 'author', 'writer', 'correspondent',
      'analyst', 'expert', 'consultant', 'researcher', 'specialist',
      'senior', 'lead', 'chief', 'director', 'manager', 'head',
      'producer', 'anchor', 'host', 'contributor', 'columnist'
    ];

    const titleLower = title.toLowerCase();
    const matchedTitles = professionalTitles.filter(profTitle => titleLower.includes(profTitle));

    if (matchedTitles.length > 0) {
      confidence += 0.4;
      reasoning.push(`Professional title: ${matchedTitles.join(', ')}`);
    }

    // Media-specific indicators
    const mediaIndicators = ['news', 'media', 'publication', 'broadcast', 'journalism'];
    if (mediaIndicators.some(indicator => titleLower.includes(indicator))) {
      confidence += 0.2;
      reasoning.push('Media-related title');
    }

    // Seniority indicators
    const seniorityIndicators = ['senior', 'lead', 'chief', 'principal', 'executive', 'managing'];
    if (seniorityIndicators.some(indicator => titleLower.includes(indicator))) {
      confidence += 0.1;
      reasoning.push('Senior-level position indicated');
    }

    // Beat/coverage indicators
    const beatIndicators = ['politics', 'business', 'technology', 'health', 'science', 'arts', 'sports'];
    if (beatIndicators.some(indicator => titleLower.includes(indicator))) {
      confidence += 0.1;
      reasoning.push('Specific beat coverage indicated');
    }

    // Title length check
    if (title.length >= 10 && title.length <= 60) {
      confidence += 0.1;
      reasoning.push('Title length is appropriate');
    } else if (title.length > 60) {
      reasoning.push('Title is unusually long');
      recommendations.push('Verify title accuracy');
    }

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Calculate bio confidence score
   */
  private calculateBioConfidence(bio?: string, reasoning: string[], recommendations: string[]): number {
    if (!bio) {
      reasoning.push('No bio provided');
      recommendations.push('Add bio information if available');
      return 0;
    }

    let confidence = 0;

    // Length assessment
    if (bio.length >= 50 && bio.length <= 300) {
      confidence += 0.2;
      reasoning.push('Bio length is appropriate');
    } else if (bio.length < 30) {
      reasoning.push('Bio is very short');
      recommendations.push('Expand bio information');
    } else if (bio.length > 500) {
      reasoning.push('Bio is unusually long');
      recommendations.push('Verify bio relevance');
    }

    // Content quality indicators
    const qualityIndicators = ['award', 'published', 'education', 'experience', 'background'];
    const bioLower = bio.toLowerCase();
    const matchedIndicators = qualityIndicators.filter(indicator => bioLower.includes(indicator));

    if (matchedIndicators.length >= 2) {
      confidence += 0.3;
      reasoning.push('Bio contains professional background information');
    } else if (matchedIndicators.length >= 1) {
      confidence += 0.15;
      reasoning.push('Bio contains some professional information');
    }

    // Contact information in bio
    const contactIndicators = ['email', 'twitter', 'linkedin', 'contact', 'reach'];
    if (contactIndicators.some(indicator => bioLower.includes(indicator))) {
      confidence += 0.1;
      reasoning.push('Bio includes contact information');
    }

    // Media outlet mentions
    const mediaOutletPattern = /\b(new york times|washington post|wall street journal|cnn|bbc|reuters|associated press|npr|pbs)\b/gi;
    const outletMatches = bio.match(mediaOutletPattern);
    if (outletMatches && outletMatches.length > 0) {
      confidence += 0.2;
      reasoning.push(`Bio mentions media outlets: ${outletMatches.join(', ')}`);
    }

    // Professional language
    const professionalLanguage = ['specializes', 'covers', 'reports', 'writes', 'focuses', 'expertise'];
    const languageMatches = professionalLanguage.filter(term => bioLower.includes(term));
    if (languageMatches.length >= 2) {
      confidence += 0.1;
      reasoning.push('Bio uses professional language');
    }

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Calculate social media confidence score
   */
  private calculateSocialConfidence(
    socialProfiles?: any[],
    reasoning: string[],
    recommendations: string[]
  ): number {
    if (!socialProfiles || socialProfiles.length === 0) {
      reasoning.push('No social media profiles provided');
      recommendations.push('Add social media profiles if available');
      return 0;
    }

    let confidence = 0;

    // Number of profiles
    if (socialProfiles.length >= 2) {
      confidence += 0.2;
      reasoning.push('Multiple social media profiles');
    } else if (socialProfiles.length === 1) {
      confidence += 0.1;
      reasoning.push('Single social media profile');
    }

    // Platform credibility
    const crediblePlatforms = ['linkedin', 'twitter', 'instagram', 'facebook'];
    const credibleProfiles = socialProfiles.filter(profile =>
      crediblePlatforms.includes(profile.platform.toLowerCase())
    );

    if (credibleProfiles.length >= 2) {
      confidence += 0.3;
      reasoning.push('Multiple credible platform profiles');
    } else if (credibleProfiles.length === 1) {
      confidence += 0.15;
      reasoning.push('Single credible platform profile');
    }

    // Verification status
    const verifiedProfiles = socialProfiles.filter(profile => profile.verified);
    if (verifiedProfiles.length > 0) {
      confidence += 0.2;
      reasoning.push(`Verified profiles: ${verifiedProfiles.length}`);
    }

    // Follower count (indicative of influence)
    const totalFollowers = socialProfiles.reduce((sum, profile) =>
      sum + (profile.followers || 0), 0
    );

    if (totalFollowers > 10000) {
      confidence += 0.1;
      reasoning.push('Substantial follower count');
    } else if (totalFollowers > 1000) {
      confidence += 0.05;
      reasoning.push('Moderate follower count');
    }

    // Profile completeness
    const completeProfiles = socialProfiles.filter(profile =>
      profile.handle && profile.url && profile.description
    );

    if (completeProfiles.length === socialProfiles.length) {
      confidence += 0.1;
      reasoning.push('Complete profile information');
    }

    return Math.max(0, Math.min(confidence, 1));
  }

  /**
   * Calculate source authority confidence
   */
  private calculateSourceAuthorityConfidence(sourceCredibility: number, reasoning: string[]): number {
    if (sourceCredibility >= 0.8) {
      reasoning.push('Highly authoritative source');
      return sourceCredibility;
    } else if (sourceCredibility >= 0.6) {
      reasoning.push('Moderately authoritative source');
      return sourceCredibility;
    } else {
      reasoning.push('Source authority needs verification');
      return sourceCredibility;
    }
  }

  /**
   * Calculate contact completeness score
   */
  private calculateContactCompleteness(contact: ExtractedContact, reasoning: string[], suggestions: string[]): number {
    const fields = ['name', 'email', 'title', 'bio', 'socialProfiles'];
    const presentFields = fields.filter(field => {
      if (field === 'socialProfiles') {
        return contact[field] && contact[field]!.length > 0;
      }
      return contact[field as keyof ExtractedContact] &&
             contact[field as keyof ExtractedContact]!.toString().trim().length > 0;
    });

    const completeness = presentFields.length / fields.length;

    if (completeness >= 0.8) {
      reasoning.push('Contact information is complete');
    } else if (completeness >= 0.6) {
      reasoning.push('Contact information is mostly complete');
    } else {
      reasoning.push('Contact information is incomplete');
      suggestions.push('Add missing contact details');
    }

    return completeness;
  }

  /**
   * Calculate verification status score
   */
  private calculateVerificationStatusScore(verificationStatus: string, reasoning: string[], suggestions: string[]): number {
    switch (verificationStatus) {
      case 'CONFIRMED':
        reasoning.push('Contact has been confirmed');
        return 1.0;
      case 'PENDING':
        reasoning.push('Contact verification pending');
        suggestions.push('Complete contact verification');
        return 0.7;
      case 'MANUAL_REVIEW':
        reasoning.push('Contact requires manual review');
        suggestions.push('Review contact manually');
        return 0.4;
      case 'REJECTED':
        reasoning.push('Contact has been rejected');
        suggestions.push('Review rejection reasons');
        return 0.1;
      default:
        reasoning.push('Contact verification status unknown');
        suggestions.push('Determine verification status');
        return 0.5;
    }
  }

  /**
   * Normalize source credibility score
   */
  private normalizeSourceCredibility(credibility: number, reasoning: string[]): number {
    if (credibility >= 0.8) {
      reasoning.push('Highly credible source');
      return credibility;
    } else if (credibility >= 0.6) {
      reasoning.push('Moderately credible source');
      return credibility;
    } else {
      reasoning.push('Source credibility needs improvement');
      return Math.max(credibility, 0.3);
    }
  }

  /**
   * Normalize content freshness score
   */
  private normalizeContentFreshness(freshness: number, reasoning: string[]): number {
    if (freshness >= 0.8) {
      reasoning.push('Recent content');
      return freshness;
    } else if (freshness >= 0.5) {
      reasoning.push('Moderately recent content');
      return freshness;
    } else {
      reasoning.push('Content may be outdated');
      return Math.max(freshness, 0.3);
    }
  }

  /**
   * Normalize information consistency score
   */
  private normalizeInformationConsistency(consistency: number, reasoning: string[], suggestions: string[]): number {
    if (consistency >= 0.8) {
      reasoning.push('Information is consistent');
      return consistency;
    } else if (consistency >= 0.6) {
      reasoning.push('Information is mostly consistent');
      return consistency;
    } else {
      reasoning.push('Information consistency issues detected');
      suggestions.push('Review and reconcile conflicting information');
      return Math.max(consistency, 0.3);
    }
  }

  /**
   * Check if name appears realistic
   */
  private isRealisticName(name: string): boolean {
    const suspiciousPatterns = [
      /\d/, // Numbers in name
      /^[A-Z]+$/, // All caps
      /^[a-z]+$/, // All lowercase
      /test|example|sample|demo/i, // Test names
      /^[a-z]\.?$/i, // Just an initial
      /^.{1,2}$/ // Too short
    ];

    return !suspiciousPatterns.some(pattern => pattern.test(name)) &&
           name.length >= 3 &&
           name.length <= 50;
  }

  /**
   * Check if name contains title contamination
   */
  private hasTitleContamination(name: string): boolean {
    const titlePatterns = [
      /^(mr|mrs|ms|dr|prof|sir|madam)\s+/i,
      /\s(jr|sr|ii|iii|iv|v)$/i,
      /(editor|reporter|journalist|author)$/i
    ];

    return titlePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Check if name has suspicious patterns
   */
  private hasSuspiciousPatterns(name: string): boolean {
    const suspiciousPatterns = [
      /^[a-z]{20,}$/, // Very long lowercase
      /([a-z])\1{3,}/, // Repeated characters
      /^[\W_]+$/, // Only symbols
      /^(test|dummy|fake|sample|example)/i // Test indicators
    ];

    return suspiciousPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Check if email is professional format
   */
  private isProfessionalEmail(email: string): boolean {
    const personalPatterns = [
      /^[a-z]+\.[a-z]+@/i, // firstname.lastname
      /^[a-z]+[a-z0-9]*@[a-z]+\.[a-z]{2,}$/i, // personal@domain
      /^[a-z]\.[a-z]+@[a-z]+\.[a-z]{2,}$/i // f.lastname@domain
    ];

    return personalPatterns.some(pattern => pattern.test(email.toLowerCase()));
  }

  /**
   * Check if email is generic format
   */
  private isGenericEmail(email: string): boolean {
    const genericPatterns = [
      /info@/,
      /contact@/,
      /hello@/,
      /news@/,
      /editor@/,
      /support@/,
      /admin@/,
      /team@/,
      /sales@/,
      /marketing@/
    ];

    return genericPatterns.some(pattern => pattern.test(email.toLowerCase()));
  }

  /**
   * Check if email domain is credible
   */
  private isCredibleDomain(domain: string): boolean {
    const credibleDomains = [
      // Major news organizations
      /nytimes\.com$/,
      /washingtonpost\.com$/,
      /wsj\.com$/,
      /cnn\.com$/,
      /bbc\.(co\.uk|com)$/,
      /reuters\.com$/,
      /ap\.org$/,
      /npr\.org$/,
      /pbs\.org$/,
      // Major tech companies
      /google\.com$/,
      /microsoft\.com$/,
      /apple\.com$/,
      /amazon\.com$/,
      /meta\.com$/,
      // Academic institutions
      /\.edu$/,
      /\.ac\.[a-z]{2}$/
    ];

    return credibleDomains.some(pattern => pattern.test(domain));
  }

  /**
   * Check if email domain is suspicious
   */
  private isSuspiciousDomain(domain: string): boolean {
    const suspiciousPatterns = [
      /10minutemail/,
      /tempmail/,
      /mailinator/,
      /guerrillamail/,
      /yopmail/,
      /throwaway/,
      /spam/,
      /fake/,
      /test/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Check if email appears personalized
   */
  private isPersonalizedEmail(email: string): boolean {
    const localPart = email.split('@')[0].toLowerCase();

    // Personalization indicators
    const personalPatterns = [
      /^[a-z]+\.[a-z]+/, // firstname.lastname
      /^[a-z]+[0-9]/, // name with number
      /^[a-z]{3,}/, // Reasonably long personal identifier
    ];

    return personalPatterns.some(pattern => pattern.test(localPart)) &&
           !this.isGenericEmail(email);
  }

  /**
   * Get scoring statistics
   */
  getScoringStatistics(): {
    totalScores: number;
    averageConfidence: number;
    averageQuality: number;
    distribution: {
      high: number;
      medium: number;
      low: number;
    };
    factorWeights: Record<string, number>;
  } {
    return {
      totalScores: 0,
      averageConfidence: 0,
      averageQuality: 0,
      distribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      factorWeights: this.weights
    };
  }
}