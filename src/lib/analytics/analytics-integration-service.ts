/**
 * Analytics Integration Service
 * Integrates all analytics components for the "Find Contacts with AI" feature
 */

import { 
  aiFeatureSuccessMetrics, 
  type SuccessMetricsReport 
} from './ai-feature-success-metrics';
import { 
  featureAdoptionTracker, 
  type AdoptionMetrics 
} from './feature-adoption-tracker';
import { 
  usagePatternAnalyzer, 
  type UsageReport 
} from './usage-pattern-analyzer';
import { 
  userSatisfactionTracker, 
  type SatisfactionReport 
} from './user-satisfaction-tracker';
import { 
  businessImpactCalculator, 
  type ImpactReport 
} from './business-impact-calculator';
import { 
  userBehaviorTracker, 
  type BehaviorReport 
} from './user-behavior-tracker';
import { 
  abTestingAnalytics, 
  type ExperimentReport 
} from './ab-testing-analytics';
import { 
  automatedReportingService, 
  type ReportSchedule 
} from './automated-reporting-service';

export interface IntegratedAnalyticsReport {
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  executiveSummary: {
    overallStatus: 'excellent' | 'good' | 'fair' | 'poor';
    keyMetrics: Record<string, number>;
    topInsights: string[];
    primaryRecommendations: string[];
    businessImpact: {
      roi: number;
      value: number;
      growth: number;
    };
  };
  detailedReports: {
    successMetrics: SuccessMetricsReport | null;
    adoption: AdoptionMetrics | null;
    usage: UsageReport | null;
    satisfaction: SatisfactionReport | null;
    businessImpact: ImpactReport | null;
    behavior: BehaviorReport | null;
    abTesting: ExperimentReport[] | null;
  };
  crossAnalyticsInsights: CrossAnalyticsInsight[];
  unifiedRecommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  actionPlan: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    owner: string;
    timeline: string;
    expectedImpact: string;
    dependencies: string[];
  }[];
}

export interface CrossAnalyticsInsight {
  id: string;
  type: 'correlation' | 'causation' | 'anomaly' | 'opportunity' | 'risk';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 scale
  data: {
    primaryMetrics: Record<string, number>;
    supportingMetrics: Record<string, number>;
    affectedAnalytics: string[];
    segments?: string[];
  };
  recommendations: string[];
  generatedAt: Date;
}

export interface AnalyticsIntegrationConfig {
  enabledServices: string[];
  refreshInterval: number; // minutes
  cachingEnabled: boolean;
  alertThresholds: Record<string, number>;
  reportSchedules: ReportSchedule[];
  integrations: {
    crm: boolean;
    email: boolean;
    slack: boolean;
    dataWarehouse: boolean;
  };
}

export interface AnalyticsTrackingData {
  userId: string;
  sessionId: string;
  event: string;
  properties: Record<string, any>;
  context: {
    page: string;
    userAgent: string;
    ip: string;
    timestamp: Date;
  };
}

