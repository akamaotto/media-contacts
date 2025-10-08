/**
 * Social Media Detection
 * Identifies social media profiles and handles from web content
 */

import { SocialProfile, SocialValidationResult, ContactExtractionError } from './types';

export class SocialMediaDetector {
  private readonly platformPatterns = {
    twitter: {
      patterns: [
        /twitter\.com\/([a-zA-Z0-9_]+)/gi,
        /x\.com\/([a-zA-Z0-9_]+)/gi,
        /@([a-zA-Z0-9_]+)(?:\s|$)/gi
      ],
      validation: {
        urlPrefix: 'https://twitter.com/',
        handleRegex: /^[a-zA-Z0-9_]{1,15}$/,
        maxLength: 15
      }
    },
    linkedin: {
      patterns: [
        /linkedin\.com\/in\/([a-zA-Z0-9-]+)/gi,
        /linkedin\.com\/company\/([a-zA-Z0-9-]+)/gi
      ],
      validation: {
        urlPrefix: 'https://linkedin.com/',
        handleRegex: /^[a-zA-Z0-9-]{3,100}$/,
        maxLength: 100
      }
    },
    instagram: {
      patterns: [
        /instagram\.com\/([a-zA-Z0-9_.]+)/gi,
        /instagr\.am\/([a-zA-Z0-9_.]+)/gi
      ],
      validation: {
        urlPrefix: 'https://instagram.com/',
        handleRegex: /^[a-zA-Z0-9_.]{1,30}$/,
        maxLength: 30
      }
    },
    facebook: {
      patterns: [
        /facebook\.com\/([a-zA-Z0-9.]+)/gi,
        /fb\.com\/([a-zA-Z0-9.]+)/gi
      ],
      validation: {
        urlPrefix: 'https://facebook.com/',
        handleRegex: /^[a-zA-Z0-9.]{1,50}$/,
        maxLength: 50
      }
    },
    youtube: {
      patterns: [
        /youtube\.com\/(channel\/[^\/\s]+|c\/[^\/\s]+|user\/[^\/\s]+)/gi,
        /youtu\.be\/([a-zA-Z0-9_-]+)/gi
      ],
      validation: {
        urlPrefix: 'https://youtube.com/',
        handleRegex: /^[a-zA-Z0-9_-]{2,}$/,
        maxLength: 100
      }
    }
  };

