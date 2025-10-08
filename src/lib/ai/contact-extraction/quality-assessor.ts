/**
 * Content Quality Assessment
 * Evaluates the quality and credibility of web content for contact extraction
 */

import {
  ParsedContent,
  ContentQualityAssessment,
  QualityFactors,
  ContactExtractionError
} from './types';

export class ContentQualityAssessor {
  private readonly weights = {
    credibility: 0.30,
    relevance: 0.25,
    freshness: 0.15,
    authority: 0.15,
    spamScore: 0.10,
    contactInfoRichness: 0.05
  };

  private readonly credibleDomains = [
    // Major news organizations
    'nytimes.com', 'washingtonpost.com', 'wsj.com', 'cnn.com', 'bbc.co.uk', 'bbc.com',
    'reuters.com', 'ap.org', 'npr.org', 'pbs.org', 'time.com', 'newsweek.com',
    'theguardian.com', 'ft.com', 'economist.com', 'bloomberg.com', 'wired.com',
    'techcrunch.com', 'vox.com', 'axios.com', 'politico.com', 'thehill.com',

    // Business publications
    'forbes.com', 'fortune.com', 'inc.com', 'entrepreneur.com', 'hbr.org',
    'fastcompany.com', 'businessinsider.com', 'marketwatch.com', 'cnbc.com',

    // Academic and research institutions
    'mit.edu', 'stanford.edu', 'harvard.edu', 'oxford.ac.uk', 'cambridge.ac.uk',

    // Government organizations
    'whitehouse.gov', 'congress.gov', 'supremecourt.gov', 'census.gov',

    // Major tech companies (blogs/news sections)
    'blog.google', 'news.microsoft.com', 'apple.com/newsroom', 'about.fb.com',
    'amazon.science', 'netflixtechblog.com'
  ];

