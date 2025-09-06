/**
 * Syndication Detector - Canonical URL Analysis and Syndication Trap Detection
 * Prevents duplicate contact discovery from syndicated content
 */

export interface SyndicationAnalysis {
  isSyndicated: boolean;
  confidence: number;
  originalSource?: SourceInfo;
  syndicationNetwork?: string;
  canonicalUrl?: string;
  duplicateUrls: string[];
  reasoning: string;
  recommendations: SyndicationRecommendation[];
}

export interface SourceInfo {
  domain: string;
  outletName: string;
  publishedAt: Date;
  authorName?: string;
  authorEmail?: string;
  isOriginalSource: boolean;
  confidence: number;
}

export interface SyndicationRecommendation {
  type: 'skip_duplicate' | 'use_original' | 'verify_author' | 'check_canonical';
  priority: 'high' | 'medium' | 'low';
  description: string;
  action: string;
}

export interface ContentFingerprint {
  titleHash: string;
  contentHash: string;
  authorHash: string;
  publishDateRange: {
    earliest: Date;
    latest: Date;
  };
  urls: string[];
  domains: string[];
}

/**
 * Known syndication networks and their patterns
 */
const SYNDICATION_NETWORKS = {
  'Associated Press': {
    patterns: [/ap\.org/, /associated\s*press/i, /\(ap\)/i],
    indicators: ['AP', 'Associated Press', 'The Associated Press'],
    canonicalDomains: ['apnews.com', 'ap.org']
  },
  
  'Reuters': {
    patterns: [/reuters\.com/, /reuters/i],
    indicators: ['Reuters', 'REUTERS'],
    canonicalDomains: ['reuters.com']
  },
  
  'Bloomberg': {
    patterns: [/bloomberg\.com/, /bloomberg/i],
    indicators: ['Bloomberg', 'BLOOMBERG'],
    canonicalDomains: ['bloomberg.com']
  },
  
  'Tribune Content Agency': {
    patterns: [/tribunecontentagency\.com/, /tribune/i],
    indicators: ['Tribune Content Agency', 'TCA'],
    canonicalDomains: ['tribunecontentagency.com']
  },
  
  'Gannett': {
    patterns: [/gannett\.com/, /usatoday\.com/],
    indicators: ['USA TODAY', 'Gannett'],
    canonicalDomains: ['usatoday.com']
  },
  
  'McClatchy': {
    patterns: [/mcclatchy\.com/],
    indicators: ['McClatchy'],
    canonicalDomains: ['mcclatchy.com']
  },
  
  'Hearst': {
    patterns: [/hearst\.com/, /sfgate\.com/, /chron\.com/],
    indicators: ['Hearst', 'SF Gate', 'Houston Chronicle'],
    canonicalDomains: ['hearst.com']
  }
};

/**
 * Common syndication indicators in content
 */
const SYNDICATION_INDICATORS = {
  byline_patterns: [
    /\(AP\)/i,
    /\(Reuters\)/i,
    /\(Bloomberg\)/i,
    /Associated Press/i,
    /Tribune Content Agency/i,
    /\bAP\b/,
    /\bReuters\b/,
    /\bBloomberg\b/
  ],
  
  content_patterns: [
    /originally published/i,
    /first appeared/i,
    /republished/i,
    /syndicated/i,
    /distributed by/i,
    /wire service/i,
    /news service/i
  ],
  
  copyright_patterns: [
    /©.*Associated Press/i,
    /©.*Reuters/i,
    /©.*Bloomberg/i,
    /©.*Tribune/i,
    /copyright.*AP/i
  ],
  
  url_patterns: [
    /\/ap\//i,
    /\/reuters\//i,
    /\/bloomberg\//i,
    /\/wire\//i,
    /\/syndicated\//i,
    /\/national\//i
  ]
};

/**
 * Domains known for heavy syndication
 */