export class AnalyticsIntegrationService {
  private static instance: AnalyticsIntegrationService;
  private config: AnalyticsIntegrationConfig;
  private cache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 300000; // 5 minutes
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = this.initializeDefaultConfig();
    this.startMonitoring();
  }

  static getInstance(): AnalyticsIntegrationService {
    if (!AnalyticsIntegrationService.instance) {
      AnalyticsIntegrationService.instance = new AnalyticsIntegrationService();
    }
    return AnalyticsIntegrationService.instance;
  }

  /**
   * Track analytics event across all services
   */
  async trackEvent(data: AnalyticsTrackingData): Promise<void> {
    // Track event in user behavior tracker
    await userBehaviorTracker.trackEvent({
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: data.event as any,
      properties: data.properties,
      context: {
        page: data.context.page,
        userAgent: data.context.userAgent,
        ip: data.context.ip
      }
    });

    // Track specific events in relevant services
    switch (data.event) {
      case 'discovered':
        await featureAdoptionTracker.trackDiscovery(
          data.userId,
          data.sessionId,
          data.properties.source || 'ui_discovery',
          data.properties.context
        );
        break;
        
      case 'first_use':
        await featureAdoptionTracker.trackFirstUse(
          data.userId,
          data.sessionId,
          data.properties.source || 'ui_discovery',
          data.properties.timeToAdoption
        );
        break;
        
      case 'search':
        await userBehaviorTracker.trackSearch(
          data.userId,
          data.sessionId,
          data.properties.query,
          data.properties.resultCount,
          data.properties.timeToFirstResult
        );
        break;
        
      case 'export':
        await userBehaviorTracker.trackExport(
          data.userId,
          data.sessionId,
          data.properties.exportType,
          data.properties.recordCount
        );
        break;
        
      case 'satisfaction':
        await userSatisfactionTracker.recordPostSearchSatisfaction(
          data.userId,
          data.sessionId,
          data.properties.rating,
          data.properties.query,
          data.properties.resultCount
        );
        break;
        
      case 'abandon':
        await userBehaviorTracker.trackAbandonment(
          data.userId,
          data.sessionId,
          data.properties.abandonmentPoint,
          data.properties.reason
        );
        break;
    }

    console.log(`🔗 [ANALYTICS-INTEGRATION] Tracked event: ${data.event} for user ${data.userId}`);
  }

  /**
   * Generate comprehensive integrated analytics report
   */
  async generateIntegratedReport(timeRange: { start: Date; end: Date }): Promise<IntegratedAnalyticsReport> {
    // Get individual reports
    const [successReport, adoptionMetrics, usageReport, satisfactionReport, impactReport, behaviorReport] = await Promise.all([
      this.getSuccessMetricsReport(timeRange),
      this.getAdoptionMetrics(timeRange),
      this.getUsageReport(timeRange),
      this.getSatisfactionReport(timeRange),
      this.getBusinessImpactReport(timeRange),
      this.getBehaviorReport(timeRange)
    ]);

    // Get A/B testing reports
    const abTestingReports = await this.getABTestingReports(timeRange);

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(
      successReport,
      adoptionMetrics,
      usageReport,
      satisfactionReport,
      impactReport,
      behaviorReport,
      abTestingReports
    );

    // Generate cross-analytics insights
    const crossAnalyticsInsights = await this.generateCrossAnalyticsInsights(
      successReport,
      adoptionMetrics,
      usageReport,
      satisfactionReport,
      impactReport,
      behaviorReport,
      abTestingReports
    );

    // Generate unified recommendations
    const unifiedRecommendations = this.generateUnifiedRecommendations(
      executiveSummary.topInsights,
      crossAnalyticsInsights
    );

    // Generate action plan
    const actionPlan = this.generateActionPlan(unifiedRecommendations);

    return {
      generatedAt: new Date(),
      timeRange,
      executiveSummary,
      detailedReports: {
        successMetrics: successReport,
        adoption: adoptionMetrics,
        usage: usageReport,
        satisfaction: satisfactionReport,
        businessImpact: impactReport,
        behavior: behaviorReport,
        abTesting: abTestingReports
      },
      crossAnalyticsInsights,
      unifiedRecommendations,
      actionPlan
    };
  }

  /**
   * Get real-time analytics dashboard data
   */
  async getDashboardData(timeRange: { start: Date; end: Date }): Promise<{
    summary: any;
    trends: any;
    alerts: any;
    recommendations: any;
  }> {
    // Get summary data
    const summary = await this.getSummaryData(timeRange);
    
    // Get trends data
    const trends = await this.getTrendsData(timeRange);
    
    // Get alerts data
    const alerts = await this.getAlertsData(timeRange);
    
    // Get recommendations data
    const recommendations = await this.getRecommendationsData(timeRange);

    return {
      summary,
      trends,
      alerts,
      recommendations
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 [ANALYTICS-INTEGRATION] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Initialize analytics integrations
   */
  async initializeIntegrations(): Promise<void> {
    // Initialize feature flags
    try {
      const { initializeFeatureFlags } = await import('@/lib/feature-flags/feature-flag-service');
      await initializeFeatureFlags();
      console.log('✅ [ANALYTICS-INTEGRATION] Feature flags initialized');
    } catch (error) {
      console.error('❌ [ANALYTICS-INTEGRATION] Failed to initialize feature flags:', error);
    }

    // Initialize A/B testing service
    try {
      // A/B testing service is already initialized as singleton
      console.log('✅ [ANALYTICS-INTEGRATION] A/B testing service initialized');
    } catch (error) {
      console.error('❌ [ANALYTICS-INTEGRATION] Failed to initialize A/B testing service:', error);
    }

    // Initialize automated reporting service
    try {
      // Automated reporting service is already initialized as singleton
      console.log('✅ [ANALYTICS-INTEGRATION] Automated reporting service initialized');
    } catch (error) {
      console.error('❌ [ANALYTICS-INTEGRATION] Failed to initialize automated reporting service:', error);
    }

    // Set up default report schedules
    await this.setupDefaultReportSchedules();
  }

  private async getSuccessMetricsReport(timeRange: { start: Date; end: Date }): Promise<SuccessMetricsReport | null> {
    try {
      return await aiFeatureSuccessMetrics.generateSuccessReport(timeRange);
    } catch (error) {
      console.error('Error getting success metrics report:', error);
      return null;
    }
  }

  private async getAdoptionMetrics(timeRange: { start: Date; end: Date }): Promise<AdoptionMetrics | null> {
    try {
      return await featureAdoptionTracker.getAdoptionMetrics(timeRange);
    } catch (error) {
      console.error('Error getting adoption metrics:', error);
      return null;
    }
  }

  private async getUsageReport(timeRange: { start: Date; end: Date }): Promise<UsageReport | null> {
    try {
      return await usagePatternAnalyzer.generateUsageReport(timeRange);
    } catch (error) {
      console.error('Error getting usage report:', error);
      return null;
    }
  }

  private async getSatisfactionReport(timeRange: { start: Date; end: Date }): Promise<SatisfactionReport | null> {
    try {
      return await userSatisfactionTracker.generateSatisfactionReport(timeRange);
    } catch (error) {
      console.error('Error getting satisfaction report:', error);
      return null;
    }
  }

  private async getBusinessImpactReport(timeRange: { start: Date; end: Date }): Promise<ImpactReport | null> {
    try {
      return await businessImpactCalculator.generateImpactReport(timeRange);
    } catch (error) {
      console.error('Error getting business impact report:', error);
      return null;
    }
  }

  private async getBehaviorReport(timeRange: { start: Date; end: Date }): Promise<BehaviorReport | null> {
    try {
      return await userBehaviorTracker.generateBehaviorReport(timeRange);
    } catch (error) {
      console.error('Error getting behavior report:', error);
      return null;
    }
  }

  private async getABTestingReports(timeRange: { start: Date; end: Date }): Promise<ExperimentReport[] | null> {
    try {
      // Get all experiments
      const experiments = abTestingService.getAllExperiments();
      
      // Generate reports for running and completed experiments
      const reportPromises = experiments
        .filter(exp => exp.status === 'running' || exp.status === 'completed')
        .map(exp => abTestingAnalytics.generateExperimentReport(exp.id));
      
      return await Promise.all(reportPromises);
    } catch (error) {
      console.error('Error getting A/B testing reports:', error);
      return null;
    }
  }

  private generateExecutiveSummary(
    successReport: SuccessMetricsReport | null,
    adoptionMetrics: AdoptionMetrics | null,
    usageReport: UsageReport | null,
    satisfactionReport: SatisfactionReport | null,
    impactReport: ImpactReport | null,
    behaviorReport: BehaviorReport | null,
    abTestingReports: ExperimentReport[] | null
  ): IntegratedAnalyticsReport['executiveSummary'] {
    // Determine overall status
    let overallStatus: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    if (successReport) {
      overallStatus = successReport.status.overall;
    }

    // Extract key metrics
    const keyMetrics: Record<string, number> = {};
    
    if (successReport) {
      keyMetrics.adoptionRate = successReport.metrics.adoption.adoptionRate;
      keyMetrics.satisfactionScore = successReport.metrics.satisfaction.averageRating;
    }
    
    if (adoptionMetrics) {
      keyMetrics.conversionRate = adoptionMetrics.conversionRates.interestToFirstUse;
    }
    
    if (usageReport) {
      keyMetrics.queryEfficiency = usageReport.kpis.queryEfficiency;
      keyMetrics.userEngagement = usageReport.kpis.userEngagement;
    }
    
    if (impactReport) {
      keyMetrics.roi = impactReport.currentMetrics.roi.monthlyROI;
      keyMetrics.contactsDiscovered = impactReport.currentMetrics.directValue.contactsDiscovered;
    }

    // Extract top insights
    const topInsights: string[] = [];
    
    if (successReport) {
      successReport.insights.slice(0, 2).forEach(insight => {
        topInsights.push(insight.title);
      });
    }
    
    if (usageReport) {
      usageReport.insights.slice(0, 1).forEach(insight => {
        topInsights.push(insight.title);
      });
    }

    // Extract primary recommendations
    const primaryRecommendations: string[] = [];
    
    if (impactReport) {
      primaryRecommendations.push(...impactReport.actionPlan.immediate.slice(0, 2));
    }
    
    if (satisfactionReport) {
      primaryRecommendations.push(...satisfactionReport.actionPlan.immediate.slice(0, 1));
    }

    // Calculate business impact
    const businessImpact = {
      roi: impactReport?.currentMetrics.roi.monthlyROI || 0,
      value: impactReport?.currentMetrics.directValue.totalContactValue || 0,
      growth: usageReport?.kpis.queryEfficiency || 0
    };

    return {
      overallStatus,
      keyMetrics,
      topInsights,
      primaryRecommendations,
      businessImpact
    };
  }

  private async generateCrossAnalyticsInsights(
    successReport: SuccessMetricsReport | null,
    adoptionMetrics: AdoptionMetrics | null,
    usageReport: UsageReport | null,
    satisfactionReport: SatisfactionReport | null,
    impactReport: ImpactReport | null,
    behaviorReport: BehaviorReport | null,
    abTestingReports: ExperimentReport[] | null
  ): Promise<CrossAnalyticsInsight[]> {
    const insights: CrossAnalyticsInsight[] = [];

    // Correlate adoption with satisfaction
    if (adoptionMetrics && satisfactionReport) {
      const adoptionRate = adoptionMetrics.conversionRates.interestToFirstUse;
      const satisfactionScore = satisfactionReport.metrics.overall.averageRating;
      
      if (adoptionRate > 50 && satisfactionScore < 3.5) {
        insights.push({
          id: this.generateInsightId(),
          type: 'anomaly',
          category: 'adoption-satisfaction',
          title: 'High Adoption, Low Satisfaction',
          description: `Users are adopting the feature (${adoptionRate.toFixed(1)}% conversion) but reporting low satisfaction (${satisfactionScore.toFixed(1)}/5)`,
          impact: 'high',
          confidence: 0.8,
          data: {
            primaryMetrics: {
              adoptionRate,
              satisfactionScore
            },
            supportingMetrics: {},
            affectedAnalytics: ['adoption', 'satisfaction']
          },
          recommendations: [
            'Investigate satisfaction issues',
            'Improve onboarding experience',
            'Collect targeted user feedback'
          ],
          generatedAt: new Date()
        });
      }
    }

    // Correlate usage with business impact
    if (usageReport && impactReport) {
      const userEngagement = usageReport.kpis.userEngagement;
      const roi = impactReport.currentMetrics.roi.monthlyROI;
      
      if (userEngagement > 0.7 && roi < 20) {
        insights.push({
          id: this.generateInsightId(),
          type: 'opportunity',
          category: 'usage-impact',
          title: 'High Engagement, Low ROI',
          description: `Users are highly engaged (${(userEngagement * 100).toFixed(1)}%) but ROI is low (${roi.toFixed(1)}%)`,
          impact: 'high',
          confidence: 0.7,
          data: {
            primaryMetrics: {
              userEngagement,
              roi
            },
            supportingMetrics: {},
            affectedAnalytics: ['usage', 'businessImpact']
          },
          recommendations: [
            'Optimize monetization strategy',
            'Increase premium feature adoption',
            'Review cost structure'
          ],
          generatedAt: new Date()
        });
      }
    }

    // Analyze A/B test results with other metrics
    if (abTestingReports && abTestingReports.length > 0 && usageReport) {
      abTestingReports.forEach(report => {
        if (report.experiment.statisticalAnalysis.winner) {
          const winner = report.experiment.statisticalAnalysis.winner;
          const queryEfficiency = usageReport.kpis.queryEfficiency;
          
          if (winner.lift > 10 && queryEfficiency > 0.7) {
            insights.push({
              id: this.generateInsightId(),
              type: 'correlation',
              category: 'abtesting-performance',
              title: 'A/B Test Winner Improves Performance',
              description: `${winner.variantName} achieved ${winner.lift.toFixed(1)}% lift and correlates with high query efficiency`,
              impact: 'high',
              confidence: 0.9,
              data: {
                primaryMetrics: {
                  lift: winner.lift,
                  queryEfficiency
                },
                supportingMetrics: {},
                affectedAnalytics: ['abTesting', 'usage']
              },
              recommendations: [
                'Roll out winning variant',
                'Monitor performance after rollout',
                'Document success factors'
              ],
              generatedAt: new Date()
            });
          }
        }
      });
    }

    return insights;
  }

  private generateUnifiedRecommendations(
    topInsights: string[],
    crossAnalyticsInsights: CrossAnalyticsInsight[]
  ): IntegratedAnalyticsReport['unifiedRecommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Add recommendations from cross-analytics insights
    crossAnalyticsInsights.forEach(insight => {
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

    // Add standard recommendations
    immediate.push('Monitor high-impact metrics daily');
    shortTerm.push('Implement user feedback collection mechanisms');
    longTerm.push('Expand analytics capabilities to new features');

    // Remove duplicates
    return {
      immediate: [...new Set(immediate)].slice(0, 5),
      shortTerm: [...new Set(shortTerm)].slice(0, 8),
      longTerm: [...new Set(longTerm)].slice(0, 10)
    };
  }

  private generateActionPlan(recommendations: IntegratedAnalyticsReport['unifiedRecommendations']): IntegratedAnalyticsReport['actionPlan'] {
    const actionPlan: IntegratedAnalyticsReport['actionPlan'] = [];

    // Convert immediate recommendations to high-priority actions
    recommendations.immediate.forEach((recommendation, index) => {
      actionPlan.push({
        priority: 'high',
        action: recommendation,
        owner: this.determineOwner(recommendation),
        timeline: '1-2 weeks',
        expectedImpact: 'High impact on key metrics',
        dependencies: []
      });
    });

    // Convert short-term recommendations to medium-priority actions
    recommendations.shortTerm.forEach((recommendation, index) => {
      actionPlan.push({
        priority: 'medium',
        action: recommendation,
        owner: this.determineOwner(recommendation),
        timeline: '1 month',
        expectedImpact: 'Medium impact on key metrics',
        dependencies: index < 2 ? ['Complete immediate actions'] : []
      });
    });

    // Convert long-term recommendations to low-priority actions
    recommendations.longTerm.forEach((recommendation, index) => {
      actionPlan.push({
        priority: 'low',
        action: recommendation,
        owner: this.determineOwner(recommendation),
        timeline: '3 months',
        expectedImpact: 'Long-term strategic impact',
        dependencies: index < 2 ? ['Complete short-term actions'] : []
      });
    });

    return actionPlan;
  }

  private determineOwner(recommendation: string): string {
    if (recommendation.toLowerCase().includes('user') || recommendation.toLowerCase().includes('satisfaction')) {
      return 'Product Manager';
    } else if (recommendation.toLowerCase().includes('cost') || recommendation.toLowerCase().includes('roi')) {
      return 'Business Analyst';
    } else if (recommendation.toLowerCase().includes('performance') || recommendation.toLowerCase().includes('technical')) {
      return 'Engineering Lead';
    } else {
      return 'Analytics Team';
    }
  }

  private async getSummaryData(timeRange: { start: Date; end: Date }): Promise<any> {
    const summary = {
      overallStatus: 'good',
      keyMetrics: {},
      alerts: []
    };

    try {
      // Get success metrics summary
      const successReport = await this.getSuccessMetricsReport(timeRange);
      if (successReport) {
        summary.overallStatus = successReport.status.overall;
        summary.keyMetrics = {
          adoptionRate: successReport.metrics.adoption.adoptionRate,
          satisfactionScore: successReport.metrics.satisfaction.averageRating,
          roi: successReport.metrics.businessImpact.returnOnInvestment
        };
      }
    } catch (error) {
      console.error('Error getting summary data:', error);
    }

    return summary;
  }

  private async getTrendsData(timeRange: { start: Date; end: Date }): Promise<any> {
    // Generate mock trends data
    const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000));
    const trends = {
      adoption: [],
      satisfaction: [],
      usage: [],
      impact: []
    };

    for (let i = 0; i < days; i++) {
      const date = new Date(timeRange.start);
      date.setDate(date.getDate() + i);
      
      trends.adoption.push({
        date: date.toISOString().split('T')[0],
        value: 40 + Math.random() * 20
      });
      
      trends.satisfaction.push({
        date: date.toISOString().split('T')[0],
        value: 3.5 + Math.random() * 1
      });
      
      trends.usage.push({
        date: date.toISOString().split('T')[0],
        value: 0.6 + Math.random() * 0.3
      });
      
      trends.impact.push({
        date: date.toISOString().split('T')[0],
        value: 100 + Math.random() * 100
      });
    }

    return trends;
  }

  private async getAlertsData(timeRange: { start: Date; end: Date }): Promise<any> {
    // Generate mock alerts data
    return [
      {
        id: 'alert_1',
        type: 'warning',
        title: 'Decreasing User Satisfaction',
        description: 'User satisfaction has decreased by 5% in the last week',
        timestamp: new Date(),
        severity: 'medium'
      },
      {
        id: 'alert_2',
        type: 'info',
        title: 'High Adoption Rate',
        description: 'Feature adoption has increased by 10% in the last week',
        timestamp: new Date(),
        severity: 'low'
      }
    ];
  }

  private async getRecommendationsData(timeRange: { start: Date; end: Date }): Promise<any> {
    // Generate mock recommendations data
    return [
      {
        id: 'rec_1',
        title: 'Improve Search Result Quality',
        description: 'Focus on improving result relevance to increase user satisfaction',
        priority: 'high',
        impact: 'medium'
      },
      {
        id: 'rec_2',
        title: 'Optimize Cost Structure',
        description: 'Review AI service usage to reduce costs while maintaining quality',
        priority: 'medium',
        impact: 'high'
      }
    ];
  }

  private initializeDefaultConfig(): AnalyticsIntegrationConfig {
    return {
      enabledServices: [
        'successMetrics',
        'adoption',
        'usage',
        'satisfaction',
        'businessImpact',
        'behavior',
        'abTesting',
        'reporting'
      ],
      refreshInterval: 60, // 1 hour
      cachingEnabled: true,
      alertThresholds: {
        lowSatisfaction: 3.5,
        lowAdoptionRate: 30,
        highCostPerSearch: 0.10,
        lowROI: 50
      },
      reportSchedules: [],
      integrations: {
        crm: false,
        email: false,
        slack: false,
        dataWarehouse: false
      }
    };
  }

  private async setupDefaultReportSchedules(): Promise<void> {
    // Create default weekly comprehensive report
    try {
      await automatedReportingService.createSchedule({
        name: 'Weekly AI Feature Analytics',
        description: 'Comprehensive weekly analytics report for AI feature',
        frequency: 'weekly',
        recipients: [
          {
            name: 'Product Manager',
            email: 'pm@company.com',
            role: 'manager',
            preferences: {
              includeRawData: false,
              includeRecommendations: true,
              includeVisualizations: true,
              detailLevel: 'standard'
            }
          }
        ],
        reportType: 'comprehensive',
        timeRange: { days: 7 },
        format: 'html',
        createdBy: 'analytics-service'
      });
      
      console.log('✅ [ANALYTICS-INTEGRATION] Default report schedules created');
    } catch (error) {
      console.error('❌ [ANALYTICS-INTEGRATION] Failed to create default report schedules:', error);
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.checkSystemHealth();
        this.cleanupCache();
      } catch (error) {
        console.error('Analytics integration monitoring error:', error);
      }
    }, this.config.refreshInterval * 60 * 1000);

    console.log('✅ [ANALYTICS-INTEGRATION] Analytics integration monitoring started');
  }

  private checkSystemHealth(): void {
    // Check health of all integrated services
    const services = [
      { name: 'Success Metrics', service: aiFeatureSuccessMetrics },
      { name: 'Adoption Tracker', service: featureAdoptionTracker },
      { name: 'Usage Analyzer', service: usagePatternAnalyzer },
      { name: 'Satisfaction Tracker', service: userSatisfactionTracker },
      { name: 'Business Impact Calculator', service: businessImpactCalculator },
      { name: 'Behavior Tracker', service: userBehaviorTracker },
      { name: 'A/B Testing Analytics', service: abTestingAnalytics },
      { name: 'Automated Reporting', service: automatedReportingService }
    ];

    services.forEach(({ name, service }) => {
      try {
        // Simple health check - try to access a method
        if (name === 'Success Metrics') {
          service.getThresholds();
        } else if (name === 'Adoption Tracker') {
          service.getAlerts();
        }
        // Add health checks for other services as needed
      } catch (error) {
        console.error(`❌ [ANALYTICS-INTEGRATION] Health check failed for ${name}:`, error);
      }
    });
  }

  private cleanupCache(): void {
    // Clean up expired cache entries
    const now = new Date();
    for (const [key, cached] of this.cache.entries()) {
      if ((now.getTime() - cached.timestamp.getTime()) > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the analytics integration service
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [ANALYTICS-INTEGRATION] Analytics integration monitoring stopped');
    }
  }
}

// Export singleton instance
export const analyticsIntegrationService = AnalyticsIntegrationService.getInstance();

// Export utility functions
export async function trackAnalyticsEvent(data: AnalyticsTrackingData): Promise<void> {
  return analyticsIntegrationService.trackEvent(data);
}

export async function generateIntegratedAnalyticsReport(timeRange: { start: Date; end: Date }): Promise<IntegratedAnalyticsReport> {
  return analyticsIntegrationService.generateIntegratedReport(timeRange);
}

export async function getAnalyticsDashboardData(timeRange: { start: Date; end: Date }): Promise<{
  summary: any;
  trends: any;
  alerts: any;
  recommendations: any;
}> {
  return analyticsIntegrationService.getDashboardData(timeRange);
}

export function updateAnalyticsConfig(newConfig: Partial<AnalyticsIntegrationConfig>): void {
  analyticsIntegrationService.updateConfig(newConfig);
}

export function getAnalyticsConfig(): AnalyticsIntegrationConfig {
  return analyticsIntegrationService.getConfig();
}

export async function initializeAnalyticsIntegrations(): Promise<void> {
  return analyticsIntegrationService.initializeIntegrations();
}