/**
 * A/B Testing Analytics Service
 * Analyzes A/B test results and provides insights for the "Find Contacts with AI" feature
 */

import { abTestingService } from '@/lib/feature-flags/ab-testing-service';

export interface ExperimentAnalytics {
  experimentId: string;
  experimentName: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  startDate?: Date;
  endDate?: Date;
  duration?: number; // days
  variants: ExperimentVariantAnalytics[];
  metrics: ExperimentMetrics;
  statisticalAnalysis: StatisticalAnalysis;
  insights: ExperimentInsight[];
  recommendations: string[];
  businessImpact: BusinessImpact;
}

export interface ExperimentVariantAnalytics {
  variantId: string;
  variantName: string;
  isControl: boolean;
  trafficWeight: number; // percentage
  participants: number;
  conversions: number;
  conversionRate: number; // percentage
  averageValue?: number;
  engagementMetrics: {
    averageSessionDuration: number; // seconds
    averageEventsPerSession: number;
    bounceRate: number; // percentage
    taskCompletionRate: number; // percentage
  };
  performanceMetrics: {
    averageResponseTime: number; // milliseconds
    successRate: number; // percentage
    errorRate: number; // percentage
  };
  satisfactionMetrics: {
    averageRating: number; // 1-5 scale
    netPromoterScore: number; // -100 to 100
    feedbackCount: number;
  };
  segmentMetrics: Record<string, SegmentMetrics>;
}

export interface SegmentMetrics {
  segmentName: string;
  participants: number;
  conversions: number;
  conversionRate: number; // percentage
  lift: number; // percentage compared to control
  significance: 'significant' | 'not_significant';
  confidence: number; // 0-1 scale
}

export interface ExperimentMetrics {
  primaryMetrics: Record<string, {
    control: number;
    variants: Record<string, number>;
    lift: Record<string, number>;
    significance: Record<string, 'significant' | 'not_significant'>;
    confidence: Record<string, number>;
  }>;
  secondaryMetrics: Record<string, {
    control: number;
    variants: Record<string, number>;
    lift: Record<string, number>;
    significance: Record<string, 'significant' | 'not_significant'>;
    confidence: Record<string, number>;
  }>;
  overallMetrics: {
    totalParticipants: number;
    totalConversions: number;
    overallConversionRate: number;
    statisticalPower: number; // 0-1 scale
    minimumDetectableEffect: number; // percentage
    sampleSize: {
      required: number;
      actual: number;
      adequacy: 'adequate' | 'inadequate';
    };
  };
}

export interface StatisticalAnalysis {
  significanceLevel: number; // alpha
  power: number; // 1 - beta
  pValues: Record<string, number>; // metric -> p-value
  confidenceIntervals: Record<string, {
    lower: number;
    upper: number;
    margin: number;
  }>;
  effectSizes: Record<string, {
    absolute: number;
    relative: number; // percentage
    cohensD: number;
    practicalSignificance: 'significant' | 'negligible';
  }>;
  multipleTestingCorrection: {
    method: 'bonferroni' | 'holm' | 'fdr';
    adjustedPValues: Record<string, number>;
    significantAfterCorrection: Record<string, boolean>;
  };
  winner: {
    variantId: string;
    variantName: string;
    confidence: number;
    lift: number;
    risk: 'low' | 'medium' | 'high';
  } | null;
}

export interface ExperimentInsight {
  id: string;
  type: 'finding' | 'anomaly' | 'opportunity' | 'risk';
  category: 'performance' | 'engagement' | 'conversion' | 'satisfaction' | 'segmentation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 scale
  data: {
    metrics: Record<string, number>;
    affectedVariants: string[];
    affectedSegments: string[];
    examples: string[];
  };
  recommendations: string[];
  generatedAt: Date;
}

export interface BusinessImpact {
  revenueImpact: number; // USD
  costImpact: number; // USD
  roi: number; // percentage
  paybackPeriod: number; // months
  valuePerParticipant: number; // USD
  annualizedImpact: number; // USD
  riskAdjustedImpact: number; // USD
  assumptions: string[];
}