const SYNDICATION_HEAVY_DOMAINS = [
  'yahoo.com',
  'msn.com',
  'aol.com',
  'marketwatch.com',
  'businessinsider.com',
  'huffpost.com',
  'usatoday.com'
];

export class SyndicationDetector {
  private contentFingerprints: Map<string, ContentFingerprint> = new Map();
  
  /**
   * Analyze content for syndication patterns
   */
  analyzeSyndication(content: {
    url: string;
    title: string;
    content?: string;
    byline?: string;
    publishedAt: Date;
    domain: string;
    canonicalUrl?: string;
    metaTags?: Record<string, string>;
  }): SyndicationAnalysis {
    
    // 1. Check canonical URL
    const canonicalAnalysis = this.analyzeCanonicalUrl(content);
    
    // 2. Check for syndication network indicators
    const networkAnalysis = this.detectSyndicationNetwork(content);
    
    // 3. Check content patterns
    const patternAnalysis = this.analyzeContentPatterns(content);
    
    // 4. Check domain patterns
    const domainAnalysis = this.analyzeDomainPatterns(content);
    
    // 5. Check for duplicate content
    const duplicateAnalysis = this.checkForDuplicates(content);
    
    // 6. Synthesize analysis
    return this.synthesizeAnalysis(
      content,
      canonicalAnalysis,
      networkAnalysis,
      patternAnalysis,
      domainAnalysis,
      duplicateAnalysis
    );
  }
  
  /**
   * Analyze canonical URL for syndication indicators
   */
  private analyzeCanonicalUrl(content: any): {
    isSyndicated: boolean;
    confidence: number;
    originalDomain?: string;
    reasoning: string;
  } {
    const canonicalUrl = content.canonicalUrl || content.metaTags?.['canonical'];
    
    if (!canonicalUrl) {
      return {
        isSyndicated: false,
        confidence: 0,
        reasoning: 'No canonical URL found'
      };
    }
    
    const canonicalDomain = this.extractDomain(canonicalUrl);
    const currentDomain = content.domain;
    
    if (canonicalDomain !== currentDomain) {
      // Check if canonical domain is a known syndication source
      const isKnownSyndicator = Object.values(SYNDICATION_NETWORKS)
        .some(network => network.canonicalDomains.includes(canonicalDomain));
      
      return {
        isSyndicated: true,
        confidence: isKnownSyndicator ? 0.95 : 0.8,
        originalDomain: canonicalDomain,
        reasoning: `Canonical URL points to different domain: ${canonicalDomain}`
      };
    }
    
    return {
      isSyndicated: false,
      confidence: 0.9,
      reasoning: 'Canonical URL matches current domain'
    };
  }
  
  /**
   * Detect syndication network from content
   */
  private detectSyndicationNetwork(content: any): {
    network?: string;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let bestMatch: { network: string; confidence: number } | null = null;
    
    const searchText = `${content.title} ${content.byline || ''} ${content.content || ''}`;
    
    for (const [networkName, networkData] of Object.entries(SYNDICATION_NETWORKS)) {
      let networkScore = 0;
      
      // Check patterns
      for (const pattern of networkData.patterns) {
        if (pattern.test(searchText)) {
          networkScore += 0.3;
          indicators.push(`Pattern match: ${pattern.source}`);
        }
      }
      
      // Check indicators
      for (const indicator of networkData.indicators) {
        if (searchText.includes(indicator)) {
          networkScore += 0.4;
          indicators.push(`Indicator found: ${indicator}`);
        }
      }
      
      // Check domain
      if (networkData.canonicalDomains.includes(content.domain)) {
        networkScore += 0.5;
        indicators.push(`Domain match: ${content.domain}`);
      }
      
      if (networkScore > 0 && (!bestMatch || networkScore > bestMatch.confidence)) {
        bestMatch = { network: networkName, confidence: Math.min(networkScore, 1.0) };
      }
    }
    
    return {
      network: bestMatch?.network,
      confidence: bestMatch?.confidence || 0,
      indicators
    };
  }
  
