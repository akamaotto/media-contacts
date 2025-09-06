/**
 * Contact Outcome Tracking System
 * Tracks email outcomes, responses, coverage, and opt-outs for contact maintenance
 */

export interface ContactOutcome {
  id: string;
  contactId: string;
  campaignId?: string;
  outreachId?: string;
  type: 'email_sent' | 'reply_received' | 'bounce' | 'coverage' | 'opt_out' | 'complaint' | 'unsubscribe';
  status: 'success' | 'failure' | 'pending' | 'partial';
  timestamp: Date;
  details: {
    subject?: string;
    emailAddress?: string;
    bounceType?: 'hard' | 'soft' | 'block' | 'spam';
    bounceReason?: string;
    replyContent?: string;
    coverageUrl?: string;
    coverageTitle?: string;
    coverageOutlet?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    responseTime?: number; // in hours
  };
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    trackingId?: string;
    emailProvider?: string;
    deviceType?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface OutcomeAnalytics {
  contactId: string;
  totalOutreach: number;
  responseRate: number;
  bounceRate: number;
  coverageCount: number;
  optOutCount: number;
  averageResponseTime: number;
  lastActivity: Date;
  engagement: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    factors: string[];
  };
  reliability: {
    score: number;
    factors: string[];
  };
}

/**
 * Outcome Tracker Class
 */
export class OutcomeTracker {
  private static instance: OutcomeTracker;
  private outcomes: Map<string, ContactOutcome> = new Map();
  private analytics: Map<string, OutcomeAnalytics> = new Map();

  static getInstance(): OutcomeTracker {
    if (!OutcomeTracker.instance) {
      OutcomeTracker.instance = new OutcomeTracker();
    }
    return OutcomeTracker.instance;
  }

