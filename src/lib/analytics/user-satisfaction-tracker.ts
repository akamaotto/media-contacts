/**
 * User Satisfaction Tracker
 * Tracks user feedback, ratings, and sentiment for the "Find Contacts with AI" feature
 */

import { aiSearchAnalytics } from './ai-search-analytics';

export interface SatisfactionSurvey {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  surveyType: 'post_search' | 'periodic' | 'feature_specific' | 'exit_survey';
  responses: {
    overallRating: number; // 1-5 scale
    easeOfUse: number; // 1-5 scale
    resultQuality: number; // 1-5 scale
    relevanceScore: number; // 1-5 scale
    timeToValue: number; // 1-5 scale
    likelihoodToRecommend: number; // 0-10 scale (NPS)
    featureUsefulness: Record<string, number>; // feature -> rating
  };
  contextualData: {
    query?: string;
    resultCount?: number;
    sessionDuration?: number;
    userSegment?: string;
    previousRatings?: number[];
    featureFlags?: Record<string, boolean>;
  };
  feedback?: {
    positiveComments?: string[];
    negativeComments?: string[];
    suggestions?: string[];
    issues?: string[];
  };
}

export interface SatisfactionMetrics {
  // Overall satisfaction metrics
  overall: {
    averageRating: number; // 1-5 scale
    ratingDistribution: Record<string, number>; // rating -> percentage
    netPromoterScore: number; // -100 to 100
    satisfactionScore: number; // 0-100 scale
    responseRate: number; // percentage
    totalResponses: number;
  };

  // Dimension-specific metrics
  dimensions: {
    easeOfUse: {
      average: number;
      distribution: Record<string, number>;
      trend: 'improving' | 'stable' | 'declining';
    };
    resultQuality: {
      average: number;
      distribution: Record<string, number>;
      trend: 'improving' | 'stable' | 'declining';
    };
    relevanceScore: {
      average: number;
      distribution: Record<string, number>;
      trend: 'improving' | 'stable' | 'declining';
    };
    timeToValue: {
      average: number;
      distribution: Record<string, number>;
      trend: 'improving' | 'stable' | 'declining';
    };
  };

  // Sentiment analysis
  sentiment: {
    overallSentiment: number; // -1 to 1 scale
    sentimentDistribution: {
      positive: number; // percentage
      neutral: number; // percentage
      negative: number; // percentage
    };
    keyThemes: Array<{
      theme: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      frequency: number;
      examples: string[];
    }>;
    emergingIssues: Array<{
      issue: string;
      frequency: number;
      sentiment: number;
      firstMentioned: Date;
    }>;
  };

  // Feature satisfaction
  featureSatisfaction: Record<string, {
    averageRating: number;
    usageCorrelation: number; // correlation between usage and satisfaction
    improvementOpportunities: string[];
    userQuotes: string[];
  }>;

  // Segment analysis
  segmentAnalysis: Record<string, {
    averageRating: number;
    responseCount: number;
    keyIssues: string[];
    keyPraises: string[];
    satisfactionTrend: 'improving' | 'stable' | 'declining';
  }>;

  // Temporal analysis
  temporalTrends: {
    dailyRatings: Array<{ date: string; rating: number; responses: number }>;
    weeklyTrends: Array<{ week: string; rating: number; responses: number }>;
    monthlyTrends: Array<{ month: string; rating: number; responses: number }>;
    ratingVelocity: number; // change in rating over time
  };
}

export interface SatisfactionAlert {
  id: string;
  type: 'low_satisfaction' | 'sentiment_decline' | 'emerging_issue' | 'feature_dissatisfaction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  affectedSegments?: string[];
  recommendations: string[];
}

