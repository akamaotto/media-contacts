/**
 * Heuristics Integration - Integrate media heuristics with existing AI services
 */

import { mediaHeuristics, type MediaHeuristicsAnalysis, type ContactInput, type ContentInput, type MediaRecommendation, type OutletAssociation } from './index';

/**
 * Enhanced contact with heuristics analysis
 */
export interface EnhancedContact {
  id: string;
  name: string;
  email: string;
  title?: string;
  bio?: string;
  beats: string[];
  outlets: string[];
  score: number;
  heuristicsAnalysis: MediaHeuristicsAnalysis;
  recommendations: string[];
  warnings: string[];
}

/**
 * Enhanced research result with heuristics
 */
export interface EnhancedResearchResult {
  originalResults: any[];
  filteredResults: EnhancedContact[];
  syndicatedContent: any[];
  heuristicsStats: {
    totalAnalyzed: number;
    syndicatedFiltered: number;
    freelancersDetected: number;
    aliasEmailsDetected: number;
    sectionBeatsDetected: number;
  };
  recommendations: string[];
}

/**
 * Integrate heuristics with research service
 */
export class HeuristicsIntegration {
  /**
   * Enhance research results with media heuristics
   */
  async enhanceResearchResults(
    rawResults: Array<{
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
      sourceContent?: {
        url: string;
        title: string;
        content?: string;
        byline?: string;
        publishedAt: Date;
        domain: string;
        sectionPath?: string;
        canonicalUrl?: string;
      };
    }>
  ): Promise<EnhancedResearchResult> {
    
    const enhancedContacts: EnhancedContact[] = [];
    const syndicatedContent: ContentInput[] = [];
    let syndicatedFiltered = 0;
    let freelancersDetected = 0;
    let aliasEmailsDetected = 0;
    let sectionBeatsDetected = 0;
    
    // First pass: Filter out syndicated content
    const contentToAnalyze: ContentInput[] = rawResults
      .filter(result => result.sourceContent)
      .map(result => result.sourceContent!);
    
    if (contentToAnalyze.length > 0) {
      const contentAnalysis = await mediaHeuristics.batchAnalyzeContent(contentToAnalyze);
      syndicatedContent.push(...contentAnalysis.syndicatedContent.map((sc: { content: ContentInput }) => sc.content));
      syndicatedFiltered = contentAnalysis.syndicatedContent.length;
    }
    
    // Second pass: Analyze remaining contacts
    const contactsToAnalyze: ContactInput[] = rawResults
      .filter(result => {
        // Skip if source content was syndicated
        if (result.sourceContent) {
          return !syndicatedContent.some((sc: ContentInput) => sc.url === result.sourceContent!.url);
        }
        return true;
      })
      .map(result => ({
        id: result.id,
        name: result.name,
        email: result.email,
        title: result.title,
        bio: result.bio,
        outlets: result.outlets,
        socialProfiles: result.socialProfiles
      }));
    
    const contactAnalyses = await mediaHeuristics.batchAnalyzeContacts(contactsToAnalyze);
    
    // Transform to enhanced contacts
    for (const analysis of contactAnalyses) {
      const originalContact = rawResults.find(r => r.id === analysis.contactId);
      if (!originalContact) continue;
      
      // Count statistics
      if (analysis.freelancerProfile?.isFreelancer) {
        freelancersDetected++;
      }
      
      if (analysis.emailAnalysis.emailType === 'alias') {
        aliasEmailsDetected++;
      }
      
      if (analysis.beatAnalysis.sources.sectionBased.length > 0) {
        sectionBeatsDetected++;
      }
      
      enhancedContacts.push({
        id: analysis.contactId,
        name: originalContact.name,
        email: originalContact.email,
        title: originalContact.title,
        bio: originalContact.bio,
        beats: analysis.beatAnalysis.primaryBeats,
        outlets: analysis.freelancerProfile?.outlets.map((o: OutletAssociation) => o.outletName) || [],
        score: analysis.overallScore,
        heuristicsAnalysis: analysis,
        recommendations: analysis.recommendations.map((r: MediaRecommendation) => r.description),
        warnings: analysis.warnings
      });
    }
    
    // Sort by score (highest first)
    enhancedContacts.sort((a, b) => b.score - a.score);
    
    // Generate overall recommendations
    const recommendations = this.generateOverallRecommendations({
      totalAnalyzed: rawResults.length,
      syndicatedFiltered,
      freelancersDetected,
      aliasEmailsDetected,
      sectionBeatsDetected
    });
    
    return {
      originalResults: rawResults,
      filteredResults: enhancedContacts,
      syndicatedContent,
      heuristicsStats: {
        totalAnalyzed: rawResults.length,
        syndicatedFiltered,
        freelancersDetected,
        aliasEmailsDetected,
        sectionBeatsDetected
      },
      recommendations
    };
  }
  