  /**
   * Record a contact outcome
   */
  async recordOutcome(outcome: Omit<ContactOutcome, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const outcomeId = this.generateId();
    
    const contactOutcome: ContactOutcome = {
      ...outcome,
      id: outcomeId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.outcomes.set(outcomeId, contactOutcome);

    // Update analytics
    await this.updateContactAnalytics(outcome.contactId);

    return outcomeId;
  }

  /**
   * Get outcomes for a contact
   */
  getContactOutcomes(contactId: string, limit: number = 50): ContactOutcome[] {
    return Array.from(this.outcomes.values())
      .filter(outcome => outcome.contactId === contactId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get contact analytics
   */
  getContactAnalytics(contactId: string): OutcomeAnalytics | null {
    return this.analytics.get(contactId) || null;
  }

  /**
   * Update contact analytics
   */
  private async updateContactAnalytics(contactId: string): Promise<void> {
    const outcomes = this.getContactOutcomes(contactId, 1000);
    
    if (outcomes.length === 0) return;

    const totalOutreach = outcomes.filter(o => o.type === 'email_sent').length;
    const replies = outcomes.filter(o => o.type === 'reply_received');
    const bounces = outcomes.filter(o => o.type === 'bounce');
    const coverage = outcomes.filter(o => o.type === 'coverage');
    const optOuts = outcomes.filter(o => o.type === 'opt_out' || o.type === 'unsubscribe');

    const responseRate = totalOutreach > 0 ? (replies.length / totalOutreach) * 100 : 0;
    const bounceRate = totalOutreach > 0 ? (bounces.length / totalOutreach) * 100 : 0;

    // Calculate average response time
    const responseTimes = replies
      .map(r => r.details.responseTime)
      .filter((time): time is number => time !== undefined);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(outcomes);
    const engagementTrend = this.calculateTrend(outcomes, 'engagement');

    // Calculate reliability score
    const reliabilityScore = this.calculateReliabilityScore(outcomes);

    const analytics: OutcomeAnalytics = {
      contactId,
      totalOutreach,
      responseRate,
      bounceRate,
      coverageCount: coverage.length,
      optOutCount: optOuts.length,
      averageResponseTime,
      lastActivity: outcomes[0].timestamp,
      engagement: {
        score: engagementScore,
        trend: engagementTrend,
        factors: this.getEngagementFactors(outcomes)
      },
      reliability: {
        score: reliabilityScore,
        factors: this.getReliabilityFactors(outcomes)
      }
    };

    this.analytics.set(contactId, analytics);
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(outcomes: ContactOutcome[]): number {
    let score = 50; // Base score

    const replies = outcomes.filter(o => o.type === 'reply_received');
    const coverage = outcomes.filter(o => o.type === 'coverage');
    const totalOutreach = outcomes.filter(o => o.type === 'email_sent').length;

    if (totalOutreach === 0) return score;

    // Response rate factor (0-30 points)
    const responseRate = (replies.length / totalOutreach) * 100;
    score += Math.min(responseRate * 0.3, 30);

    // Coverage factor (0-20 points)
    const coverageRate = (coverage.length / totalOutreach) * 100;
    score += Math.min(coverageRate * 0.2, 20);

    // Recency factor (-10 to +10 points)
    const lastActivity = outcomes[0]?.timestamp;
    if (lastActivity) {
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceActivity < 30) score += 10;
      else if (daysSinceActivity < 90) score += 5;
      else if (daysSinceActivity > 365) score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate reliability score (0-100)
   */
  private calculateReliabilityScore(outcomes: ContactOutcome[]): number {
    let score = 70; // Base score

    const bounces = outcomes.filter(o => o.type === 'bounce');
    const hardBounces = bounces.filter(o => o.details.bounceType === 'hard');
    const totalOutreach = outcomes.filter(o => o.type === 'email_sent').length;

    if (totalOutreach === 0) return score;

    // Hard bounce penalty (-30 points per hard bounce)
    score -= hardBounces.length * 30;

    // Soft bounce penalty (-5 points per soft bounce)
    const softBounces = bounces.filter(o => o.details.bounceType === 'soft');
    score -= softBounces.length * 5;

    // Opt-out penalty (-20 points)
    const optOuts = outcomes.filter(o => o.type === 'opt_out' || o.type === 'unsubscribe');
    score -= optOuts.length * 20;

    // Successful delivery bonus
    const successfulDeliveries = totalOutreach - bounces.length;
    const deliveryRate = (successfulDeliveries / totalOutreach) * 100;
    if (deliveryRate > 95) score += 10;
    else if (deliveryRate > 90) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate trend for engagement or reliability
   */
  private calculateTrend(outcomes: ContactOutcome[], type: 'engagement' | 'reliability'): 'improving' | 'stable' | 'declining' {
    if (outcomes.length < 6) return 'stable';

    // Split outcomes into recent and older periods
    const recentOutcomes = outcomes.slice(0, Math.floor(outcomes.length / 2));
    const olderOutcomes = outcomes.slice(Math.floor(outcomes.length / 2));

    const recentScore = type === 'engagement' 
      ? this.calculateEngagementScore(recentOutcomes)
      : this.calculateReliabilityScore(recentOutcomes);
    
    const olderScore = type === 'engagement'
      ? this.calculateEngagementScore(olderOutcomes)
      : this.calculateReliabilityScore(olderOutcomes);

    const difference = recentScore - olderScore;
    
    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  }

  /**
   * Get engagement factors
   */
  private getEngagementFactors(outcomes: ContactOutcome[]): string[] {
    const factors: string[] = [];
    
    const replies = outcomes.filter(o => o.type === 'reply_received');
    const coverage = outcomes.filter(o => o.type === 'coverage');
    const totalOutreach = outcomes.filter(o => o.type === 'email_sent').length;

    if (replies.length > 0) {
      const responseRate = (replies.length / totalOutreach) * 100;
      if (responseRate > 20) factors.push('High response rate');
      else if (responseRate > 10) factors.push('Good response rate');
      else factors.push('Low response rate');
    }

    if (coverage.length > 0) {
      factors.push('Provides media coverage');
    }

    const avgResponseTime = replies
      .map(r => r.details.responseTime)
      .filter((time): time is number => time !== undefined)
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

    if (avgResponseTime > 0) {
      if (avgResponseTime < 24) factors.push('Quick to respond');
      else if (avgResponseTime < 72) factors.push('Responds within 3 days');
      else factors.push('Slow to respond');
    }

    return factors;
  }

  /**
   * Get reliability factors
   */
  private getReliabilityFactors(outcomes: ContactOutcome[]): string[] {
    const factors: string[] = [];
    
    const bounces = outcomes.filter(o => o.type === 'bounce');
    const hardBounces = bounces.filter(o => o.details.bounceType === 'hard');
    const optOuts = outcomes.filter(o => o.type === 'opt_out' || o.type === 'unsubscribe');

    if (hardBounces.length === 0) {
      factors.push('No hard bounces');
    } else {
      factors.push(`${hardBounces.length} hard bounce(s)`);
    }

    if (optOuts.length === 0) {
      factors.push('No opt-outs');
    } else {
      factors.push(`${optOuts.length} opt-out(s)`);
    }

    const totalOutreach = outcomes.filter(o => o.type === 'email_sent').length;
    const deliveryRate = totalOutreach > 0 ? ((totalOutreach - bounces.length) / totalOutreach) * 100 : 100;
    
    if (deliveryRate > 95) factors.push('Excellent delivery rate');
    else if (deliveryRate > 90) factors.push('Good delivery rate');
    else factors.push('Poor delivery rate');

    return factors;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `outcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system-wide outcome statistics
   */
  getSystemStats(): {
    totalOutcomes: number;
    outcomesByType: Record<string, number>;
    averageResponseRate: number;
    averageBounceRate: number;
    topPerformingContacts: Array<{ contactId: string; score: number }>;
  } {
    const allOutcomes = Array.from(this.outcomes.values());
    const allAnalytics = Array.from(this.analytics.values());

    const outcomesByType = allOutcomes.reduce((acc, outcome) => {
      acc[outcome.type] = (acc[outcome.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageResponseRate = allAnalytics.length > 0
      ? allAnalytics.reduce((sum, a) => sum + a.responseRate, 0) / allAnalytics.length
      : 0;

    const averageBounceRate = allAnalytics.length > 0
      ? allAnalytics.reduce((sum, a) => sum + a.bounceRate, 0) / allAnalytics.length
      : 0;

    const topPerformingContacts = allAnalytics
      .map(a => ({ contactId: a.contactId, score: a.engagement.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      totalOutcomes: allOutcomes.length,
      outcomesByType,
      averageResponseRate: Math.round(averageResponseRate * 100) / 100,
      averageBounceRate: Math.round(averageBounceRate * 100) / 100,
      topPerformingContacts
    };
  }
}

// Export singleton instance
export const outcomeTracker = OutcomeTracker.getInstance();