  /**
   * Analyze content for syndication patterns
   */
  private analyzeContentPatterns(content: any): {
    hasSyndicationPatterns: boolean;
    confidence: number;
    patterns: string[];
  } {
    const patterns: string[] = [];
    let patternScore = 0;
    
    const searchText = `${content.title} ${content.byline || ''} ${content.content || ''}`;
    
    // Check byline patterns
    for (const pattern of SYNDICATION_INDICATORS.byline_patterns) {
      if (pattern.test(searchText)) {
        patternScore += 0.4;
        patterns.push(`Byline pattern: ${pattern.source}`);
      }
    }
    
    // Check content patterns
    for (const pattern of SYNDICATION_INDICATORS.content_patterns) {
      if (pattern.test(searchText)) {
        patternScore += 0.3;
        patterns.push(`Content pattern: ${pattern.source}`);
      }
    }
    
    // Check copyright patterns
    for (const pattern of SYNDICATION_INDICATORS.copyright_patterns) {
      if (pattern.test(searchText)) {
        patternScore += 0.5;
        patterns.push(`Copyright pattern: ${pattern.source}`);
      }
    }
    
    // Check URL patterns
    for (const pattern of SYNDICATION_INDICATORS.url_patterns) {
      if (pattern.test(content.url)) {
        patternScore += 0.3;
        patterns.push(`URL pattern: ${pattern.source}`);
      }
    }
    
    return {
      hasSyndicationPatterns: patternScore > 0.3,
      confidence: Math.min(patternScore, 1.0),
      patterns
    };
  }
  
  /**
   * Analyze domain for syndication patterns
   */
  private analyzeDomainPatterns(content: any): {
    isSyndicationHeavy: boolean;
    confidence: number;
    reasoning: string;
  } {
    const domain = content.domain;
    
    if (SYNDICATION_HEAVY_DOMAINS.includes(domain)) {
      return {
        isSyndicationHeavy: true,
        confidence: 0.8,
        reasoning: `Domain ${domain} is known for heavy syndication`
      };
    }
    
    // Check for subdomain patterns that indicate syndication
    const subdomainPatterns = [
      /news\./,
      /wire\./,
      /syndicated\./,
      /ap\./,
      /reuters\./
    ];
    
    for (const pattern of subdomainPatterns) {
      if (pattern.test(domain)) {
        return {
          isSyndicationHeavy: true,
          confidence: 0.6,
          reasoning: `Subdomain pattern suggests syndication: ${domain}`
        };
      }
    }
    
    return {
      isSyndicationHeavy: false,
      confidence: 0.7,
      reasoning: 'Domain does not show syndication patterns'
    };
  }
  
  /**
   * Check for duplicate content using fingerprinting
   */
  private checkForDuplicates(content: any): {
    hasDuplicates: boolean;
    duplicateUrls: string[];
    originalSource?: SourceInfo;
    confidence: number;
  } {
    const fingerprint = this.generateContentFingerprint(content);
    const fingerprintKey = `${fingerprint.titleHash}-${fingerprint.authorHash}`;
    
    const existingFingerprint = this.contentFingerprints.get(fingerprintKey);
    
    if (existingFingerprint) {
      // Found potential duplicate
      existingFingerprint.urls.push(content.url);
      existingFingerprint.domains.push(content.domain);
      
      // Update date range
      const contentDate = new Date(content.publishedAt);
      if (contentDate < existingFingerprint.publishDateRange.earliest) {
        existingFingerprint.publishDateRange.earliest = contentDate;
      }
      if (contentDate > existingFingerprint.publishDateRange.latest) {
        existingFingerprint.publishDateRange.latest = contentDate;
      }
      
      // Determine original source (usually the earliest or from a known primary source)
      const originalSource = this.determineOriginalSource(existingFingerprint);
      
      return {
        hasDuplicates: true,
        duplicateUrls: existingFingerprint.urls.filter(url => url !== content.url),
        originalSource,
        confidence: 0.9
      };
    } else {
      // Store new fingerprint
      this.contentFingerprints.set(fingerprintKey, fingerprint);
      
      return {
        hasDuplicates: false,
        duplicateUrls: [],
        confidence: 0.8
      };
    }
  }
  