  private readonly spamIndicators = [
    // Clickbait patterns
    /\b(you won't believe|shocking|unbelievable|incredible|amazing|must see)\b/gi,
    /\b(one simple trick|this one weird|doctors hate|the secret to)\b/gi,

    // Excessive capitalization and punctuation
    /[!]{3,}/g,
    /[A-Z]{5,}/g,

    // Spam trigger words
    /\b(free|money|cash|prize|winner|congratulations|limited time|act now)\b/gi,
    /\b(lose weight|make money|work from home|click here|buy now)\b/gi,

    // Poor quality indicators
    /\b(test|demo|sample|example|placeholder|lorem ipsum)\b/gi,
    /^(under construction|coming soon|website is loading)/gi
  ];

  /**
   * Assess content quality for contact extraction
   */
  async assessContentQuality(content: ParsedContent): Promise<ContentQualityAssessment> {
    try {
      const credibility = this.assessCredibility(content);
      const relevance = this.assessRelevance(content);
      const freshness = this.assessFreshness(content);
      const authority = this.assessAuthority(content);
      const spamScore = this.assessSpamScore(content);
      const contactInfoRichness = this.assessContactInfoRichness(content);

      const overallScore = Math.round(
        (credibility * this.weights.credibility +
         relevance * this.weights.relevance +
         freshness * this.weights.freshness +
         authority * this.weights.authority +
         (1 - spamScore) * this.weights.spamScore +
         contactInfoRichness * this.weights.contactInfoRichness) * 100
      ) / 100;

      const qualityFactors: QualityFactors = {
        sourceCredibility: credibility,
        contentFreshness: freshness,
        contactCompleteness: contactInfoRichness,
        informationConsistency: this.assessInformationConsistency(content),
        overallQuality: overallScore
      };

      const recommendations = this.generateRecommendations({
        credibility,
        relevance,
        freshness,
        authority,
        spamScore,
        contactInfoRichness,
        overallScore
      });

      return {
        url: content.url,
        credibility,
        relevance,
        freshness,
        authority,
        spamScore,
        contentLength: content.content.length,
        language: content.language || 'unknown',
        hasContactInfo: this.hasContactInfo(content.content),
        isJournalistic: this.isJournalisticContent(content),
        overallScore,
        factors: qualityFactors,
        recommendations
      };

    } catch (error) {
      throw new ContactExtractionError(
        `Content quality assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUALITY_ASSESSMENT_FAILED',
        'ASSESSMENT_ERROR',
        { url: content.url, error }
      );
    }
  }

  /**
   * Assess source credibility
   */
  private assessCredibility(content: ParsedContent): number {
    let credibility = 0.5; // Base score

    // Domain credibility
    const domain = this.extractDomain(content.url);
    if (this.isCredibleDomain(domain)) {
      credibility += 0.3;
    } else if (this.isSuspiciousDomain(domain)) {
      credibility -= 0.2;
    }

    // Author presence
    if (content.author && content.author.trim().length > 0) {
      credibility += 0.1;
    }

    // Publication date
    if (content.publishedAt) {
      credibility += 0.05;
    }

    // Title and metadata quality
    if (content.title && content.title.length > 10 && content.title.length < 200) {
      credibility += 0.05;
    }

    // Content length (very short or very long content is suspicious)
    const wordCount = content.metadata.wordCount || 0;
    if (wordCount >= 200 && wordCount <= 2000) {
      credibility += 0.05;
    } else if (wordCount < 100) {
      credibility -= 0.1;
    }

    // Reading time合理性
    const readingTime = content.metadata.readingTime || 0;
    if (readingTime >= 1 && readingTime <= 10) {
      credibility += 0.05;
    }

    // Language detection
    if (content.language && this.isSupportedLanguage(content.language)) {
      credibility += 0.05;
    }

    // Links and references (indicates research)
    if (content.links && content.links.length > 5) {
      credibility += 0.05;
    }

    // Images (indicates professional content)
    if (content.images && content.images.length > 0) {
      credibility += 0.05;
    }

    return Math.max(0, Math.min(credibility, 1));
  }

  /**
   * Assess content relevance for contact extraction
   */
  private assessRelevance(content: ParsedContent): number {
    let relevance = 0.5; // Base score

    const contentLower = content.content.toLowerCase();
    const titleLower = content.title?.toLowerCase() || '';

    // Journalist indicators in title
    const journalistKeywords = [
      'journalist', 'reporter', 'editor', 'author', 'writer', 'correspondent',
      'contributor', 'columnist', 'bureau chief', 'news', 'media'
    ];

    const titleMatches = journalistKeywords.filter(keyword => titleLower.includes(keyword));
    if (titleMatches.length > 0) {
      relevance += 0.2;
    }

    // Content contains contact information
    if (this.hasContactInfo(contentLower)) {
      relevance += 0.2;
    }

    // Author bylines and attribution
    if (contentLower.includes('by ') || contentLower.includes('reported by') || contentLower.includes('written by')) {
      relevance += 0.1;
    }

    // Media outlet mentions
    const outletPatterns = [
      /\b(new york times|washington post|wall street journal|cnn|bbc|reuters|associated press)\b/gi,
      /\b(los angeles times|chicago tribune|miami herald|boston globe)\b/gi,
      /\b(techcrunch|wired|venturebeat|the verge)\b/gi
    ];

    for (const pattern of outletPatterns) {
      if (pattern.test(contentLower)) {
        relevance += 0.1;
        break;
      }
    }

    // Professional titles in content
    const titlePatterns = [
      /\b(senior|lead|chief|executive|managing)\s+(editor|reporter|writer|producer)\b/gi,
      /\b(news|politics|business|tech|health)\s+(editor|reporter|correspondent)\b/gi
    ];

    for (const pattern of titlePatterns) {
      if (pattern.test(contentLower)) {
        relevance += 0.1;
        break;
      }
    }

    // Email and social media patterns
    const emailPattern = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
    const socialPattern = /\b(twitter\.com|linkedin\.com|instagram\.com|facebook\.com)\/\w+/gi;

    if (emailPattern.test(contentLower)) {
      relevance += 0.05;
    }

    if (socialPattern.test(contentLower)) {
      relevance += 0.05;
    }

    // Contact sections
    const contactSectionPatterns = [
      /\b(contact|reach out|follow|connect)\s+(us|me|the author)\b/gi,
      /\b(for media inquiries|press inquiries|journalist inquiries)\b/gi
    ];

    for (const pattern of contactSectionPatterns) {
      if (pattern.test(contentLower)) {
        relevance += 0.1;
        break;
      }
    }

    return Math.max(0, Math.min(relevance, 1));
  }

  /**
   * Assess content freshness
   */
  private assessFreshness(content: ParsedContent): number {
    if (!content.publishedAt) {
      return 0.5; // Default for unknown dates
    }

    const now = new Date();
    const publishedDate = new Date(content.publishedAt);
    const daysSincePublication = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSincePublication <= 1) {
      return 1.0; // Very fresh
    } else if (daysSincePublication <= 7) {
      return 0.9; // Fresh
    } else if (daysSincePublication <= 30) {
      return 0.8; // Recent
    } else if (daysSincePublication <= 90) {
      return 0.6; // Somewhat recent
    } else if (daysSincePublication <= 365) {
      return 0.4; // Old but still relevant
    } else {
      return 0.2; // Very old
    }
  }

  /**
   * Assess source authority
   */
  private assessAuthority(content: ParsedContent): number {
    let authority = 0.5; // Base score

    const domain = this.extractDomain(content.url);

    // Domain authority
    if (this.isTopTierDomain(domain)) {
      authority += 0.3;
    } else if (this.isCredibleDomain(domain)) {
      authority += 0.2;
    } else if (this.isSuspiciousDomain(domain)) {
      authority -= 0.2;
    }

    // SSL/TLS (HTTPS)
    if (content.url.startsWith('https://')) {
      authority += 0.1;
    }

    // Professional URL structure
    if (this.hasProfessionalUrlStructure(content.url)) {
      authority += 0.1;
    }

    // Content structure indicators
    if (this.hasProfessionalContentStructure(content)) {
      authority += 0.1;
    }

    // Author expertise indicators
    if (this.hasAuthorExpertiseIndicators(content)) {
      authority += 0.1;
    }

    return Math.max(0, Math.min(authority, 1));
  }

  /**
   * Assess spam score
   */
  private assessSpamScore(content: ParsedContent): number {
    let spamScore = 0; // 0 = not spam, 1 = definitely spam

    const contentLower = content.content.toLowerCase();
    const titleLower = content.title?.toLowerCase() || '';

    // Check for spam indicators
    for (const pattern of this.spamIndicators) {
      if (pattern.test(contentLower) || pattern.test(titleLower)) {
        spamScore += 0.1;
      }
    }

    // Excessive punctuation
    const exclamationCount = (contentLower.match(/!/g) || []).length;
    const questionMarkCount = (contentLower.match(/\?/g) || []).length;
    const totalPunctuation = exclamationCount + questionMarkCount;

    if (totalPunctuation > 10) {
      spamScore += 0.1;
    }

    // All caps content
    const allCapsWords = (contentLower.match(/[A-Z]{5,}/g) || []).length;
    if (allCapsWords > 5) {
      spamScore += 0.1;
    }

    // Poor grammar indicators
    const sentenceFragmentPattern = /\b(and|but|or|so|because)\s*$/gm;
    if (sentenceFragmentPattern.test(contentLower)) {
      spamScore += 0.05;
    }

    // Repetitive content
    const words = contentLower.split(/\s+/);
    const wordFrequency: Record<string, number> = {};
    for (const word of words) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }

    const highFrequencyWords = Object.values(wordFrequency).filter(count => count > 10).length;
    const totalWords = words.length;

    if (totalWords > 0 && highFrequencyWords / totalWords > 0.1) {
      spamScore += 0.1;
    }

    // Domain reputation
    const domain = this.extractDomain(content.url);
    if (this.isSpamDomain(domain)) {
      spamScore += 0.3;
    }

    return Math.max(0, Math.min(spamScore, 1));
  }

  /**
   * Assess contact information richness
   */
  private assessContactInfoRichness(content: ParsedContent): number {
    let richness = 0; // Base score

    const contentLower = content.content.toLowerCase();

    // Email addresses
    const emailPattern = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;
    const emailMatches = contentLower.match(emailPattern) || [];
    if (emailMatches.length > 0) {
      richness += 0.2 * Math.min(emailMatches.length / 3, 1);
    }

    // Phone numbers
    const phonePattern = /\b(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
    const phoneMatches = contentLower.match(phonePattern) || [];
    if (phoneMatches.length > 0) {
      richness += 0.15 * Math.min(phoneMatches.length / 2, 1);
    }

    // Social media handles
    const socialPatterns = [
      /\b(twitter|linkedin|instagram|facebook)\.com\/\w+/gi,
      /@\w+/g
    ];

    let socialMatches = 0;
    for (const pattern of socialPatterns) {
      socialMatches += (contentLower.match(pattern) || []).length;
    }

    if (socialMatches > 0) {
      richness += 0.15 * Math.min(socialMatches / 3, 1);
    }

    // Professional titles and positions
    const titlePattern = /\b(senior|lead|chief|executive|managing)\s+(editor|reporter|writer|producer|journalist)\b/gi;
    const titleMatches = contentLower.match(titlePattern) || [];
    if (titleMatches.length > 0) {
      richness += 0.2 * Math.min(titleMatches.length / 2, 1);
    }

    // Media outlet associations
    const outletPattern = /\b(at|for|from)\s+(new york times|washington post|cnn|bbc|reuters|ap)\b/gi;
    const outletMatches = contentLower.match(outletPattern) || [];
    if (outletMatches.length > 0) {
      richness += 0.15 * Math.min(outletMatches.length / 2, 1);
    }

    // Contact sections
    const contactSectionPattern = /\b(contact\s+(information|details|email|phone)|reach\s+(out|me|us))\b/gi;
    const contactSectionMatches = contentLower.match(contactSectionPattern) || [];
    if (contactSectionMatches.length > 0) {
      richness += 0.15;
    }

    return Math.max(0, Math.min(richness, 1));
  }

  /**
   * Assess information consistency
   */
  private assessInformationConsistency(content: ParsedContent): number {
    // Check for consistency between metadata and content
    let consistency = 0.8; // Base score

    const contentLower = content.content.toLowerCase();

    // Title consistency
    if (content.title) {
      const titleWords = content.title.toLowerCase().split(/\s+/);
      const contentTitleMatches = titleWords.filter(word =>
        word.length > 3 && contentLower.includes(word)
      ).length;

      if (contentTitleMatches / titleWords.length >= 0.5) {
        consistency += 0.1;
      } else {
        consistency -= 0.1;
      }
    }

    // Author consistency
    if (content.author) {
      const authorName = content.author.toLowerCase();
      if (contentLower.includes(authorName)) {
        consistency += 0.05;
      }
    }

    // URL consistency with content
    const domain = this.extractDomain(content.url);
    if (contentLower.includes(domain)) {
      consistency += 0.05;
    }

    return Math.max(0, Math.min(consistency, 1));
  }

  /**
   * Check if content has contact information
   */
  private hasContactInfo(content: string): boolean {
    const contactIndicators = [
      '@', // Social media handles
      'email', 'mailto:', 'contact', 'reach out',
      'phone', 'call', 'dial',
      'twitter.com', 'linkedin.com', 'instagram.com', 'facebook.com',
      'editor', 'reporter', 'journalist', 'author', 'writer', 'contributor'
    ];

    const contentLower = content.toLowerCase();
    return contactIndicators.some(indicator => contentLower.includes(indicator));
  }

  /**
   * Check if content is journalistic in nature
   */
  private isJournalisticContent(content: ParsedContent): boolean {
    const contentLower = content.content.toLowerCase();
    const titleLower = content.title?.toLowerCase() || '';

    const journalisticIndicators = [
      'reporter', 'journalist', 'editor', 'author', 'writer', 'correspondent',
      'news', 'article', 'story', 'investigation', 'analysis', 'opinion',
      'byline', 'dateline', 'source', 'interview', 'press', 'media'
    ];

    const combinedText = `${titleLower} ${contentLower}`;
    const matchCount = journalisticIndicators.filter(indicator =>
      combinedText.includes(indicator)
    ).length;

    return matchCount >= 2;
  }

  /**
   * Generate quality improvement recommendations
   */
  private generateRecommendations(scores: {
    credibility: number;
    relevance: number;
    freshness: number;
    authority: number;
    spamScore: number;
    contactInfoRichness: number;
    overallScore: number;
  }): string[] {
    const recommendations: string[] = [];

    if (scores.credibility < 0.6) {
      recommendations.push('Consider sources from established media organizations');
    }

    if (scores.relevance < 0.6) {
      recommendations.push('Look for content with more contact information');
    }

    if (scores.freshness < 0.5) {
      recommendations.push('Consider more recent content sources');
    }

    if (scores.authority < 0.6) {
      recommendations.push('Verify source authority and credentials');
    }

    if (scores.spamScore > 0.4) {
      recommendations.push('Content may contain spam-like characteristics');
    }

    if (scores.contactInfoRichness < 0.3) {
      recommendations.push('Content lacks sufficient contact information');
    }

    if (scores.overallScore < 0.6) {
      recommendations.push('Consider alternative sources with better quality indicators');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content quality is acceptable for contact extraction');
    }

    return recommendations;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  /**
   * Check if domain is credible
   */
  private isCredibleDomain(domain: string): boolean {
    return this.credibleDomains.some(credible =>
      domain === credible || domain.endsWith('.' + credible)
    );
  }

  /**
   * Check if domain is top-tier
   */
  private isTopTierDomain(domain: string): boolean {
    const topTier = [
      'nytimes.com', 'washingtonpost.com', 'wsj.com', 'cnn.com', 'bbc.co.uk',
      'reuters.com', 'ap.org', 'npr.org', 'time.com'
    ];

    return topTier.some(top => domain === top || domain.endsWith('.' + top));
  }

  /**
   * Check if domain is suspicious
   */
  private isSuspiciousDomain(domain: string): boolean {
    const suspiciousPatterns = [
      /.*\.tk$/,
      /.*\.ml$/,
      /.*\.ga$/,
      /.*\.cf$/,
      /\d+\..*/, // Domains starting with numbers
      /.*\.(xyz|info|biz|click|download|stream)\.?$/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  /**
   * Check if domain is known spam
   */
  private isSpamDomain(domain: string): boolean {
    const spamDomains = [
      'spam', 'fake', 'scam', 'test', 'demo', 'placeholder'
    ];

    return spamDomains.some(spam => domain.includes(spam));
  }

  /**
   * Check if URL has professional structure
   */
  private hasProfessionalUrlStructure(url: string): boolean {
    // Avoid parameters that look spammy
    const spamParams = ['utm_source', 'campaign', 'affiliate', 'ref'];
    const urlLower = url.toLowerCase();

    return !spamParams.some(param => urlLower.includes(param + '='));
  }

  /**
   * Check if content has professional structure
   */
  private hasProfessionalContentStructure(content: ParsedContent): boolean {
    const contentLower = content.content.toLowerCase();

    // Has proper structure elements
    const structureIndicators = [
      /\b(introduction|background|analysis|conclusion)\b/gi,
      /\b(source|reference|citation|credit)\b/gi,
      /\b(editor|reporter|correspondent)\s*:\s*\w+/gi
    ];

    return structureIndicators.some(indicator => indicator.test(contentLower));
  }

  /**
   * Check if content has author expertise indicators
   */
  private hasAuthorExpertiseIndicators(content: ParsedContent): boolean {
    const contentLower = content.content.toLowerCase();

    const expertiseIndicators = [
      /\b(expert|specialist|analyst|researcher|professor|ph\.?d\.?)\b/gi,
      /\b(\d+\s*years?\s*of\s*experience)\b/gi,
      /\b(award|pulitzer|peabody|emmy)\s+(winner|recipient)\b/gi
    ];

    return expertiseIndicators.some(indicator => indicator.test(contentLower));
  }

  /**
   * Check if language is supported
   */
  private isSupportedLanguage(language: string): boolean {
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
    return supportedLanguages.includes(language.toLowerCase().substring(0, 2));
  }

  /**
   * Batch assess multiple content pieces
   */
  async batchAssessQuality(contents: ParsedContent[]): Promise<ContentQualityAssessment[]> {
    const assessments: ContentQualityAssessment[] = [];

    for (const content of contents) {
      try {
        const assessment = await this.assessContentQuality(content);
        assessments.push(assessment);
      } catch (error) {
        // Continue with other assessments even if one fails
        console.error(`Quality assessment failed for ${content.url}:`, error);
      }
    }

    return assessments;
  }

  /**
   * Get quality assessment statistics
   */
  getAssessmentStatistics(): {
    totalAssessments: number;
    averageQuality: number;
    qualityDistribution: {
      high: number; // > 0.8
      medium: number; // 0.6 - 0.8
      low: number; // < 0.6
    };
    commonIssues: string[];
  } {
    return {
      totalAssessments: 0,
      averageQuality: 0,
      qualityDistribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      commonIssues: []
    };
  }
}