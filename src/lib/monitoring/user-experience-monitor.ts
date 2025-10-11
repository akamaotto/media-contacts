/**
 * User Experience Monitoring System
 * Monitors user interactions, satisfaction, and experience metrics
 */

export interface UserSessionMetrics {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  pageViews: number;
  interactions: number;
  errors: number;
  featureUsage: Record<string, number>;
  searchQueries: number;
  successfulSearches: number;
  abandonedSearches: number;
  averageResponseTime: number;
  userSatisfaction?: number;
  deviceType: string;
  browser: string;
  platform: string;
  referrer?: string;
  exitPage?: string;
  bounceRate: number;
}

export interface UserInteractionEvent {
  id: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  type: 'click' | 'search' | 'filter' | 'export' | 'feedback' | 'error' | 'navigation' | 'feature_use';
  element?: string;
  feature?: string;
  data?: Record<string, any>;
  responseTime?: number;
  success?: boolean;
  error?: string;
  page?: string;
  section?: string;
}

export interface UserFeedback {
  id: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  feature: string;
  rating: number; // 1-5 scale
  comment?: string;
  category: 'usability' | 'performance' | 'feature_request' | 'bug_report' | 'general';
  context?: Record<string, any>;
}

export interface UserExperienceMetrics {
  timestamp: Date;
  sessions: {
    total: number;
    active: number;
    averageDuration: number;
    bounceRate: number;
    newUsers: number;
    returningUsers: number;
  };
  engagement: {
    pageViews: number;
    interactions: number;
    featureAdoption: Record<string, number>;
    timeOnPage: number;
    clickThroughRate: number;
    scrollDepth: number;
  };
  search: {
    totalQueries: number;
    successRate: number;
    averageResults: number;
    zeroResultsRate: number;
    averageResponseTime: number;
    abandonmentRate: number;
    refinementRate: number;
  };
  satisfaction: {
    averageRating: number;
    ratingsByCategory: Record<string, number>;
    feedbackCount: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    issues: Array<{
      category: string;
      count: number;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  performance: {
    averagePageLoadTime: number;
    averageInteractionResponseTime: number;
    errorRate: number;
    crashRate: number;
  };
  conversion: {
    searchToContactRate: number;
    exportRate: number;
    featureConversionRate: Record<string, number>;
    goalCompletionRate: number;
  };
}

export interface UserExperienceAlert {
  id: string;
  type: 'engagement' | 'satisfaction' | 'performance' | 'conversion' | 'error';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  affectedUsers?: number;
  recommendations: string[];
}

export interface UserExperienceThresholds {
  engagement: {
    minAverageSessionDuration: number; // seconds
    maxBounceRate: number; // percentage
    minFeatureAdoptionRate: number; // percentage
    minClickThroughRate: number; // percentage
  };
  search: {
    minSuccessRate: number; // percentage
    maxZeroResultsRate: number; // percentage
    maxAbandonmentRate: number; // percentage
    maxAverageResponseTime: number; // milliseconds
  };
  satisfaction: {
    minAverageRating: number; // 1-5 scale
    maxNegativeFeedbackRate: number; // percentage
  };
  performance: {
    maxAveragePageLoadTime: number; // milliseconds
    maxErrorRate: number; // percentage
  };
  conversion: {
    minSearchToContactRate: number; // percentage
    minGoalCompletionRate: number; // percentage
  };
}

/**
 * User Experience Monitor Class
 */
export class UserExperienceMonitor {
  private static instance: UserExperienceMonitor;
  private sessions: Map<string, UserSessionMetrics> = new Map();
  private interactions: UserInteractionEvent[] = [];
  private feedback: UserFeedback[] = [];
  private metrics: UserExperienceMetrics;
  private thresholds: UserExperienceThresholds;
  private alerts: UserExperienceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private maxInteractions = 10000;
  private maxFeedback = 5000;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.startMonitoring();
    this.startSessionCleanup();
  }

  static getInstance(): UserExperienceMonitor {
    if (!UserExperienceMonitor.instance) {
      UserExperienceMonitor.instance = new UserExperienceMonitor();
    }
    return UserExperienceMonitor.instance;
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): UserExperienceMetrics {
    return {
      timestamp: new Date(),
      sessions: {
        total: 0,
        active: 0,
        averageDuration: 0,
        bounceRate: 0,
        newUsers: 0,
        returningUsers: 0
      },
      engagement: {
        pageViews: 0,
        interactions: 0,
        featureAdoption: {},
        timeOnPage: 0,
        clickThroughRate: 0,
        scrollDepth: 0
      },
      search: {
        totalQueries: 0,
        successRate: 100,
        averageResults: 0,
        zeroResultsRate: 0,
        averageResponseTime: 0,
        abandonmentRate: 0,
        refinementRate: 0
      },
      satisfaction: {
        averageRating: 0,
        ratingsByCategory: {},
        feedbackCount: 0,
        sentiment: 'neutral',
        issues: []
      },
      performance: {
        averagePageLoadTime: 0,
        averageInteractionResponseTime: 0,
        errorRate: 0,
        crashRate: 0
      },
      conversion: {
        searchToContactRate: 0,
        exportRate: 0,
        featureConversionRate: {},
        goalCompletionRate: 0
      }
    };
  }

  /**
   * Initialize default thresholds
   */
  private initializeThresholds(): UserExperienceThresholds {
    return {
      engagement: {
        minAverageSessionDuration: 60, // 1 minute
        maxBounceRate: 40, // 40%
        minFeatureAdoptionRate: 10, // 10%
        minClickThroughRate: 5 // 5%
      },
      search: {
        minSuccessRate: 80, // 80%
        maxZeroResultsRate: 15, // 15%
        maxAbandonmentRate: 25, // 25%
        maxAverageResponseTime: 5000 // 5 seconds
      },
      satisfaction: {
        minAverageRating: 3.5, // 3.5/5
        maxNegativeFeedbackRate: 20 // 20%
      },
      performance: {
        maxAveragePageLoadTime: 3000, // 3 seconds
        maxErrorRate: 5 // 5%
      },
      conversion: {
        minSearchToContactRate: 10, // 10%
        minGoalCompletionRate: 15 // 15%
      }
    };
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.updateMetrics();
        this.checkAlerts();
      } catch (error) {
        console.error('User experience monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [USER-EXPERIENCE-MONITOR] User experience monitoring started');
  }

  /**
   * Start session cleanup
   */
  private startSessionCleanup(): void {
    this.sessionTimeout = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Start a new user session
   */
  startSession(data: {
    sessionId: string;
    userId?: string;
    deviceType: string;
    browser: string;
    platform: string;
    referrer?: string;
    page?: string;
  }): void {
    const session: UserSessionMetrics = {
      sessionId: data.sessionId,
      userId: data.userId,
      startTime: new Date(),
      duration: 0,
      pageViews: 1,
      interactions: 0,
      errors: 0,
      featureUsage: {},
      searchQueries: 0,
      successfulSearches: 0,
      abandonedSearches: 0,
      averageResponseTime: 0,
      deviceType: data.deviceType,
      browser: data.browser,
      platform: data.platform,
      referrer: data.referrer,
      bounceRate: 0
    };

    this.sessions.set(data.sessionId, session);
    
    // Record initial page view
    this.recordInteraction({
      id: this.generateEventId(),
      sessionId: data.sessionId,
      userId: data.userId,
      timestamp: new Date(),
      type: 'navigation',
      data: { page: data.page, action: 'page_load' },
      page: data.page
    });
  }

  /**
   * End a user session
   */
  endSession(sessionId: string, data?: { exitPage?: string; satisfaction?: number }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
    session.exitPage = data?.exitPage;
    session.userSatisfaction = data?.satisfaction;

    // Calculate bounce rate (single page visit)
    session.bounceRate = session.pageViews <= 1 ? 100 : 0;

    this.sessions.set(sessionId, session);
  }

  /**
   * Record a user interaction
   */
  recordInteraction(data: {
    id?: string;
    sessionId: string;
    userId?: string;
    timestamp?: Date;
    type: UserInteractionEvent['type'];
    element?: string;
    feature?: string;
    data?: Record<string, any>;
    responseTime?: number;
    success?: boolean;
    error?: string;
    page?: string;
    section?: string;
  }): void {
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    const interaction: UserInteractionEvent = {
      id: data.id || this.generateEventId(),
      sessionId: data.sessionId,
      userId: data.userId,
      timestamp: data.timestamp || new Date(),
      type: data.type,
      element: data.element,
      feature: data.feature,
      data: data.data,
      responseTime: data.responseTime,
      success: data.success,
      error: data.error,
      page: data.page,
      section: data.section
    };

    this.interactions.push(interaction);
    
    // Keep only last N interactions
    if (this.interactions.length > this.maxInteractions) {
      this.interactions = this.interactions.slice(-this.maxInteractions);
    }

    // Update session metrics
    session.interactions++;
    
    if (data.responseTime) {
      // Update average response time
      const totalResponseTime = session.averageResponseTime * (session.interactions - 1) + data.responseTime;
      session.averageResponseTime = totalResponseTime / session.interactions;
    }

    if (data.success === false) {
      session.errors++;
    }

    // Track feature usage
    if (data.feature) {
      session.featureUsage[data.feature] = (session.featureUsage[data.feature] || 0) + 1;
    }

    // Track search metrics
    if (data.type === 'search') {
      session.searchQueries++;
      if (data.success) {
        session.successfulSearches++;
      } else if (data.error?.includes('abandoned')) {
        session.abandonedSearches++;
      }
    }

    // Track page views
    if (data.type === 'navigation') {
      session.pageViews++;
    }
  }

  /**
   * Record user feedback
   */
  recordFeedback(data: {
    userId?: string;
    sessionId?: string;
    timestamp?: Date;
    feature: string;
    rating: number;
    comment?: string;
    category: UserFeedback['category'];
    context?: Record<string, any>;
  }): void {
    const feedback: UserFeedback = {
      id: this.generateEventId(),
      userId: data.userId,
      sessionId: data.sessionId,
      timestamp: data.timestamp || new Date(),
      feature: data.feature,
      rating: data.rating,
      comment: data.comment,
      category: data.category,
      context: data.context
    };

    this.feedback.push(feedback);
    
    // Keep only last N feedback entries
    if (this.feedback.length > this.maxFeedback) {
      this.feedback = this.feedback.slice(-this.maxFeedback);
    }

    // Update session satisfaction if session is provided
    if (data.sessionId) {
      const session = this.sessions.get(data.sessionId);
      if (session) {
        session.userSatisfaction = data.rating;
      }
    }
  }

  /**
   * Update all metrics
   */
  private updateMetrics(): void {
    this.metrics.timestamp = new Date();
    
    this.updateSessionMetrics();
    this.updateEngagementMetrics();
    this.updateSearchMetrics();
    this.updateSatisfactionMetrics();
    this.updatePerformanceMetrics();
    this.updateConversionMetrics();
  }

  /**
   * Update session metrics
   */
  private updateSessionMetrics(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all sessions from last day
    const recentSessions = Array.from(this.sessions.values()).filter(
      session => session.startTime >= oneDayAgo
    );

    // Get active sessions (last 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const activeSessions = recentSessions.filter(
      session => !session.endTime || session.endTime >= thirtyMinutesAgo
    );

    // Calculate average session duration
    const completedSessions = recentSessions.filter(session => session.endTime);
    const totalDuration = completedSessions.reduce((sum, session) => sum + session.duration, 0);
    const averageDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;

    // Calculate bounce rate
    const bouncedSessions = completedSessions.filter(session => session.bounceRate === 100);
    const bounceRate = completedSessions.length > 0 ? (bouncedSessions.length / completedSessions.length) * 100 : 0;

    // Get new vs returning users
    const allUsers = new Set(recentSessions.map(s => s.userId).filter(Boolean));
    const returningUsers = new Set();
    
    // Check which users had sessions in the previous week
    Array.from(this.sessions.values()).forEach(session => {
      if (session.userId && session.startTime >= oneWeekAgo && session.startTime < oneDayAgo) {
        returningUsers.add(session.userId);
      }
    });

    const newUsers = allUsers.size - returningUsers.size;

    this.metrics.sessions = {
      total: recentSessions.length,
      active: activeSessions.length,
      averageDuration,
      bounceRate,
      newUsers,
      returningUsers: returningUsers.size
    };
  }

  /**
   * Update engagement metrics
   */
  private updateEngagementMetrics(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent interactions
    const recentInteractions = this.interactions.filter(
      interaction => interaction.timestamp >= oneDayAgo
    );

    // Calculate page views
    const pageViews = recentInteractions.filter(i => i.type === 'navigation').length;

    // Calculate feature adoption
    const featureUsage: Record<string, number> = {};
    const totalSessions = this.metrics.sessions.total;

    recentInteractions.forEach(interaction => {
      if (interaction.feature) {
        featureUsage[interaction.feature] = (featureUsage[interaction.feature] || 0) + 1;
      }
    });

    // Convert to adoption rates
    const featureAdoption: Record<string, number> = {};
    Object.entries(featureUsage).forEach(([feature, count]) => {
      featureAdoption[feature] = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
    });

    // Calculate click-through rate (simplified)
    const clickInteractions = recentInteractions.filter(i => i.type === 'click');
    const totalInteractions = recentInteractions.filter(i => 
      ['click', 'search', 'filter', 'export'].includes(i.type)
    );
    const clickThroughRate = totalInteractions.length > 0 
      ? (clickInteractions.length / totalInteractions.length) * 100 
      : 0;

    this.metrics.engagement = {
      pageViews,
      interactions: recentInteractions.length,
      featureAdoption,
      timeOnPage: this.metrics.sessions.averageDuration,
      clickThroughRate,
      scrollDepth: 0 // Would need scroll tracking implementation
    };
  }

  /**
   * Update search metrics
   */
  private updateSearchMetrics(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent search interactions
    const recentSearches = this.interactions.filter(
      interaction => interaction.type === 'search' && interaction.timestamp >= oneDayAgo
    );

    const successfulSearches = recentSearches.filter(s => s.success);
    const zeroResultsSearches = recentSearches.filter(s => 
      s.data && s.data.resultCount === 0
    );
    const abandonedSearches = recentSearches.filter(s => 
      s.error?.includes('abandoned')
    );

    // Calculate success rate
    const successRate = recentSearches.length > 0 
      ? (successfulSearches.length / recentSearches.length) * 100 
      : 100;

    // Calculate zero results rate
    const zeroResultsRate = recentSearches.length > 0 
      ? (zeroResultsSearches.length / recentSearches.length) * 100 
      : 0;

    // Calculate abandonment rate
    const abandonmentRate = recentSearches.length > 0 
      ? (abandonedSearches.length / recentSearches.length) * 100 
      : 0;

    // Calculate average response time
    const responseTimeSearches = recentSearches.filter(s => s.responseTime);
    const totalResponseTime = responseTimeSearches.reduce((sum, s) => sum + (s.responseTime || 0), 0);
    const averageResponseTime = responseTimeSearches.length > 0 
      ? totalResponseTime / responseTimeSearches.length 
      : 0;

    // Calculate average results
    const resultSearches = recentSearches.filter(s => s.data && s.data.resultCount !== undefined);
    const totalResults = resultSearches.reduce((sum, s) => sum + (s.data?.resultCount || 0), 0);
    const averageResults = resultSearches.length > 0 ? totalResults / resultSearches.length : 0;

    // Calculate refinement rate (simplified - searches after initial search)
    const refinementSearches = recentSearches.filter(s => s.data && s.data.refinement);
    const refinementRate = recentSearches.length > 0 
      ? (refinementSearches.length / recentSearches.length) * 100 
      : 0;

    this.metrics.search = {
      totalQueries: recentSearches.length,
      successRate,
      averageResults,
      zeroResultsRate,
      averageResponseTime,
      abandonmentRate,
      refinementRate
    };
  }

  /**
   * Update satisfaction metrics
   */
  private updateSatisfactionMetrics(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent feedback
    const recentFeedback = this.feedback.filter(f => f.timestamp >= oneDayAgo);

    // Calculate average rating
    const totalRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = recentFeedback.length > 0 ? totalRating / recentFeedback.length : 0;

    // Calculate ratings by category
    const ratingsByCategory: Record<string, number> = {};
    recentFeedback.forEach(feedback => {
      if (!ratingsByCategory[feedback.category]) {
        ratingsByCategory[feedback.category] = 0;
      }
      ratingsByCategory[feedback.category] += feedback.rating;
    });

    // Calculate average for each category
    Object.keys(ratingsByCategory).forEach(category => {
      const categoryFeedback = recentFeedback.filter(f => f.category === category);
      ratingsByCategory[category] = categoryFeedback.length > 0 
        ? ratingsByCategory[category] / categoryFeedback.length 
        : 0;
    });

    // Calculate sentiment
    const positiveFeedback = recentFeedback.filter(f => f.rating >= 4).length;
    const negativeFeedback = recentFeedback.filter(f => f.rating <= 2).length;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    
    if (positiveFeedback > negativeFeedback * 2) {
      sentiment = 'positive';
    } else if (negativeFeedback > positiveFeedback * 2) {
      sentiment = 'negative';
    }

    // Identify common issues
    const issues = this.identifyCommonIssues(recentFeedback);

    this.metrics.satisfaction = {
      averageRating,
      ratingsByCategory,
      feedbackCount: recentFeedback.length,
      sentiment,
      issues
    };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent interactions with response times
    const recentInteractions = this.interactions.filter(
      interaction => interaction.timestamp >= oneDayAgo && interaction.responseTime
    );

    // Calculate average interaction response time
    const totalResponseTime = recentInteractions.reduce((sum, i) => sum + (i.responseTime || 0), 0);
    const averageResponseTime = recentInteractions.length > 0 
      ? totalResponseTime / recentInteractions.length 
      : 0;

    // Calculate error rate
    const errorInteractions = recentInteractions.filter(i => i.success === false);
    const errorRate = recentInteractions.length > 0 
      ? (errorInteractions.length / recentInteractions.length) * 100 
      : 0;

    // Calculate page load time (from navigation events)
    const pageLoadInteractions = recentInteractions.filter(
      i => i.type === 'navigation' && i.data?.page_load_time
    );
    const totalPageLoadTime = pageLoadInteractions.reduce(
      (sum, i) => sum + (i.data?.page_load_time || 0), 0
    );
    const averagePageLoadTime = pageLoadInteractions.length > 0 
      ? totalPageLoadTime / pageLoadInteractions.length 
      : 0;

    this.metrics.performance = {
      averagePageLoadTime,
      averageInteractionResponseTime: averageResponseTime,
      errorRate,
      crashRate: 0 // Would need crash tracking implementation
    };
  }

  /**
   * Update conversion metrics
   */
  private updateConversionMetrics(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent interactions
    const recentInteractions = this.interactions.filter(
      interaction => interaction.timestamp >= oneDayAgo
    );

    // Calculate search to contact rate
    const searches = recentInteractions.filter(i => i.type === 'search' && i.success);
    const contactExports = recentInteractions.filter(i => 
      i.type === 'export' && i.feature === 'contacts'
    );
    const searchToContactRate = searches.length > 0 
      ? (contactExports.length / searches.length) * 100 
      : 0;

    // Calculate export rate
    const totalExports = recentInteractions.filter(i => i.type === 'export').length;
    const exportRate = recentInteractions.length > 0 
      ? (totalExports / recentInteractions.length) * 100 
      : 0;

    // Calculate feature conversion rates
    const featureConversionRate: Record<string, number> = {};
    Object.entries(this.metrics.engagement.featureAdoption).forEach(([feature, adoption]) => {
      const featureExports = recentInteractions.filter(i => i.feature === feature && i.type === 'export');
      const featureUses = recentInteractions.filter(i => i.feature === feature);
      featureConversionRate[feature] = featureUses.length > 0 
        ? (featureExports.length / featureUses.length) * 100 
        : 0;
    });

    // Calculate goal completion rate (simplified)
    const goalCompletions = recentInteractions.filter(i => i.data?.goal_completed).length;
    const goalCompletionRate = recentInteractions.length > 0 
      ? (goalCompletions / recentInteractions.length) * 100 
      : 0;

    this.metrics.conversion = {
      searchToContactRate,
      exportRate,
      featureConversionRate,
      goalCompletionRate
    };
  }

  /**
   * Identify common issues from feedback
   */
  private identifyCommonIssues(feedback: UserFeedback[]): Array<{
    category: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }> {
    const issues: Record<string, { count: number; severity: 'low' | 'medium' | 'high' }> = {};

    feedback.forEach(f => {
      if (f.rating <= 3) {
        const severity = f.rating <= 2 ? 'high' : 'medium';
        if (!issues[f.category]) {
          issues[f.category] = { count: 0, severity };
        }
        issues[f.category].count++;
        // Upgrade severity if this feedback is more severe
        if ((severity === 'high' && issues[f.category].severity !== 'high') ||
            (severity === 'medium' && issues[f.category].severity === 'low')) {
          issues[f.category].severity = severity;
        }
      }
    });

    return Object.entries(issues)
      .map(([category, { count, severity }]) => ({ category, count, severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 issues
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const alerts: UserExperienceAlert[] = [];

    // Session alerts
    if (this.metrics.sessions.averageDuration < this.thresholds.engagement.minAverageSessionDuration) {
      alerts.push(this.createAlert(
        'engagement',
        'warning',
        'Low Average Session Duration',
        `Average session duration is ${this.metrics.sessions.averageDuration.toFixed(1)}s`,
        'average_session_duration',
        this.metrics.sessions.averageDuration,
        this.thresholds.engagement.minAverageSessionDuration,
        [
          'Improve page content and navigation',
          'Optimize page load performance',
          'Review user journey and identify friction points'
        ]
      ));
    }

    if (this.metrics.sessions.bounceRate > this.thresholds.engagement.maxBounceRate) {
      alerts.push(this.createAlert(
        'engagement',
        'warning',
        'High Bounce Rate',
        `Bounce rate is ${this.metrics.sessions.bounceRate.toFixed(1)}%`,
        'bounce_rate',
        this.metrics.sessions.bounceRate,
        this.thresholds.engagement.maxBounceRate,
        [
          'Improve landing page content',
          'Ensure page load performance is optimal',
          'Review traffic sources and alignment with content'
        ]
      ));
    }

    // Search alerts
    if (this.metrics.search.successRate < this.thresholds.search.minSuccessRate) {
      alerts.push(this.createAlert(
        'engagement',
        'warning',
        'Low Search Success Rate',
        `Search success rate is ${this.metrics.search.successRate.toFixed(1)}%`,
        'search_success_rate',
        this.metrics.search.successRate,
        this.thresholds.search.minSuccessRate,
        [
          'Improve search query understanding',
          'Enhance content indexing',
          'Review search result relevance'
        ]
      ));
    }

    if (this.metrics.search.zeroResultsRate > this.thresholds.search.maxZeroResultsRate) {
      alerts.push(this.createAlert(
        'engagement',
        'warning',
        'High Zero Results Rate',
        `Zero results rate is ${this.metrics.search.zeroResultsRate.toFixed(1)}%`,
        'zero_results_rate',
        this.metrics.search.zeroResultsRate,
        this.thresholds.search.maxZeroResultsRate,
        [
          'Analyze common zero-result queries',
          'Improve content coverage for popular topics',
          'Implement better query suggestions'
        ]
      ));
    }

    if (this.metrics.search.averageResponseTime > this.thresholds.search.maxAverageResponseTime) {
      alerts.push(this.createAlert(
        'performance',
        'warning',
        'Slow Search Response Time',
        `Average search response time is ${this.metrics.search.averageResponseTime.toFixed(0)}ms`,
        'search_response_time',
        this.metrics.search.averageResponseTime,
        this.thresholds.search.maxAverageResponseTime,
        [
          'Optimize search queries and indexing',
          'Consider implementing search caching',
          'Review search service performance'
        ]
      ));
    }

    // Satisfaction alerts
    if (this.metrics.satisfaction.averageRating < this.thresholds.satisfaction.minAverageRating) {
      alerts.push(this.createAlert(
        'satisfaction',
        'warning',
        'Low User Satisfaction',
        `Average user rating is ${this.metrics.satisfaction.averageRating.toFixed(1)}/5`,
        'average_rating',
        this.metrics.satisfaction.averageRating,
        this.thresholds.satisfaction.minAverageRating,
        [
          'Review user feedback for common issues',
          'Address most reported problems',
          'Consider user experience improvements'
        ]
      ));
    }

    // Performance alerts
    if (this.metrics.performance.averagePageLoadTime > this.thresholds.performance.maxAveragePageLoadTime) {
      alerts.push(this.createAlert(
        'performance',
        'warning',
        'Slow Page Load Time',
        `Average page load time is ${this.metrics.performance.averagePageLoadTime.toFixed(0)}ms`,
        'page_load_time',
        this.metrics.performance.averagePageLoadTime,
        this.thresholds.performance.maxAveragePageLoadTime,
        [
          'Optimize page resources and loading',
          'Implement lazy loading for non-critical resources',
          'Review and optimize JavaScript execution'
        ]
      ));
    }

    if (this.metrics.performance.errorRate > this.thresholds.performance.maxErrorRate) {
      alerts.push(this.createAlert(
        'error',
        'critical',
        'High Error Rate',
        `Error rate is ${this.metrics.performance.errorRate.toFixed(1)}%`,
        'error_rate',
        this.metrics.performance.errorRate,
        this.thresholds.performance.maxErrorRate,
        [
          'Investigate and fix reported errors',
          'Improve error handling and user feedback',
          'Monitor error trends and patterns'
        ]
      ));
    }

    // Conversion alerts
    if (this.metrics.conversion.searchToContactRate < this.thresholds.conversion.minSearchToContactRate) {
      alerts.push(this.createAlert(
        'conversion',
        'warning',
        'Low Search to Contact Conversion',
        `Search to contact rate is ${this.metrics.conversion.searchToContactRate.toFixed(1)}%`,
        'search_to_contact_rate',
        this.metrics.conversion.searchToContactRate,
        this.thresholds.conversion.minSearchToContactRate,
        [
          'Improve search result quality and relevance',
          'Enhance contact information accuracy',
          'Streamline contact export process'
        ]
      ));
    }

    // Add new alerts to the list
    alerts.forEach(alert => {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        a.type === alert.type && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 10 * 60 * 1000 // 10 minutes
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        console.log(`🚨 [USER-EXPERIENCE-MONITOR] Alert: ${alert.title}`);
      }
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Create a user experience alert
   */
  private createAlert(
    type: UserExperienceAlert['type'],
    severity: UserExperienceAlert['severity'],
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): UserExperienceAlert {
    return {
      id: `ux_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations
    };
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    let cleanedCount = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.endTime && session.startTime < thirtyMinutesAgo) {
        this.endSession(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 [USER-EXPERIENCE-MONITOR] Cleaned up ${cleanedCount} inactive sessions`);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics
   */
  getMetrics(): UserExperienceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): UserSessionMetrics | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): UserSessionMetrics[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get user interactions
   */
  getInteractions(filter?: {
    sessionId?: string;
    userId?: string;
    type?: UserInteractionEvent['type'];
    feature?: string;
    limit?: number;
  }): UserInteractionEvent[] {
    let interactions = [...this.interactions];
    
    if (filter) {
      if (filter.sessionId) {
        interactions = interactions.filter(i => i.sessionId === filter.sessionId);
      }
      if (filter.userId) {
        interactions = interactions.filter(i => i.userId === filter.userId);
      }
      if (filter.type) {
        interactions = interactions.filter(i => i.type === filter.type);
      }
      if (filter.feature) {
        interactions = interactions.filter(i => i.feature === filter.feature);
      }
    }
    
    // Sort by timestamp (newest first)
    interactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filter?.limit) {
      interactions = interactions.slice(0, filter.limit);
    }
    
    return interactions;
  }

  /**
   * Get user feedback
   */
  getFeedback(filter?: {
    userId?: string;
    sessionId?: string;
    feature?: string;
    category?: UserFeedback['category'];
    rating?: number;
    limit?: number;
  }): UserFeedback[] {
    let feedback = [...this.feedback];
    
    if (filter) {
      if (filter.userId) {
        feedback = feedback.filter(f => f.userId === filter.userId);
      }
      if (filter.sessionId) {
        feedback = feedback.filter(f => f.sessionId === filter.sessionId);
      }
      if (filter.feature) {
        feedback = feedback.filter(f => f.feature === filter.feature);
      }
      if (filter.category) {
        feedback = feedback.filter(f => f.category === filter.category);
      }
      if (filter.rating !== undefined) {
        feedback = feedback.filter(f => f.rating === filter.rating);
      }
    }
    
    // Sort by timestamp (newest first)
    feedback.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filter?.limit) {
      feedback = feedback.slice(0, filter.limit);
    }
    
    return feedback;
  }

  /**
   * Get current alerts
   */
  getAlerts(): UserExperienceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: UserExperienceAlert['severity']): UserExperienceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: UserExperienceAlert['type']): UserExperienceAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<UserExperienceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [USER-EXPERIENCE-MONITOR] Thresholds updated');
  }

  /**
   * Get user journey analysis
   */
  getUserJourney(sessionId: string): Array<{
    timestamp: Date;
    action: string;
    page?: string;
    feature?: string;
    duration?: number;
    success?: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const interactions = this.interactions.filter(i => i.sessionId === sessionId);
    const journey: Array<{
      timestamp: Date;
      action: string;
      page?: string;
      feature?: string;
      duration?: number;
      success?: boolean;
    }> = [];

    interactions.forEach((interaction, index) => {
      let duration: number | undefined;
      if (index > 0) {
        duration = interaction.timestamp.getTime() - interactions[index - 1].timestamp.getTime();
      }

      journey.push({
        timestamp: interaction.timestamp,
        action: interaction.type,
        page: interaction.page,
        feature: interaction.feature,
        duration,
        success: interaction.success
      });
    });

    return journey;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: UserExperienceMetrics;
    alerts: UserExperienceAlert[];
    summary: {
      overall: 'excellent' | 'good' | 'fair' | 'poor';
      issues: string[];
      recommendations: string[];
    };
  } {
    const criticalAlerts = this.getAlertsBySeverity('critical');
    const warningAlerts = this.getAlertsBySeverity('warning');
    
    let overall: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (criticalAlerts.length > 0) {
      overall = 'poor';
    } else if (warningAlerts.length > 3) {
      overall = 'fair';
    } else if (warningAlerts.length > 0) {
      overall = 'good';
    }

    const issues = this.alerts.map(alert => alert.title);
    const recommendations = this.alerts.flatMap(alert => alert.recommendations);

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        overall,
        issues,
        recommendations
      }
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.sessionTimeout) {
      clearInterval(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    console.log('🛑 [USER-EXPERIENCE-MONITOR] User experience monitoring stopped');
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.sessions.clear();
    this.interactions = [];
    this.feedback = [];
    console.log('🔄 [USER-EXPERIENCE-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const userExperienceMonitor = UserExperienceMonitor.getInstance();

// Export utility functions
export function startUserSession(data: {
  sessionId: string;
  userId?: string;
  deviceType: string;
  browser: string;
  platform: string;
  referrer?: string;
  page?: string;
}): void {
  userExperienceMonitor.startSession(data);
}

export function endUserSession(sessionId: string, data?: { exitPage?: string; satisfaction?: number }): void {
  userExperienceMonitor.endSession(sessionId, data);
}

export function recordUserInteraction(data: {
  sessionId: string;
  userId?: string;
  type: UserInteractionEvent['type'];
  element?: string;
  feature?: string;
  data?: Record<string, any>;
  responseTime?: number;
  success?: boolean;
  error?: string;
  page?: string;
  section?: string;
}): void {
  userExperienceMonitor.recordInteraction(data);
}

export function recordUserFeedback(data: {
  userId?: string;
  sessionId?: string;
  feature: string;
  rating: number;
  comment?: string;
  category: UserFeedback['category'];
  context?: Record<string, any>;
}): void {
  userExperienceMonitor.recordFeedback(data);
}

export function getUserExperienceMetrics(): UserExperienceMetrics {
  return userExperienceMonitor.getMetrics();
}

export function getUserExperienceAlerts(): UserExperienceAlert[] {
  return userExperienceMonitor.getAlerts();
}

export function getUserJourney(sessionId: string): Array<{
  timestamp: Date;
  action: string;
  page?: string;
  feature?: string;
  duration?: number;
  success?: boolean;
}> {
  return userExperienceMonitor.getUserJourney(sessionId);
}