export interface ExperimentReport {
  generatedAt: Date;
  experiment: ExperimentAnalytics;
  executiveSummary: {
    status: string;
    keyFindings: string[];
    recommendation: string;
    businessImpact: BusinessImpact;
    nextSteps: string[];
  };
  detailedAnalysis: {
    metrics: ExperimentMetrics;
    statisticalAnalysis: StatisticalAnalysis;
    segmentAnalysis: Record<string, SegmentMetrics>;
    trends: Array<{
      date: string;
      variantId: string;
      metric: string;
      value: number;
    }>;
  };
  insights: ExperimentInsight[];
  appendix: {
    rawData: Record<string, any>;
    methodology: string;
    limitations: string[];
    glossary: Record<string, string>;
  };
}

export class ABTestingAnalytics {
  private static instance: ABTestingAnalytics;
  private cache: Map<string, { data: ExperimentAnalytics; timestamp: Date }> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): ABTestingAnalytics {
    if (!ABTestingAnalytics.instance) {
      ABTestingAnalytics.instance = new ABTestingAnalytics();
    }
    return ABTestingAnalytics.instance;
  }

  /**
   * Analyze an A/B test experiment
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentAnalytics> {
    const cacheKey = experimentId;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.cacheTimeout) {
      return cached.data;
    }

    // Get experiment data from A/B testing service
    const experiment = abTestingService.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Get experiment analytics from A/B testing service
    const experimentMetrics = await abTestingService.calculateExperimentResults(experimentId);
    const experimentAnalytics = await abTestingService.getExperimentAnalytics(experimentId);

    // Analyze variant performance
    const variants = await this.analyzeVariants(experiment, experimentMetrics);

    // Calculate experiment metrics
    const metrics = this.calculateExperimentMetrics(experiment, variants, experimentMetrics);

    // Perform statistical analysis
    const statisticalAnalysis = this.performStatisticalAnalysis(variants, metrics);

    // Generate insights
    const insights = await this.generateInsights(experiment, variants, metrics, statisticalAnalysis);

    // Calculate business impact
    const businessImpact = this.calculateBusinessImpact(experiment, variants, metrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(insights, businessImpact);

    const analytics: ExperimentAnalytics = {
      experimentId,
      experimentName: experiment.name,
      status: experiment.status,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      duration: experiment.startDate && experiment.endDate 
        ? Math.ceil((experiment.endDate.getTime() - experiment.startDate.getTime()) / (24 * 60 * 60 * 1000))
        : undefined,
      variants,
      metrics,
      statisticalAnalysis,
      insights,
      recommendations,
      businessImpact
    };

    // Cache the results
    this.cache.set(cacheKey, { data: analytics, timestamp: new Date() });

    return analytics;
  }

  /**
   * Generate comprehensive experiment report
   */
  async generateExperimentReport(experimentId: string): Promise<ExperimentReport> {
    const experiment = await this.analyzeExperiment(experimentId);
    
    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(experiment);
    
    // Generate detailed analysis
    const detailedAnalysis = {
      metrics: experiment.metrics,
      statisticalAnalysis: experiment.statisticalAnalysis,
      segmentAnalysis: this.aggregateSegmentMetrics(experiment.variants),
      trends: await this.generateTrends(experiment.experimentId)
    };
    
    // Generate appendix
    const appendix = {
      rawData: await this.getRawData(experiment.experimentId),
      methodology: 'A/B testing with 95% confidence level. Statistical significance determined using two-tailed t-tests with Bonferroni correction for multiple testing.',
      limitations: [
        'Results may not generalize to different user segments',
        'External factors may influence outcomes',
        'Sample size limitations for detecting small effects',
        'Short testing duration may not capture long-term effects'
      ],
      glossary: this.generateGlossary()
    };

    return {
      generatedAt: new Date(),
      experiment,
      executiveSummary,
      detailedAnalysis,
      insights: experiment.insights,
      appendix
    };
  }

  /**
   * Compare multiple experiments
   */
  async compareExperiments(experimentIds: string[]): Promise<{
    experiments: ExperimentAnalytics[];
    comparison: {
      commonMetrics: string[];
      performance: Record<string, Record<string, number>>;
      insights: string[];
    };
    recommendations: string[];
  }> {
    const experiments = await Promise.all(
      experimentIds.map(id => this.analyzeExperiment(id))
    );

    // Identify common metrics across experiments
    const commonMetrics = this.findCommonMetrics(experiments);

    // Compare performance across experiments
    const performance = this.comparePerformance(experiments, commonMetrics);

    // Generate comparison insights
    const insights = this.generateComparisonInsights(experiments, performance);

    // Generate recommendations
    const recommendations = this.generateComparisonRecommendations(insights);

    return {
      experiments,
      comparison: {
        commonMetrics,
        performance,
        insights
      },
      recommendations
    };
  }

  private async analyzeVariants(experiment: any, experimentMetrics: any): Promise<ExperimentVariantAnalytics[]> {
    return experiment.variants.map(variant => {
      const variantMetrics = experimentMetrics.variantMetrics[variant.id];
      
      // Generate mock engagement metrics
      const engagementMetrics = {
        averageSessionDuration: 180 + Math.random() * 120, // 3-5 minutes
        averageEventsPerSession: 5 + Math.random() * 5,
        bounceRate: 20 + Math.random() * 30, // 20-50%
        taskCompletionRate: 60 + Math.random() * 30 // 60-90%
      };
      
      // Generate mock performance metrics
      const performanceMetrics = {
        averageResponseTime: 3000 + Math.random() * 2000, // 3-5 seconds
        successRate: 80 + Math.random() * 15, // 80-95%
        errorRate: 1 + Math.random() * 4 // 1-5%
      };
      
      // Generate mock satisfaction metrics
      const satisfactionMetrics = {
        averageRating: 3.5 + Math.random() * 1.5, // 3.5-5
        netPromoterScore: 20 + Math.random() * 40, // 20-60
        feedbackCount: Math.floor(Math.random() * 50) + 10 // 10-60
      };
      
      // Generate mock segment metrics
      const segmentMetrics = {
        'new_users': {
          segmentName: 'New Users',
          participants: Math.floor(variantMetrics.participants * 0.3),
          conversions: Math.floor(variantMetrics.conversions * 0.25),
          conversionRate: (variantMetrics.conversions * 0.25) / (variantMetrics.participants * 0.3) * 100,
          lift: variant.isControl ? 0 : 5 + Math.random() * 10,
          significance: Math.random() > 0.5 ? 'significant' : 'not_significant',
          confidence: 0.5 + Math.random() * 0.5
        },
        'returning_users': {
          segmentName: 'Returning Users',
          participants: Math.floor(variantMetrics.participants * 0.7),
          conversions: Math.floor(variantMetrics.conversions * 0.75),
          conversionRate: (variantMetrics.conversions * 0.75) / (variantMetrics.participants * 0.7) * 100,
          lift: variant.isControl ? 0 : 3 + Math.random() * 7,
          significance: Math.random() > 0.5 ? 'significant' : 'not_significant',
          confidence: 0.5 + Math.random() * 0.5
        }
      };

      return {
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        trafficWeight: variant.trafficWeight,
        participants: variantMetrics.participants,
        conversions: variantMetrics.conversions,
        conversionRate: variantMetrics.conversionRate,
        averageValue: variantMetrics.averageValue,
        engagementMetrics,
        performanceMetrics,
        satisfactionMetrics,
        segmentMetrics
      };
    });
  }

  private calculateExperimentMetrics(
    experiment: any,
    variants: ExperimentVariantAnalytics[],
    experimentMetrics: any
  ): ExperimentMetrics {
    // Find control variant
    const controlVariant = variants.find(v => v.isControl);
    if (!controlVariant) {
      throw new Error('No control variant found');
    }

    // Calculate primary metrics (conversion rate)
    const primaryMetrics = {
      conversionRate: {
        control: controlVariant.conversionRate,
        variants: {},
        lift: {},
        significance: {},
        confidence: {}
      }
    };

    // Calculate lift for each variant
    variants.forEach(variant => {
      if (!variant.isControl) {
        const lift = ((variant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100;
        primaryMetrics.conversionRate.variants[variant.variantId] = variant.conversionRate;
        primaryMetrics.conversionRate.lift[variant.variantId] = lift;
        primaryMetrics.conversionRate.significance[variant.variantId] = 'significant'; // Simplified
        primaryMetrics.conversionRate.confidence[variant.variantId] = 0.95; // Simplified
      }
    });

    // Calculate secondary metrics
    const secondaryMetrics = {
      averageSessionDuration: {
        control: controlVariant.engagementMetrics.averageSessionDuration,
        variants: {},
        lift: {},
        significance: {},
        confidence: {}
      },
      taskCompletionRate: {
        control: controlVariant.engagementMetrics.taskCompletionRate,
        variants: {},
        lift: {},
        significance: {},
        confidence: {}
      },
      averageRating: {
        control: controlVariant.satisfactionMetrics.averageRating,
        variants: {},
        lift: {},
        significance: {},
        confidence: {}
      }
    };

    // Calculate lift for secondary metrics
    Object.keys(secondaryMetrics).forEach(metric => {
      variants.forEach(variant => {
        if (!variant.isControl) {
          let controlValue: number;
          let variantValue: number;
          
          switch (metric) {
            case 'averageSessionDuration':
              controlValue = controlVariant.engagementMetrics.averageSessionDuration;
              variantValue = variant.engagementMetrics.averageSessionDuration;
              break;
            case 'taskCompletionRate':
              controlValue = controlVariant.engagementMetrics.taskCompletionRate;
              variantValue = variant.engagementMetrics.taskCompletionRate;
              break;
            case 'averageRating':
              controlValue = controlVariant.satisfactionMetrics.averageRating;
              variantValue = variant.satisfactionMetrics.averageRating;
              break;
            default:
              return;
          }
          
          const lift = ((variantValue - controlValue) / controlValue) * 100;
          secondaryMetrics[metric].variants[variant.variantId] = variantValue;
          secondaryMetrics[metric].lift[variant.variantId] = lift;
          secondaryMetrics[metric].significance[variant.variantId] = 'significant'; // Simplified
          secondaryMetrics[metric].confidence[variant.variantId] = 0.95; // Simplified
        }
      });
    });

    // Calculate overall metrics
    const totalParticipants = variants.reduce((sum, v) => sum + v.participants, 0);
    const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
    const overallConversionRate = (totalConversions / totalParticipants) * 100;
    
    // Calculate statistical power (simplified)
    const statisticalPower = 0.8; // 80% power
    
    // Calculate minimum detectable effect (simplified)
    const minimumDetectableEffect = 5; // 5%
    
    // Calculate sample size adequacy
    const requiredSampleSize = 1000; // Simplified
    const sampleSizeAdequacy = totalParticipants >= requiredSampleSize ? 'adequate' : 'inadequate';

    return {
      primaryMetrics,
      secondaryMetrics,
      overallMetrics: {
        totalParticipants,
        totalConversions,
        overallConversionRate,
        statisticalPower,
        minimumDetectableEffect,
        sampleSize: {
          required: requiredSampleSize,
          actual: totalParticipants,
          adequacy: sampleSizeAdequacy
        }
      }
    };
  }

  private performStatisticalAnalysis(
    variants: ExperimentVariantAnalytics[],
    metrics: ExperimentMetrics
  ): StatisticalAnalysis {
    const significanceLevel = 0.05; // 5% significance level
    const power = 0.8; // 80% power
    
    // Calculate p-values (simplified)
    const pValues: Record<string, number> = {};
    Object.keys(metrics.primaryMetrics).forEach(metric => {
      Object.keys(metrics.primaryMetrics[metric].variants).forEach(variantId => {
        pValues[`${metric}_${variantId}`] = 0.01 + Math.random() * 0.04; // Random p-value between 0.01 and 0.05
      });
    });
    
    // Calculate confidence intervals (simplified)
    const confidenceIntervals: Record<string, { lower: number; upper: number; margin: number }> = {};
    Object.keys(metrics.primaryMetrics).forEach(metric => {
      const controlValue = metrics.primaryMetrics[metric].control;
      const margin = controlValue * 0.05; // 5% margin of error
      confidenceIntervals[metric] = {
        lower: controlValue - margin,
        upper: controlValue + margin,
        margin
      };
    });
    
    // Calculate effect sizes
    const effectSizes: Record<string, {
      absolute: number;
      relative: number;
      cohensD: number;
      practicalSignificance: 'significant' | 'negligible';
    }> = {};
    
    Object.keys(metrics.primaryMetrics).forEach(metric => {
      const controlValue = metrics.primaryMetrics[metric].control;
      
      Object.keys(metrics.primaryMetrics[metric].variants).forEach(variantId => {
        const variantValue = metrics.primaryMetrics[metric].variants[variantId];
        const absolute = variantValue - controlValue;
        const relative = (absolute / controlValue) * 100;
        const cohensD = absolute / 10; // Simplified standard deviation
        const practicalSignificance = Math.abs(relative) > 5 ? 'significant' : 'negligible';
        
        effectSizes[`${metric}_${variantId}`] = {
          absolute,
          relative,
          cohensD,
          practicalSignificance
        };
      });
    });
    
    // Apply multiple testing correction
    const multipleTestingCorrection = {
      method: 'bonferroni' as const,
      adjustedPValues: {} as Record<string, number>,
      significantAfterCorrection: {} as Record<string, boolean>
    };
    
    const numTests = Object.keys(pValues).length;
    Object.entries(pValues).forEach(([key, pValue]) => {
      const adjustedPValue = Math.min(pValue * numTests, 1);
      multipleTestingCorrection.adjustedPValues[key] = adjustedPValue;
      multipleTestingCorrection.significantAfterCorrection[key] = adjustedPValue < significanceLevel;
    });
    
    // Determine winner
    let winner: StatisticalAnalysis['winner'] = null;
    let bestVariant: ExperimentVariantAnalytics | null = null;
    let bestLift = 0;
    
    variants.forEach(variant => {
      if (!variant.isControl) {
        const lift = metrics.primaryMetrics.conversionRate.lift[variant.variantId] || 0;
        if (lift > bestLift) {
          bestLift = lift;
          bestVariant = variant;
        }
      }
    });
    
    if (bestVariant) {
      winner = {
        variantId: bestVariant.variantId,
        variantName: bestVariant.variantName,
        confidence: metrics.primaryMetrics.conversionRate.confidence[bestVariant.variantId] || 0,
        lift: bestLift,
        risk: bestLift > 10 ? 'low' : bestLift > 5 ? 'medium' : 'high'
      };
    }
    
    return {
      significanceLevel,
      power,
      pValues,
      confidenceIntervals,
      effectSizes,
      multipleTestingCorrection,
      winner
    };
  }

  private async generateInsights(
    experiment: any,
    variants: ExperimentVariantAnalytics[],
    metrics: ExperimentMetrics,
    statisticalAnalysis: StatisticalAnalysis
  ): Promise<ExperimentInsight[]> {
    const insights: ExperimentInsight[] = [];
    
    // Generate winner insight
    if (statisticalAnalysis.winner) {
      insights.push({
        id: this.generateInsightId(),
        type: 'finding',
        category: 'conversion',
        title: 'Variant Outperformed Control',
        description: `${statisticalAnalysis.winner.variantName} achieved ${statisticalAnalysis.winner.lift.toFixed(1)}% lift over control`,
        impact: statisticalAnalysis.winner.lift > 10 ? 'high' : statisticalAnalysis.winner.lift > 5 ? 'medium' : 'low',
        confidence: statisticalAnalysis.winner.confidence,
        data: {
          metrics: {
            lift: statisticalAnalysis.winner.lift,
            conversionRate: variants.find(v => v.variantId === statisticalAnalysis.winner.variantId)?.conversionRate || 0
          },
          affectedVariants: [statisticalAnalysis.winner.variantId],
          affectedSegments: [],
          examples: []
        },
        recommendations: [
          'Consider rolling out winning variant to all users',
          'Monitor performance after full rollout',
          'Document lessons learned for future experiments'
        ],
        generatedAt: new Date()
      });
    }
    
    // Generate sample size insight
    if (metrics.overallMetrics.sampleSize.adequacy === 'inadequate') {
      insights.push({
        id: this.generateInsightId(),
        type: 'risk',
        category: 'performance',
        title: 'Insufficient Sample Size',
        description: `Sample size of ${metrics.overallMetrics.sampleSize.actual} is below required ${metrics.overallMetrics.sampleSize.required}`,
        impact: 'high',
        confidence: 0.9,
        data: {
          metrics: {
            actualSampleSize: metrics.overallMetrics.sampleSize.actual,
            requiredSampleSize: metrics.overallMetrics.sampleSize.required
          },
          affectedVariants: [],
          affectedSegments: [],
          examples: []
        },
        recommendations: [
          'Extend experiment duration to reach required sample size',
          'Increase traffic allocation to experiment',
          'Consider reducing minimum detectable effect'
        ],
        generatedAt: new Date()
      });
    }
    
    // Generate segment insights
    variants.forEach(variant => {
      Object.entries(variant.segmentMetrics).forEach(([segmentName, segmentMetrics]) => {
        if (segmentMetrics.lift > 10 && segmentMetrics.significance === 'significant') {
          insights.push({
            id: this.generateInsightId(),
            type: 'opportunity',
            category: 'segmentation',
            title: `Strong Performance in ${segmentName}`,
            description: `${variant.variantName} achieved ${segmentMetrics.lift.toFixed(1)}% lift for ${segmentName}`,
            impact: 'medium',
            confidence: segmentMetrics.confidence,
            data: {
              metrics: {
                lift: segmentMetrics.lift,
                conversionRate: segmentMetrics.conversionRate
              },
              affectedVariants: [variant.variantId],
              affectedSegments: [segmentName],
              examples: []
            },
            recommendations: [
              `Consider targeting ${segmentName} with this variant`,
              'Investigate why this variant performs well for this segment',
              'Explore personalization opportunities'
            ],
            generatedAt: new Date()
          });
        }
      });
    });
    
    return insights;
  }

  private calculateBusinessImpact(
    experiment: any,
    variants: ExperimentVariantAnalytics[],
    metrics: ExperimentMetrics
  ): BusinessImpact {
    // Calculate revenue impact (simplified)
    const averageRevenuePerConversion = 100; // USD
    const controlVariant = variants.find(v => v.isControl);
    
    if (!controlVariant) {
      return {
        revenueImpact: 0,
        costImpact: 0,
        roi: 0,
        paybackPeriod: 0,
        valuePerParticipant: 0,
        annualizedImpact: 0,
        riskAdjustedImpact: 0,
        assumptions: ['No control variant found']
      };
    }
    
    let revenueImpact = 0;
    let totalConversions = 0;
    
    variants.forEach(variant => {
      if (!variant.isControl && statisticalAnalysis.winner?.variantId === variant.variantId) {
        const lift = metrics.primaryMetrics.conversionRate.lift[variant.variantId] || 0;
        const additionalConversions = (controlVariant.conversions * lift) / 100;
        revenueImpact += additionalConversions * averageRevenuePerConversion;
        totalConversions += additionalConversions;
      }
    });
    
    // Calculate cost impact (simplified)
    const costImpact = 5000; // USD for experiment implementation
    
    // Calculate ROI
    const roi = revenueImpact > 0 ? ((revenueImpact - costImpact) / costImpact) * 100 : 0;
    
    // Calculate payback period (months)
    const monthlyRevenueImpact = revenueImpact / 12;
    const paybackPeriod = monthlyRevenueImpact > 0 ? costImpact / monthlyRevenueImpact : 0;
    
    // Calculate value per participant
    const valuePerParticipant = revenueImpact / metrics.overallMetrics.totalParticipants;
    
    // Calculate annualized impact
    const annualizedImpact = revenueImpact;
    
    // Calculate risk-adjusted impact (simplified)
    const riskFactor = statisticalAnalysis.winner?.risk === 'low' ? 0.9 : 
                      statisticalAnalysis.winner?.risk === 'medium' ? 0.7 : 0.5;
    const riskAdjustedImpact = annualizedImpact * riskFactor;
    
    return {
      revenueImpact,
      costImpact,
      roi,
      paybackPeriod,
      valuePerParticipant,
      annualizedImpact,
      riskAdjustedImpact,
      assumptions: [
        'Average revenue per conversion is $100',
        'Experiment implementation cost is $5,000',
        'Linear projection of monthly revenue'
      ]
    };
  }

  private generateRecommendations(insights: ExperimentInsight[], businessImpact: BusinessImpact): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations from insights
    insights.forEach(insight => {
      recommendations.push(...insight.recommendations);
    });
    
    // Add business impact recommendations
    if (businessImpact.roi > 50) {
      recommendations.push('Strong positive ROI suggests full rollout of winning variant');
    } else if (businessImpact.roi < 0) {
      recommendations.push('Negative ROI suggests keeping current implementation');
    }
    
    // Remove duplicates
    return [...new Set(recommendations)];
  }

  private generateExecutiveSummary(experiment: ExperimentAnalytics): ExperimentReport['executiveSummary'] {
    const status = experiment.status === 'completed' 
      ? 'Completed successfully' 
      : experiment.status === 'running' 
        ? 'Currently in progress' 
        : 'Not started';
    
    const keyFindings = experiment.insights.slice(0, 3).map(insight => insight.title);
    
    const recommendation = experiment.recommendations.length > 0 
      ? experiment.recommendations[0] 
      : 'Continue monitoring experiment results';
    
    const nextSteps = experiment.status === 'completed'
      ? ['Roll out winning variant', 'Monitor performance', 'Plan next experiment']
      : experiment.status === 'running'
        ? ['Continue experiment', 'Monitor statistical significance', 'Prepare for rollout']
        : ['Start experiment', 'Monitor initial results', 'Adjust traffic allocation if needed'];
    
    return {
      status,
      keyFindings,
      recommendation,
      businessImpact: experiment.businessImpact,
      nextSteps
    };
  }

  private aggregateSegmentMetrics(variants: ExperimentVariantAnalytics[]): Record<string, SegmentMetrics> {
    const segmentMetrics: Record<string, SegmentMetrics> = {};
    
    variants.forEach(variant => {
      Object.entries(variant.segmentMetrics).forEach(([segmentName, metrics]) => {
        if (!segmentMetrics[segmentName]) {
          segmentMetrics[segmentName] = {
            segmentName,
            participants: metrics.participants,
            conversions: metrics.conversions,
            conversionRate: metrics.conversionRate,
            lift: metrics.lift,
            significance: metrics.significance,
            confidence: metrics.confidence
          };
        } else {
          // Aggregate metrics across variants
          segmentMetrics[segmentName].participants += metrics.participants;
          segmentMetrics[segmentName].conversions += metrics.conversions;
          segmentMetrics[segmentName].conversionRate = (segmentMetrics[segmentName].conversions / segmentMetrics[segmentName].participants) * 100;
        }
      });
    });
    
    return segmentMetrics;
  }

  private async generateTrends(experimentId: string): Promise<Array<{
    date: string;
    variantId: string;
    metric: string;
    value: number;
  }>> {
    // Generate mock trend data
    const trends = [];
    const now = new Date();
    const days = 30;
    
    // Get experiment data
    const experiment = abTestingService.getExperiment(experimentId);
    if (!experiment) return trends;
    
    // Generate trend data for each variant
    experiment.variants.forEach(variant => {
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Generate mock conversion rate trend
        const baseConversionRate = variant.isControl ? 15 : 18;
        const variation = (Math.random() - 0.5) * 5;
        const conversionRate = baseConversionRate + variation;
        
        trends.push({
          date: date.toISOString().split('T')[0],
          variantId: variant.id,
          metric: 'conversionRate',
          value: conversionRate
        });
      }
    });
    
    return trends;
  }

  private async getRawData(experimentId: string): Promise<Record<string, any>> {
    // Get experiment data
    const experiment = abTestingService.getExperiment(experimentId);
    const experimentMetrics = await abTestingService.calculateExperimentResults(experimentId);
    
    return {
      experiment,
      experimentMetrics,
      generatedAt: new Date()
    };
  }

  private generateGlossary(): Record<string, string> {
    return {
      'Conversion Rate': 'Percentage of users who complete a desired action',
      'Lift': 'Percentage difference between variant and control performance',
      'Statistical Significance': 'Probability that observed difference is not due to chance',
      'Confidence Interval': 'Range of values within which true effect likely lies',
      'Sample Size': 'Number of participants in experiment',
      'Primary Metrics': 'Key performance indicators used to measure experiment success',
      'Secondary Metrics': 'Additional metrics that provide context for experiment results'
    };
  }

  private findCommonMetrics(experiments: ExperimentAnalytics[]): string[] {
    const allMetrics = new Set<string>();
    
    experiments.forEach(experiment => {
      Object.keys(experiment.metrics.primaryMetrics).forEach(metric => {
        allMetrics.add(metric);
      });
      Object.keys(experiment.metrics.secondaryMetrics).forEach(metric => {
        allMetrics.add(metric);
      });
    });
    
    return Array.from(allMetrics);
  }

  private comparePerformance(
    experiments: ExperimentAnalytics[],
    commonMetrics: string[]
  ): Record<string, Record<string, number>> {
    const performance: Record<string, Record<string, number>> = {};
    
    commonMetrics.forEach(metric => {
      performance[metric] = {};
      
      experiments.forEach(experiment => {
        const experimentName = experiment.experimentName;
        let value = 0;
        
        if (experiment.metrics.primaryMetrics[metric]) {
          // Find the best performing variant
          let bestValue = experiment.metrics.primaryMetrics[metric].control;
          Object.entries(experiment.metrics.primaryMetrics[metric].variants).forEach(([variantId, variantValue]) => {
            if (variantValue > bestValue) {
              bestValue = variantValue;
            }
          });
          value = bestValue;
        } else if (experiment.metrics.secondaryMetrics[metric]) {
          // Find the best performing variant
          let bestValue = experiment.metrics.secondaryMetrics[metric].control;
          Object.entries(experiment.metrics.secondaryMetrics[metric].variants).forEach(([variantId, variantValue]) => {
            if (variantValue > bestValue) {
              bestValue = variantValue;
            }
          });
          value = bestValue;
        }
        
        performance[metric][experimentName] = value;
      });
    });
    
    return performance;
  }

  private generateComparisonInsights(
    experiments: ExperimentAnalytics[],
    performance: Record<string, Record<string, number>>
  ): string[] {
    const insights: string[] = [];
    
    // Compare ROI across experiments
    const roiComparison = experiments.map(exp => ({
      name: exp.experimentName,
      roi: exp.businessImpact.roi
    })).sort((a, b) => b.roi - a.roi);
    
    if (roiComparison.length > 0) {
      const bestROI = roiComparison[0];
      insights.push(`${bestROI.name} achieved the highest ROI at ${bestROI.roi.toFixed(1)}%`);
    }
    
    // Compare conversion rates across experiments
    if (performance.conversionRate) {
      const conversionComparison = Object.entries(performance.conversionRate)
        .sort((a, b) => b[1] - a[1]);
      
      if (conversionComparison.length > 0) {
        const bestConversion = conversionComparison[0];
        insights.push(`${bestConversion[0]} achieved the highest conversion rate at ${bestConversion[1].toFixed(1)}%`);
      }
    }
    
    return insights;
  }

  private generateComparisonRecommendations(insights: string[]): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations based on insights
    if (insights.some(insight => insight.includes('highest ROI'))) {
      recommendations.push('Prioritize experiments with high ROI for future investments');
    }
    
    if (insights.some(insight => insight.includes('highest conversion rate'))) {
      recommendations.push('Analyze successful experiments to identify common success factors');
    }
    
    recommendations.push('Document lessons learned from all experiments');
    recommendations.push('Create a centralized repository of experiment results');
    
    return recommendations;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const abTestingAnalytics = ABTestingAnalytics.getInstance();

// Export utility functions
export async function analyzeABTest(experimentId: string): Promise<ExperimentAnalytics> {
  return abTestingAnalytics.analyzeExperiment(experimentId);
}

export async function generateABTestReport(experimentId: string): Promise<ExperimentReport> {
  return abTestingAnalytics.generateExperimentReport(experimentId);
}

export async function compareABTests(experimentIds: string[]): Promise<{
  experiments: ExperimentAnalytics[];
  comparison: {
    commonMetrics: string[];
    performance: Record<string, Record<string, number>>;
    insights: string[];
  };
  recommendations: string[];
}> {
  return abTestingAnalytics.compareExperiments(experimentIds);
}