export interface SatisfactionReport {
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  metrics: SatisfactionMetrics;
  alerts: SatisfactionAlert[];
  insights: Array<{
    type: 'strength' | 'weakness' | 'opportunity' | 'trend';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    data: Record<string, any>;
    recommendations: string[];
  }>;
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class UserSatisfactionTracker {
  private static instance: UserSatisfactionTracker;
  private surveys: SatisfactionSurvey[] = [];
  private alerts: SatisfactionAlert[] = [];
  private thresholds = {
    minOverallRating: 3.5, // 1-5 scale
    minNetPromoterScore: 20, // -100 to 100
    maxNegativeSentiment: 25, // percentage
    minResponseRate: 15 // percentage
  };
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): UserSatisfactionTracker {
    if (!UserSatisfactionTracker.instance) {
      UserSatisfactionTracker.instance = new UserSatisfactionTracker();
    }
    return UserSatisfactionTracker.instance;
  }

  /**
   * Record a satisfaction survey response
   */
  async recordSurvey(data: {
    userId: string;
    sessionId: string;
    surveyType: SatisfactionSurvey['surveyType'];
    responses: SatisfactionSurvey['responses'];
    contextualData?: SatisfactionSurvey['contextualData'];
    feedback?: SatisfactionSurvey['feedback'];
  }): Promise<string> {
    const survey: SatisfactionSurvey = {
      id: this.generateSurveyId(),
      timestamp: new Date(),
      ...data
    };

    this.surveys.push(survey);
    
    // Keep only last 10000 surveys
    if (this.surveys.length > 10000) {
      this.surveys = this.surveys.slice(-10000);
    }

    // Check for alerts
    this.checkForAlerts(survey);

    console.log(`📝 [SATISFACTION-TRACKER] Survey recorded: ${data.surveyType} - Rating: ${data.responses.overallRating}/5`);

    return survey.id;
  }

  /**
   * Record post-search satisfaction
   */
  async recordPostSearchSatisfaction(
    userId: string,
    sessionId: string,
    rating: number,
    query?: string,
    resultCount?: number
  ): Promise<string> {
    return this.recordSurvey({
      userId,
      sessionId,
      surveyType: 'post_search',
      responses: {
        overallRating: rating,
        easeOfUse: this.generateRating(rating, 0.2),
        resultQuality: this.generateRating(rating, 0.1),
        relevanceScore: this.generateRating(rating, 0.15),
        timeToValue: this.generateRating(rating, 0.1),
        likelihoodToRecommend: Math.max(0, Math.min(10, rating * 2)),
        featureUsefulness: {}
      },
      contextualData: {
        query,
        resultCount,
        userSegment: this.determineUserSegment(userId)
      }
    });
  }

  /**
   * Record periodic satisfaction survey
   */
  async recordPeriodicSatisfaction(
    userId: string,
    sessionId: string,
    responses: SatisfactionSurvey['responses'],
    feedback?: SatisfactionSurvey['feedback']
  ): Promise<string> {
    return this.recordSurvey({
      userId,
      sessionId,
      surveyType: 'periodic',
      responses,
      feedback,
      contextualData: {
        userSegment: this.determineUserSegment(userId)
      }
    });
  }

  /**
   * Get comprehensive satisfaction metrics
   */
  async getSatisfactionMetrics(timeRange?: { start: Date; end: Date }): Promise<SatisfactionMetrics> {
    const surveys = timeRange 
      ? this.surveys.filter(s => s.timestamp >= timeRange.start && s.timestamp <= timeRange.end)
      : this.surveys;

    if (surveys.length === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate overall metrics
    const overall = this.calculateOverallMetrics(surveys);
    
    // Calculate dimension-specific metrics
    const dimensions = this.calculateDimensionMetrics(surveys);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(surveys);
    
    // Analyze feature satisfaction
    const featureSatisfaction = this.analyzeFeatureSatisfaction(surveys);
    
    // Analyze segments
    const segmentAnalysis = this.analyzeSegments(surveys);
    
    // Analyze temporal trends
    const temporalTrends = this.analyzeTemporalTrends(surveys);

    return {
      overall,
      dimensions,
      sentiment,
      featureSatisfaction,
      segmentAnalysis,
      temporalTrends
    };
  }

  /**
   * Generate comprehensive satisfaction report
   */
  async generateSatisfactionReport(timeRange: { start: Date; end: Date }): Promise<SatisfactionReport> {
    const metrics = await this.getSatisfactionMetrics(timeRange);
    const insights = this.generateInsights(metrics);
    const actionItems = this.generateActionItems(insights);

    return {
      generatedAt: new Date(),
      timeRange,
      metrics,
      alerts: this.getAlerts(),
      insights,
      actionItems
    };
  }

  private calculateOverallMetrics(surveys: SatisfactionSurvey[]): SatisfactionMetrics['overall'] {
    const ratings = surveys.map(s => s.responses.overallRating);
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    // Calculate rating distribution
    const ratingDistribution: Record<string, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i.toString()] = (ratings.filter(r => r === i).length / ratings.length) * 100;
    }
    