  /**
   * Enhance single contact with heuristics
   */
  async enhanceContact(contact: ContactInput): Promise<EnhancedContact> {
    const analysis = await mediaHeuristics.analyzeContact(contact);
    
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      title: contact.title,
      bio: contact.bio,
      beats: analysis.beatAnalysis.primaryBeats,
      outlets: analysis.freelancerProfile?.outlets.map((o: OutletAssociation) => o.outletName) || [],
      score: analysis.overallScore,
      heuristicsAnalysis: analysis,
      recommendations: analysis.recommendations.map((r: MediaRecommendation) => r.description),
      warnings: analysis.warnings
    };
  }
  
  /**
   * Filter content for syndication before processing
   */
  async filterSyndicatedContent(contents: ContentInput[]): Promise<{
    originalContent: ContentInput[];
    syndicatedContent: ContentInput[];
    recommendations: string[];
  }> {
    const analysis = await mediaHeuristics.batchAnalyzeContent(contents);
    
    return {
      originalContent: analysis.originalContent.map((oc: { content: ContentInput }) => oc.content),
      syndicatedContent: analysis.syndicatedContent.map((sc: { content: ContentInput }) => sc.content),
      recommendations: analysis.recommendations.map((r: MediaRecommendation) => r.description)
    };
  }
  
  /**
   * Enhance enrichment suggestions with heuristics
   */
  async enhanceEnrichmentSuggestions(
    contactId: string,
    currentData: {
      name: string;
      email: string;
      title?: string;
      bio?: string;
      beats?: string[];
      outlets?: string[];
    },
    rawSuggestions: Array<{
      field: string;
      currentValue: any;
      suggestedValue: any;
      confidence: number;
      reasoning: string;
    }>
  ): Promise<{
    enhancedSuggestions: Array<{
      field: string;
      currentValue: any;
      suggestedValue: any;
      confidence: number;
      reasoning: string;
      heuristicScore: number;
      priority: 'high' | 'medium' | 'low';
    }>;
    heuristicRecommendations: string[];
  }> {
    
    // Analyze current contact data
    const contactInput: ContactInput = {
      id: contactId,
      name: currentData.name,
      email: currentData.email,
      title: currentData.title,
      bio: currentData.bio
    };
    
    const analysis = await mediaHeuristics.analyzeContact(contactInput);
    
    // Enhance suggestions with heuristic scoring
    const enhancedSuggestions = rawSuggestions.map(suggestion => {
      let heuristicScore = suggestion.confidence;
      let priority: 'high' | 'medium' | 'low' = 'medium';
      
      // Boost beat suggestions if they match section-based analysis
      if (suggestion.field === 'beats') {
        const sectionBeats = analysis.beatAnalysis.sources.sectionBased;
        const suggestedBeats = Array.isArray(suggestion.suggestedValue) 
          ? suggestion.suggestedValue 
          : [suggestion.suggestedValue];
        
        const hasSectionMatch = suggestedBeats.some((beat: string) => 
          sectionBeats.includes(beat)
        );
        
        if (hasSectionMatch) {
          heuristicScore *= 1.3;
          priority = 'high';
        }
      }
      
      // Boost email suggestions for alias emails
      if (suggestion.field === 'email' && analysis.emailAnalysis.emailType === 'alias') {
        heuristicScore *= 1.2;
        priority = 'high';
      }
      
      // Boost outlet suggestions for freelancers
      if (suggestion.field === 'outlets' && analysis.freelancerProfile?.isFreelancer) {
        const primaryOutlet = analysis.freelancerProfile.primaryOutlet?.outletName;
        if (primaryOutlet && suggestion.suggestedValue.includes(primaryOutlet)) {
          heuristicScore *= 1.2;
          priority = 'high';
        }
      }
      
      return {
        ...suggestion,
        heuristicScore: Math.min(heuristicScore, 1.0),
        priority
      };
    });
    
    // Sort by heuristic score
    enhancedSuggestions.sort((a, b) => b.heuristicScore - a.heuristicScore);
    
    const heuristicRecommendations = analysis.recommendations.map((r: MediaRecommendation) => r.description);
    
    return {
      enhancedSuggestions,
      heuristicRecommendations
    };
  }
  
  /**
   * Enhance duplicate detection with freelancer analysis
   */
  async enhanceDuplicateDetection(
    contacts: Array<{
      id: string;
      name: string;
      email: string;
      outlets?: string[];
    }>
  ): Promise<{
    duplicateGroups: Array<{
      contacts: string[];
      reason: string;
      confidence: number;
      isFreelancerGroup: boolean;
    }>;
    freelancerContacts: string[];
    recommendations: string[];
  }> {
    
    const duplicateGroups: Array<{
      contacts: string[];
      reason: string;
      confidence: number;
      isFreelancerGroup: boolean;
    }> = [];
    
    const freelancerContacts: string[] = [];
    const recommendations: string[] = [];
    
    // Group contacts by email domain and name similarity
    const emailGroups = new Map<string, string[]>();
    const nameGroups = new Map<string, string[]>();
    
    for (const contact of contacts) {
      const emailDomain = contact.email.split('@')[1];
      const normalizedName = contact.name.toLowerCase().replace(/[^a-z\s]/g, '');
      
      // Group by email domain
      const emailGroup = emailGroups.get(emailDomain) || [];
      emailGroup.push(contact.id);
      emailGroups.set(emailDomain, emailGroup);
      
      // Group by name
      const nameGroup = nameGroups.get(normalizedName) || [];
      nameGroup.push(contact.id);
      nameGroups.set(normalizedName, nameGroup);
    }
    
    // Analyze groups for freelancer patterns
    for (const [name, contactIds] of nameGroups) {
      if (contactIds.length > 1) {
        const groupContacts = contacts.filter(c => contactIds.includes(c.id));
        const uniqueOutlets = new Set(groupContacts.flatMap(c => c.outlets || []));
        
        if (uniqueOutlets.size > 1) {
          // Likely freelancer with multiple outlet associations
          duplicateGroups.push({
            contacts: contactIds,
            reason: 'Same person writing for multiple outlets (freelancer)',
            confidence: 0.8,
            isFreelancerGroup: true
          });
          
          freelancerContacts.push(...contactIds);
          
          recommendations.push(
            `Contact "${groupContacts[0].name}" appears to be a freelancer writing for ${uniqueOutlets.size} outlets. Consider consolidating into single contact with multiple outlet associations.`
          );
        } else {
          // Potential true duplicate
          duplicateGroups.push({
            contacts: contactIds,
            reason: 'Same name, likely duplicate entries',
            confidence: 0.9,
            isFreelancerGroup: false
          });
        }
      }
    }
    
    return {
      duplicateGroups,
      freelancerContacts,
      recommendations
    };
  }
  
  /**
   * Generate overall recommendations based on heuristics stats
   */
  private generateOverallRecommendations(stats: {
    totalAnalyzed: number;
    syndicatedFiltered: number;
    freelancersDetected: number;
    aliasEmailsDetected: number;
    sectionBeatsDetected: number;
  }): string[] {
    
    const recommendations: string[] = [];
    
    if (stats.syndicatedFiltered > 0) {
      const percentage = (stats.syndicatedFiltered / stats.totalAnalyzed * 100).toFixed(0);
      recommendations.push(
        `Filtered out ${stats.syndicatedFiltered} syndicated content pieces (${percentage}% of total). Focus on original sources for better contact quality.`
      );
    }
    
    if (stats.freelancersDetected > 0) {
      const percentage = (stats.freelancersDetected / stats.totalAnalyzed * 100).toFixed(0);
      recommendations.push(
        `Detected ${stats.freelancersDetected} freelancers (${percentage}% of contacts). Use personal brand pitches and monitor their primary outlets.`
      );
    }
    
    if (stats.aliasEmailsDetected > 0) {
      const percentage = (stats.aliasEmailsDetected / stats.totalAnalyzed * 100).toFixed(0);
      recommendations.push(
        `Found ${stats.aliasEmailsDetected} alias emails (${percentage}% of contacts). Consider finding direct personal emails for better response rates.`
      );
    }
    
    if (stats.sectionBeatsDetected > 0) {
      const percentage = (stats.sectionBeatsDetected / stats.totalAnalyzed * 100).toFixed(0);
      recommendations.push(
        `Identified section-based beats for ${stats.sectionBeatsDetected} contacts (${percentage}%). These beat assignments have higher confidence than keyword-based detection.`
      );
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All contacts passed heuristic analysis with good quality scores.');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const heuristicsIntegration = new HeuristicsIntegration();