  /**
   * Generate content fingerprint for duplicate detection
   */
  private generateContentFingerprint(content: any): ContentFingerprint {
    // Simple hash function for demonstration
    const hash = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return hash.toString(36);
    };
    
    const titleHash = hash(content.title.toLowerCase().trim());
    const contentHash = content.content ? hash(content.content.substring(0, 500)) : '';
    const authorHash = content.byline ? hash(content.byline.toLowerCase().trim()) : '';
    
    return {
      titleHash,
      contentHash,
      authorHash,
      publishDateRange: {
        earliest: new Date(content.publishedAt),
        latest: new Date(content.publishedAt)
      },
      urls: [content.url],
      domains: [content.domain]
    };
  }
  
  /**
   * Determine original source from fingerprint data
   */
  private determineOriginalSource(fingerprint: ContentFingerprint): SourceInfo {
    // Prioritize known primary sources
    const primaryDomains = [
      'apnews.com', 'reuters.com', 'bloomberg.com',
      'nytimes.com', 'wsj.com', 'washingtonpost.com'
    ];
    
    const primaryDomain = fingerprint.domains.find(domain => 
      primaryDomains.includes(domain)
    );
    
    if (primaryDomain) {
      return {
        domain: primaryDomain,
        outletName: this.getOutletName(primaryDomain),
        publishedAt: fingerprint.publishDateRange.earliest,
        isOriginalSource: true,
        confidence: 0.9
      };
    }
    
    // Fall back to earliest publication
    const earliestDomainIndex = fingerprint.domains.findIndex((_, index) => {
      // This is simplified - in reality, you'd track which URL corresponds to which date
      return true; // Return first domain for now
    });
    
    return {
      domain: fingerprint.domains[0],
      outletName: this.getOutletName(fingerprint.domains[0]),
      publishedAt: fingerprint.publishDateRange.earliest,
      isOriginalSource: false,
      confidence: 0.6
    };
  }
  
  /**
   * Synthesize all analyses into final result
   */
  private synthesizeAnalysis(
    content: any,
    canonicalAnalysis: any,
    networkAnalysis: any,
    patternAnalysis: any,
    domainAnalysis: any,
    duplicateAnalysis: any
  ): SyndicationAnalysis {
    
    let syndicationScore = 0;
    const reasons: string[] = [];
    const recommendations: SyndicationRecommendation[] = [];
    
    // Weight canonical analysis heavily
    if (canonicalAnalysis.isSyndicated) {
      syndicationScore += canonicalAnalysis.confidence * 0.4;
      reasons.push(canonicalAnalysis.reasoning);
      
      recommendations.push({
        type: 'use_original',
        priority: 'high',
        description: 'Use canonical URL as original source',
        action: `Contact authors at ${canonicalAnalysis.originalDomain} instead`
      });
    }
    
    // Weight network detection
    if (networkAnalysis.network) {
      syndicationScore += networkAnalysis.confidence * 0.3;
      reasons.push(`Detected syndication network: ${networkAnalysis.network}`);
      
      recommendations.push({
        type: 'skip_duplicate',
        priority: 'high',
        description: 'Content from syndication network',
        action: 'Skip this source and find original reporting'
      });
    }
    
    // Weight content patterns
    if (patternAnalysis.hasSyndicationPatterns) {
      syndicationScore += patternAnalysis.confidence * 0.2;
      reasons.push(`Syndication patterns found: ${patternAnalysis.patterns.join(', ')}`);
    }
    
    // Weight domain analysis
    if (domainAnalysis.isSyndicationHeavy) {
      syndicationScore += domainAnalysis.confidence * 0.1;
      reasons.push(domainAnalysis.reasoning);
      
      recommendations.push({
        type: 'verify_author',
        priority: 'medium',
        description: 'Domain known for syndication',
        action: 'Verify if author is staff or freelancer'
      });
    }
    
    // Weight duplicate detection
    if (duplicateAnalysis.hasDuplicates) {
      syndicationScore += duplicateAnalysis.confidence * 0.3;
      reasons.push(`Found ${duplicateAnalysis.duplicateUrls.length} duplicate URLs`);
      
      recommendations.push({
        type: 'use_original',
        priority: 'high',
        description: 'Duplicate content detected',
        action: 'Use original source for contact discovery'
      });
    }
    
    const isSyndicated = syndicationScore > 0.5;
    const confidence = Math.min(syndicationScore, 1.0);
    
    // Add general recommendations
    if (isSyndicated) {
      recommendations.push({
        type: 'check_canonical',
        priority: 'medium',
        description: 'Always check canonical URLs',
        action: 'Verify original source before adding contacts'
      });
    }
    
    return {
      isSyndicated,
      confidence,
      originalSource: duplicateAnalysis.originalSource,
      syndicationNetwork: networkAnalysis.network,
      canonicalUrl: canonicalAnalysis.originalDomain ? 
        `https://${canonicalAnalysis.originalDomain}` : content.canonicalUrl,
      duplicateUrls: duplicateAnalysis.duplicateUrls,
      reasoning: reasons.join('; '),
      recommendations
    };
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
  
  /**
   * Get outlet name from domain
   */
  private getOutletName(domain: string): string {
    const domainToOutlet: Record<string, string> = {
      'nytimes.com': 'The New York Times',
      'wsj.com': 'The Wall Street Journal',
      'washingtonpost.com': 'The Washington Post',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg',
      'apnews.com': 'Associated Press',
      'usatoday.com': 'USA Today'
    };
    
    return domainToOutlet[domain] || domain;
  }
  
  /**
   * Batch analyze multiple pieces of content
   */
  batchAnalyzeSyndication(contents: Array<{
    url: string;
    title: string;
    content?: string;
    byline?: string;
    publishedAt: Date;
    domain: string;
    canonicalUrl?: string;
    metaTags?: Record<string, string>;
  }>): SyndicationAnalysis[] {
    return contents.map(content => this.analyzeSyndication(content));
  }
  
  /**
   * Filter out syndicated content from a list
   */
  filterSyndicatedContent(
    analyses: Array<{ content: any; analysis: SyndicationAnalysis }>,
    threshold: number = 0.7
  ): Array<{ content: any; analysis: SyndicationAnalysis }> {
    return analyses.filter(({ analysis }) => 
      !analysis.isSyndicated || analysis.confidence < threshold
    );
  }
  
  /**
   * Get original sources from syndicated content
   */
  getOriginalSources(
    analyses: Array<{ content: any; analysis: SyndicationAnalysis }>
  ): SourceInfo[] {
    return analyses
      .filter(({ analysis }) => analysis.isSyndicated && analysis.originalSource)
      .map(({ analysis }) => analysis.originalSource!)
      .filter((source, index, array) => 
        array.findIndex(s => s.domain === source.domain) === index
      ); // Remove duplicates
  }
  
  /**
   * Clear content fingerprints (for memory management)
   */
  clearFingerprints(): void {
    this.contentFingerprints.clear();
  }
  
  /**
   * Get syndication statistics
   */
  getSyndicationStats(): {
    totalFingerprints: number;
    duplicateGroups: number;
    topSyndicators: Array<{ domain: string; count: number }>;
  } {
    const domainCounts = new Map<string, number>();
    let duplicateGroups = 0;
    
    for (const fingerprint of this.contentFingerprints.values()) {
      if (fingerprint.urls.length > 1) {
        duplicateGroups++;
        
        for (const domain of fingerprint.domains) {
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        }
      }
    }
    
    const topSyndicators = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalFingerprints: this.contentFingerprints.size,
      duplicateGroups,
      topSyndicators
    };
  }
}