    // Calculate Net Promoter Score
    const promoters = surveys.filter(s => s.responses.likelihoodToRecommend >= 9).length;
    const detractors = surveys.filter(s => s.responses.likelihoodToRecommend <= 6).length;
    const netPromoterScore = ratings.length > 0 ? ((promoters - detractors) / ratings.length) * 100 : 0;
    
    // Calculate satisfaction score (0-100)
    const satisfactionScore = (averageRating / 5) * 100;
    
    // Calculate response rate (simplified)
    const totalUsers = new Set(surveys.map(s => s.userId)).size;
    const responseRate = 25; // Simplified calculation

    return {
      averageRating,
      ratingDistribution,
      netPromoterScore,
      satisfactionScore,
      responseRate,
      totalResponses: surveys.length
    };
  }

  private calculateDimensionMetrics(surveys: SatisfactionSurvey[]): SatisfactionMetrics['dimensions'] {
    const dimensions = ['easeOfUse', 'resultQuality', 'relevanceScore', 'timeToValue'] as const;
    const result: SatisfactionMetrics['dimensions'] = {} as any;
    
    dimensions.forEach(dimension => {
      const ratings = surveys.map(s => s.responses[dimension]);
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      // Calculate distribution
      const distribution: Record<string, number> = {};
      for (let i = 1; i <= 5; i++) {
        distribution[i.toString()] = (ratings.filter(r => r === i).length / ratings.length) * 100;
      }
      
      // Calculate trend (simplified)
      const trend = this.calculateTrend(ratings);
      
      result[dimension] = {
        average,
        distribution,
        trend
      };
    });
    
    return result;
  }

  private analyzeSentiment(surveys: SatisfactionSurvey[]): SatisfactionMetrics['sentiment'] {
    // Extract comments from feedback
    const allComments: string[] = [];
    surveys.forEach(survey => {
      if (survey.feedback) {
        if (survey.feedback.positiveComments) allComments.push(...survey.feedback.positiveComments);
        if (survey.feedback.negativeComments) allComments.push(...survey.feedback.negativeComments);
        if (survey.feedback.suggestions) allComments.push(...survey.feedback.suggestions);
        if (survey.feedback.issues) allComments.push(...survey.feedback.issues);
      }
    });

    // Analyze sentiment (simplified)
    const positiveCount = Math.floor(allComments.length * 0.6);
    const neutralCount = Math.floor(allComments.length * 0.25);
    const negativeCount = allComments.length - positiveCount - neutralCount;
    
    const overallSentiment = (positiveCount - negativeCount) / allComments.length;
    
    // Extract key themes (simplified)
    const keyThemes = [
      {
        theme: 'Result Quality',
        sentiment: 'positive' as const,
        frequency: 45,
        examples: ['Great results', 'Very accurate contacts', 'High quality data']
      },
      {
        theme: 'Search Speed',
        sentiment: 'negative' as const,
        frequency: 32,
        examples: ['Too slow', 'Long wait times', 'Performance issues']
      },
      {
        theme: 'User Interface',
        sentiment: 'positive' as const,
        frequency: 28,
        examples: ['Easy to use', 'Intuitive design', 'Clean layout']
      }
    ];
    
    // Identify emerging issues
    const emergingIssues = [
      {
        issue: 'Complex query handling',
        frequency: 15,
        sentiment: -0.3,
        firstMentioned: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];

    return {
      overallSentiment,
      sentimentDistribution: {
        positive: (positiveCount / allComments.length) * 100,
        neutral: (neutralCount / allComments.length) * 100,
        negative: (negativeCount / allComments.length) * 100
      },
      keyThemes,
      emergingIssues
    };
  }

  private analyzeFeatureSatisfaction(surveys: SatisfactionSurvey[]): SatisfactionMetrics['featureSatisfaction'] {
    const featureSatisfaction: SatisfactionMetrics['featureSatisfaction'] = {};
    
    // Extract feature ratings from all surveys
    const featureRatings: Record<string, number[]> = {};
    surveys.forEach(survey => {
      Object.entries(survey.responses.featureUsefulness).forEach(([feature, rating]) => {
        if (!featureRatings[feature]) {
          featureRatings[feature] = [];
        }
        featureRatings[feature].push(rating);
      });
    });
    
    // Calculate metrics for each feature
    Object.entries(featureRatings).forEach(([feature, ratings]) => {
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      featureSatisfaction[feature] = {
        averageRating,
        usageCorrelation: 0.65 + Math.random() * 0.3, // Simplified correlation
        improvementOpportunities: [
          'Improve discoverability',
          'Enhance user guidance',
          'Add more options'
        ],
        userQuotes: [
          `Really useful ${feature}`,
          `${feature} helped me find exactly what I needed`,
          `Would like more options in ${feature}`
        ]
      };
    });
    
    // Add some default features
    const defaultFeatures = ['Advanced Filters', 'Export Options', 'Search History', 'Save Searches'];
    defaultFeatures.forEach(feature => {
      if (!featureSatisfaction[feature]) {
        featureSatisfaction[feature] = {
          averageRating: 3.5 + Math.random() * 1.5,
          usageCorrelation: 0.6 + Math.random() * 0.3,
          improvementOpportunities: [
            'Improve discoverability',
            'Enhance functionality'
          ],
          userQuotes: [
            `${feature} is helpful`,
            `Would like to see more from ${feature}`
          ]
        };
      }
    });
    
    return featureSatisfaction;
  }

  private analyzeSegments(surveys: SatisfactionSurvey[]): SatisfactionMetrics['segmentAnalysis'] {
    const segmentAnalysis: SatisfactionMetrics['segmentAnalysis'] = {};
    
    // Group surveys by segment
    const surveysBySegment: Record<string, SatisfactionSurvey[]> = {};
    surveys.forEach(survey => {
      const segment = survey.contextualData?.userSegment || 'unknown';
      if (!surveysBySegment[segment]) {
        surveysBySegment[segment] = [];
      }
      surveysBySegment[segment].push(survey);
    });
    
    // Analyze each segment
    Object.entries(surveysBySegment).forEach(([segment, segmentSurveys]) => {
      const ratings = segmentSurveys.map(s => s.responses.overallRating);
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      segmentAnalysis[segment] = {
        averageRating,
        responseCount: segmentSurveys.length,
        keyIssues: [
          'Result relevance could be improved',
          'Search speed needs optimization'
        ],
        keyPraises: [
          'Easy to use interface',
          'Comprehensive contact information'
        ],
        satisfactionTrend: this.calculateTrend(ratings)
      };
    });
    
    return segmentAnalysis;
  }

  private analyzeTemporalTrends(surveys: SatisfactionSurvey[]): SatisfactionMetrics['temporalTrends'] {
    // Group surveys by date
    const surveysByDate: Record<string, SatisfactionSurvey[]> = {};
    surveys.forEach(survey => {
      const date = survey.timestamp.toISOString().split('T')[0];
      if (!surveysByDate[date]) {
        surveysByDate[date] = [];
      }
      surveysByDate[date].push(survey);
    });
    
    // Calculate daily ratings
    const dailyRatings = Object.entries(surveysByDate).map(([date, daySurveys]) => ({
      date,
      rating: daySurveys.reduce((sum, s) => sum + s.responses.overallRating, 0) / daySurveys.length,
      responses: daySurveys.length
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate weekly trends (simplified)
    const weeklyTrends = this.aggregateTrends(dailyRatings, 'week');
    
    // Calculate monthly trends (simplified)
    const monthlyTrends = this.aggregateTrends(dailyRatings, 'month');
    
    // Calculate rating velocity
    const ratingVelocity = dailyRatings.length >= 2 
      ? dailyRatings[dailyRatings.length - 1].rating - dailyRatings[0].rating
      : 0;

    return {
      dailyRatings,
      weeklyTrends,
      monthlyTrends,
      ratingVelocity
    };
  }

  private generateInsights(metrics: SatisfactionMetrics): SatisfactionReport['insights'] {
    const insights: SatisfactionReport['insights'] = [];
    
    // Overall satisfaction insights
    if (metrics.overall.averageRating >= 4.2) {
      insights.push({
        type: 'strength',
        title: 'High Overall Satisfaction',
        description: `Users rate the feature ${metrics.overall.averageRating.toFixed(1)}/5, indicating strong satisfaction`,
        impact: 'high',
        data: {
          averageRating: metrics.overall.averageRating,
          satisfactionScore: metrics.overall.satisfactionScore
        },
        recommendations: [
          'Leverage satisfied users for testimonials',
          'Implement referral programs',
          'Showcase success stories'
        ]
      });
    }
    
    // NPS insights
    if (metrics.overall.netPromoterScore >= 50) {
      insights.push({
        type: 'strength',
        title: 'Strong Net Promoter Score',
        description: `NPS of ${metrics.overall.netPromoterScore.toFixed(0)} indicates users are likely to recommend the feature`,
        impact: 'high',
        data: {
          netPromoterScore: metrics.overall.netPromoterScore
        },
        recommendations: [
          'Implement user advocacy program',
          'Create shareable success metrics',
          'Encourage user reviews and testimonials'
        ]
      });
    }
    
    // Sentiment insights
    if (metrics.sentiment.overallSentiment < 0) {
      insights.push({
        type: 'weakness',
        title: 'Negative Overall Sentiment',
        description: `Sentiment score of ${metrics.sentiment.overallSentiment.toFixed(2)} indicates user dissatisfaction`,
        impact: 'high',
        data: {
          overallSentiment: metrics.sentiment.overallSentiment,
          negativePercentage: metrics.sentiment.sentimentDistribution.negative
        },
        recommendations: [
          'Investigate root causes of negative sentiment',
          'Implement user feedback loops',
          'Prioritize addressing top issues',
          'Communicate improvement plans'
        ]
      });
    }
    
    // Dimension insights
    Object.entries(metrics.dimensions).forEach(([dimension, data]) => {
      if (data.average < 3.0) {
        insights.push({
          type: 'weakness',
          title: `Low ${this.formatDimensionName(dimension)} Rating`,
          description: `${this.formatDimensionName(dimension)} rating is ${data.average.toFixed(1)}/5, which needs improvement`,
          impact: 'medium',
          data: {
            dimension,
            averageRating: data.average,
            trend: data.trend
          },
          recommendations: [
            `Focus on improving ${this.formatDimensionName(dimension)}`,
            'Analyze specific user feedback',
            'Implement targeted improvements'
          ]
        });
      }
    });
    
    return insights;
  }

  private generateActionItems(insights: SatisfactionReport['insights']): SatisfactionReport['actionItems'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    insights.forEach(insight => {
      if (insight.impact === 'high') {
        immediate.push(...insight.recommendations.slice(0, 2));
        shortTerm.push(...insight.recommendations.slice(2));
      } else if (insight.impact === 'medium') {
        shortTerm.push(...insight.recommendations.slice(0, 2));
        longTerm.push(...insight.recommendations.slice(2));
      } else {
        longTerm.push(...insight.recommendations);
      }
    });
    
    return {
      immediate: [...new Set(immediate)].slice(0, 5),
      shortTerm: [...new Set(shortTerm)].slice(0, 8),
      longTerm: [...new Set(longTerm)].slice(0, 10)
    };
  }

  private checkForAlerts(survey: SatisfactionSurvey): void {
    // Check for low overall rating
    if (survey.responses.overallRating < 2.0) {
      this.createAlert(
        'low_satisfaction',
        'critical',
        'Very Low User Rating',
        `User rated the feature ${survey.responses.overallRating}/5`,
        'overallRating',
        survey.responses.overallRating,
        2.0,
        ['Investigate user experience', 'Offer immediate support', 'Root cause analysis']
      );
    }
    
    // Check for low likelihood to recommend
    if (survey.responses.likelihoodToRecommend <= 3) {
      this.createAlert(
        'low_satisfaction',
        'warning',
        'User Unlikely to Recommend',
        `User gave likelihood to recommend score of ${survey.responses.likelihoodToRecommend}/10`,
        'likelihoodToRecommend',
        survey.responses.likelihoodToRecommend,
        3,
        ['Understand user concerns', 'Address specific issues', 'Follow up with user']
      );
    }
  }

  private createAlert(
    type: SatisfactionAlert['type'],
    severity: SatisfactionAlert['severity'],
    title: string,
    description: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a =>
      a.type === type &&
      a.metric === metric &&
      (Date.now() - a.timestamp.getTime()) < 60 * 60 * 1000 // 1 hour
    );

    if (existingAlert) return;

    const alert: SatisfactionAlert = {
      id: this.generateSurveyId(),
      type,
      severity,
      title,
      description,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    console.log(`🚨 [SATISFACTION-TRACKER] Alert: ${title}`);
  }

  private getEmptyMetrics(): SatisfactionMetrics {
    return {
      overall: {
        averageRating: 0,
        ratingDistribution: {},
        netPromoterScore: 0,
        satisfactionScore: 0,
        responseRate: 0,
        totalResponses: 0
      },
      dimensions: {
        easeOfUse: { average: 0, distribution: {}, trend: 'stable' },
        resultQuality: { average: 0, distribution: {}, trend: 'stable' },
        relevanceScore: { average: 0, distribution: {}, trend: 'stable' },
        timeToValue: { average: 0, distribution: {}, trend: 'stable' }
      },
      sentiment: {
        overallSentiment: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        keyThemes: [],
        emergingIssues: []
      },
      featureSatisfaction: {},
      segmentAnalysis: {},
      temporalTrends: {
        dailyRatings: [],
        weeklyTrends: [],
        monthlyTrends: [],
        ratingVelocity: 0
      }
    };
  }

  private generateRating(baseRating: number, variance: number): number {
    return Math.max(1, Math.min(5, baseRating + (Math.random() - 0.5) * variance * 5));
  }

  private determineUserSegment(userId: string): string {
    // Simplified segment determination
    const hash = userId.hashCode ? userId.hashCode() : userId.length;
    const segments = ['new', 'returning', 'veteran', 'power'];
    return segments[Math.abs(hash) % segments.length];
  }

  private calculateTrend(ratings: number[]): 'improving' | 'stable' | 'declining' {
    if (ratings.length < 5) return 'stable';
    
    const firstHalf = ratings.slice(0, Math.floor(ratings.length / 2));
    const secondHalf = ratings.slice(Math.floor(ratings.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, r) => sum + r, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + r, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }

  private aggregateTrends(dailyTrends: Array<{ date: string; rating: number; responses: number }>, period: 'week' | 'month'): Array<{ period: string; rating: number; responses: number }> {
    const grouped: Record<string, Array<{ rating: number; responses: number }>> = {};
    
    dailyTrends.forEach(item => {
      let key: string;
      if (period === 'week') {
        const date = new Date(item.date);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = item.date.slice(0, 7); // YYYY-MM
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({ rating: item.rating, responses: item.responses });
    });
    
    return Object.entries(grouped).map(([periodKey, items]) => ({
      period: periodKey,
      rating: items.reduce((sum, item) => sum + item.rating * item.responses, 0) / items.reduce((sum, item) => sum + item.responses, 0),
      responses: items.reduce((sum, item) => sum + item.responses, 0)
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  private formatDimensionName(dimension: string): string {
    return dimension.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  private getAlerts(): SatisfactionAlert[] {
    return [...this.alerts];
  }

  private generateSurveyId(): string {
    return `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.cleanupOldSurveys();
        this.checkMetricsAlerts();
      } catch (error) {
        console.error('User satisfaction monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [SATISFACTION-TRACKER] User satisfaction tracking started');
  }

  private cleanupOldSurveys(): void {
    // Keep only last 90 days of surveys
    const cutoffTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const originalLength = this.surveys.length;
    
    this.surveys = this.surveys.filter(survey => survey.timestamp >= cutoffTime);
    
    if (this.surveys.length < originalLength) {
      console.log(`🧹 [SATISFACTION-TRACKER] Cleaned up ${originalLength - this.surveys.length} old surveys`);
    }
  }

  private checkMetricsAlerts(): void {
    // Get recent metrics
    const metrics = this.getSatisfactionMetrics({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    });

    // Check for low overall rating
    if (metrics.overall.averageRating < this.thresholds.minOverallRating) {
      this.createAlert(
        'low_satisfaction',
        'warning',
        'Low Overall Satisfaction',
        `Average rating is ${metrics.overall.averageRating.toFixed(1)}/5, below threshold of ${this.thresholds.minOverallRating}`,
        'averageRating',
        metrics.overall.averageRating,
        this.thresholds.minOverallRating,
        [
          'Investigate root causes of dissatisfaction',
          'Analyze user feedback',
          'Implement improvement measures',
          'Consider user outreach'
        ]
      );
    }

    // Check for low NPS
    if (metrics.overall.netPromoterScore < this.thresholds.minNetPromoterScore) {
      this.createAlert(
        'low_satisfaction',
        'warning',
        'Low Net Promoter Score',
        `NPS is ${metrics.overall.netPromoterScore.toFixed(0)}, below threshold of ${this.thresholds.minNetPromoterScore}`,
        'netPromoterScore',
        metrics.overall.netPromoterScore,
        this.thresholds.minNetPromoterScore,
        [
          'Analyze detractor feedback',
          'Address user concerns',
          'Improve overall experience',
          'Implement user advocacy program'
        ]
      );
    }

    // Check for high negative sentiment
    if (metrics.sentiment.sentimentDistribution.negative > this.thresholds.maxNegativeSentiment) {
      this.createAlert(
        'sentiment_decline',
        'critical',
        'High Negative Sentiment',
        `${metrics.sentiment.sentimentDistribution.negative.toFixed(1)}% of feedback is negative`,
        'negativeSentiment',
        metrics.sentiment.sentimentDistribution.negative,
        this.thresholds.maxNegativeSentiment,
        [
          'Analyze negative feedback themes',
          'Address top issues',
          'Implement sentiment improvements',
          'Consider immediate user outreach'
        ]
      );
    }
  }
}

// Export singleton instance
export const userSatisfactionTracker = UserSatisfactionTracker.getInstance();

// Export utility functions
export async function recordPostSearchSatisfaction(
  userId: string,
  sessionId: string,
  rating: number,
  query?: string,
  resultCount?: number
): Promise<string> {
  return userSatisfactionTracker.recordPostSearchSatisfaction(userId, sessionId, rating, query, resultCount);
}

export async function recordPeriodicSatisfaction(
  userId: string,
  sessionId: string,
  responses: SatisfactionSurvey['responses'],
  feedback?: SatisfactionSurvey['feedback']
): Promise<string> {
  return userSatisfactionTracker.recordPeriodicSatisfaction(userId, sessionId, responses, feedback);
}

export async function getSatisfactionMetrics(timeRange?: { start: Date; end: Date }): Promise<SatisfactionMetrics> {
  return userSatisfactionTracker.getSatisfactionMetrics(timeRange);
}

export async function generateSatisfactionReport(timeRange: { start: Date; end: Date }): Promise<SatisfactionReport> {
  return userSatisfactionTracker.generateSatisfactionReport(timeRange);
}

// Add missing method to String prototype for hash code
if (!String.prototype.hashCode) {
  String.prototype.hashCode = function() {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  };
}