  /**
   * Detect social media profiles in text content
   */
  detectSocialProfiles(text: string): SocialProfile[] {
    const profiles: SocialProfile[] = [];
    const processed = new Set<string>(); // Avoid duplicates

    for (const [platform, config] of Object.entries(this.platformPatterns)) {
      for (const pattern of config.patterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            const handle = this.extractHandle(match, platform);
            if (handle && !processed.has(`${platform}:${handle}`)) {
              processed.add(`${platform}:${handle}`);

              const profile: SocialProfile = {
                platform,
                handle,
                url: this.buildUrl(platform, handle),
                verified: false,
                followers: undefined,
                description: undefined
              };

              profiles.push(profile);
            }
          }
        }
      }
    }

    return profiles;
  }

  /**
   * Validate and enrich social media profiles
   */
  async validateSocialProfiles(profiles: SocialProfile[]): Promise<SocialValidationResult[]> {
    const results: SocialValidationResult[] = [];

    for (const profile of profiles) {
      try {
        const validation = await this.validateProfile(profile);
        results.push(validation);
      } catch (error) {
        results.push({
          platform: profile.platform,
          handle: profile.handle,
          isValid: false,
          isVerified: false,
          followerCount: 0,
          activityScore: 0,
          spamIndicators: [],
          reasoning: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return results;
  }

  /**
   * Validate a single social media profile
   */
  async validateProfile(profile: SocialProfile): Promise<SocialValidationResult> {
    const platformConfig = this.platformPatterns[profile.platform];
    if (!platformConfig) {
      throw new ContactExtractionError(
        `Unsupported platform: ${profile.platform}`,
        'UNSUPPORTED_PLATFORM',
        'VALIDATION_ERROR'
      );
    }

    const validation: SocialValidationResult = {
      platform: profile.platform,
      handle: profile.handle,
      isValid: false,
      isVerified: false,
      followerCount: 0,
      activityScore: 0,
      spamIndicators: [],
      reasoning: ''
    };

    // Check handle format
    if (!platformConfig.validation.handleRegex.test(profile.handle)) {
      validation.spamIndicators.push('Invalid handle format');
      validation.reasoning = `Invalid ${profile.platform} handle format`;
      return validation;
    }

    // Check handle length
    if (profile.handle.length > platformConfig.validation.maxLength) {
      validation.spamIndicators.push('Handle too long');
      validation.reasoning = `Handle exceeds maximum length for ${profile.platform}`;
      return validation;
    }

    // Check for spam indicators
    const spamIndicators = this.checkSpamIndicators(profile.handle);
    validation.spamIndicators.push(...spamIndicators);

    // Validate URL format
    const expectedUrl = this.buildUrl(profile.platform, profile.handle);
    if (profile.url !== expectedUrl) {
      validation.spamIndicators.push('Incorrect URL format');
    }

    // Determine overall validity
    validation.isValid = this.determineProfileValidity(validation);

    // Try to fetch additional information (follower count, verification status)
    if (validation.isValid) {
      try {
        const enrichedProfile = await this.enrichProfile(profile);
        validation.isVerified = enrichedProfile.verified || false;
        validation.followerCount = enrichedProfile.followers || 0;
        validation.activityScore = this.calculateActivityScore(enrichedProfile);
        validation.reasoning = this.generateValidationReasoning(validation, enrichedProfile);
      } catch (error) {
        // Enrichment failed, but basic validation passed
        validation.reasoning = `Basic validation passed: ${validation.spamIndicators.length === 0 ? 'No spam indicators' : 'Minor spam indicators detected'}`;
      }
    } else {
      validation.reasoning = `Invalid profile: ${validation.spamIndicators.join(', ')}`;
    }

    return validation;
  }

  /**
   * Enrich profile with additional information
   */
  private async enrichProfile(profile: SocialProfile): Promise<{
    verified?: boolean;
    followers?: number;
    description?: string;
    activityScore?: number;
  }> {
    // In a real implementation, this would:
    // 1. Fetch profile information from the platform's API
    // 2. Extract follower count, verification status, bio
    // 3. Calculate activity score based on recent posts

    // For now, return mock data
    return {
      verified: profile.platform === 'twitter' && profile.handle.includes('verified') ? true : false,
      followers: this.estimateFollowers(profile),
      description: undefined,
      activityScore: 0.5
    };
  }

  /**
   * Estimate follower count based on handle characteristics
   */
  private estimateFollowers(profile: SocialProfile): number {
    // Very rough estimation based on common patterns
    if (profile.platform === 'twitter') {
      // Verified accounts often have more followers
      if (profile.handle.includes('verified')) {
        return Math.floor(Math.random() * 900000) + 100000;
      }
      // Common names might have more followers
      if (this.isCommonName(profile.handle)) {
        return Math.floor(Math.random() * 50000) + 5000;
      }
      // Random estimate
      return Math.floor(Math.random() * 10000) + 1000;
    }

    if (profile.platform === 'linkedin') {
      // Company accounts vs personal
      if (profile.handle.includes('company') || profile.handle.includes('corp')) {
        return Math.floor(Math.random() * 50000) + 10000;
      }
      return Math.floor(Math.random() * 5000) + 500;
    }

    return 0;
  }

  /**
   * Check if handle is a common name
   */
  private isCommonName(handle: string): boolean {
    const commonNames = [
      'john', 'jane', 'mike', 'sarah', 'david', 'emily', 'chris', 'lisa',
      'robert', 'michael', 'jennifer', 'william', 'jessica', 'richard'
    ];

    return commonNames.includes(handle.toLowerCase());
  }

  /**
   * Calculate activity score based on profile data
   */
  private calculateActivityScore(enrichedProfile: any): number {
    let score = 0.5; // Base score

    if (enrichedProfile.verified) {
      score += 0.3;
    }

    if (enrichedProfile.followers) {
      // Logarithmic scale for follower count
      const logFollowers = Math.log10(Math.max(enrichedProfile.followers, 1));
      score += Math.min(logFollowers / 10, 0.5);
    }

    if (enrichedProfile.description) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Check for spam indicators in handle
   */
  private checkSpamIndicators(handle: string): string[] {
    const indicators: string[] = [];

    // Number-heavy handles
    if (/\d{3,}/.test(handle)) {
      indicators.push('Contains multiple numbers');
    }

    // Repeated characters
    if (/(.)\1{2,}/.test(handle)) {
      indicators.push('Contains repeated characters');
    }

    // Common spam prefixes/suffixes
    const spamPatterns = [
      /^test/, /test$/,
      /^spam/, /spam$/,
      /^fake/, /fake$/,
      /^bot/, /bot$/,
      /^temp/, /temp$/,
      /_?[0-9]+$/
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(handle)) {
        indicators.push('Contains spam-like pattern');
        break;
      }
    }

    // Very short or very long handles
    if (handle.length < 3) {
      indicators.push('Handle too short');
    }

    if (handle.length > 30) {
      indicators.push('Handle too long');
    }

    return indicators;
  }

  /**
   * Determine if profile is valid based on checks
   */
  private determineProfileValidity(validation: SocialValidationResult): boolean {
    // Invalid if there are multiple spam indicators
    if (validation.spamIndicators.length >= 2) {
      return false;
    }

    // Invalid if there's at least one major spam indicator
    const majorIndicators = ['Handle too long', 'Contains multiple numbers', 'Contains spam-like pattern'];
    if (validation.spamIndicators.some(indicator => majorIndicators.includes(indicator))) {
      return false;
    }

    return true;
  }

  /**
   * Generate validation reasoning
   */
  private generateValidationReasoning(
    validation: SocialValidationResult,
    enrichedProfile?: any
  ): string {
    const reasons: string[] = [];

    if (validation.isValid) {
      reasons.push('Valid profile format');
    } else {
      reasons.push('Invalid profile');
    }

    if (validation.isVerified) {
      reasons.push('Verified account');
    }

    if (validation.followerCount > 0) {
      reasons.push(`${validation.followerCount.toLocaleString()} followers`);
    }

    if (validation.activityScore > 0) {
      reasons.push(`Activity score: ${(validation.activityScore * 100).toFixed(0)}%`);
    }

    if (validation.spamIndicators.length > 0) {
      reasons.push(`Spam indicators: ${validation.spamIndicators.join(', ')}`);
    }

    return reasons.join('; ');
  }

  /**
   * Extract handle from match
   */
  private extractHandle(match: string, platform: string): string | null {
    const platformConfig = this.platformPatterns[platform];
    if (!platformConfig) return null;

    // Extract the handle from the match
    const urlMatch = match.match(platformConfig.validation.urlPrefix + '(.+)');
    if (urlMatch) {
      return urlMatch[1];
    }

    // Handle special cases
    if (platform === 'twitter' || platform === 'x') {
      const twitterMatch = match.match(/[@x]?([a-zA-Z0-9_]+)/);
      if (twitterMatch) {
        return twitterMatch[1];
      }
    }

    return null;
  }

  /**
   * Build platform-specific URL
   */
  private buildUrl(platform: string, handle: string): string {
    const platformConfig = this.platformPatterns[platform];
    if (!platformConfig) return '';

    let url = platformConfig.validation.urlPrefix;

    // Add platform-specific path components
    if (platform === 'linkedin') {
      // Default to personal profile, could detect company vs personal
      if (!handle.includes('-') && !handle.includes(/\d/)) {
        url += 'in/';
      } else {
        url += 'company/';
      }
    } else if (platform === 'youtube') {
      // Default to channel, could detect user/creator
      if (handle.includes('channel/') || handle.includes('c/') || handle.includes('user/')) {
        return handle; // Handle is already a full path
      } else {
        url += 'channel/';
      }
    }

    return url + handle;
  }

  /**
   * Detect social media profiles from HTML content
   */
  detectFromHTML(html: string): SocialProfile[] {
    const profiles: SocialProfile[] = [];

    // Extract URLs from HTML
    const urlPattern = /https?:\/\/(www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\/[^\s"']+/gi;
    const urls = html.match(urlPattern) || [];

    for (const url of urls) {
      for (const [platform, config] of Object.entries(this.platformPatterns)) {
        if (url.includes(platform.replace('twitter', 'x')) || url.includes(platform)) {
          for (const pattern of config.patterns) {
            const match = url.match(pattern);
            if (match) {
              const handle = this.extractHandle(match[0], platform);
              if (handle) {
                const profile: SocialProfile = {
                  platform,
                  handle,
                  url,
                  verified: false,
                  followers: undefined,
                  description: undefined
                };
                profiles.push(profile);
              }
            }
          }
        }
      }
    }

    return Array.from(new Set(profiles.map(p => `${p.platform}:${p.handle}`)))
      .map(key => profiles.find(p => `${p.platform}:${p.handle}` === key)!);
  }

  /**
   * Group profiles by platform
   */
  groupProfilesByPlatform(profiles: SocialProfile[]): Record<string, SocialProfile[]> {
    const grouped: Record<string, SocialProfile[]> = {};

    for (const profile of profiles) {
      if (!grouped[profile.platform]) {
        grouped[profile.platform] = [];
      }
      grouped[profile.platform].push(profile);
    }

    return grouped;
  }

  /**
   * Get platform statistics
   */
  getPlatformStats(profiles: SocialProfile[]): {
    totalProfiles: number;
    byPlatform: Record<string, number>;
    verifiedProfiles: number;
    averageFollowers: number;
  } {
    const byPlatform: Record<string, number> = {};
    let verifiedCount = 0;
    let totalFollowers = 0;
    let followerCount = 0;

    for (const profile of profiles) {
      if (!byPlatform[profile.platform]) {
        byPlatform[profile.platform] = 0;
      }
      byPlatform[profile.platform]++;

      if (profile.verified) {
        verifiedCount++;
      }

      if (profile.followers) {
        totalFollowers += profile.followers;
        followerCount++;
      }
    }

    return {
      totalProfiles: profiles.length,
      byPlatform,
      verifiedProfiles: verifiedCount,
      averageFollowers: followerCount > 0 ? Math.round(totalFollowers / followerCount) : 0
    };
  }

  /**
   * Extract social media mentions from text
   */
  extractSocialMentions(text: string): {
    mentions: Array<{
      platform: string;
      handle: string;
      context: string;
      position: number;
    }>;
    platforms: string[];
  } {
    const mentions: Array<{
      platform: string;
      handle: string;
      context: string;
      position: number;
    }> = [];
    const platforms = new Set<string>();

    for (const [platform, config] of Object.entries(this.platformPatterns)) {
      for (const pattern of config.patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const handle = this.extractHandle(match[0], platform);
          if (handle) {
            // Extract context around the mention
            const start = Math.max(0, match.index - 50);
            const end = Math.min(text.length, match.index + match[0].length + 50);
            const context = text.substring(start, end).trim();

            mentions.push({
              platform,
              handle,
              context,
              position: match.index
            });

            platforms.add(platform);
          }
        }
      }
    }

    return {
      mentions,
      platforms: Array.from(platforms)
    };
  }
}