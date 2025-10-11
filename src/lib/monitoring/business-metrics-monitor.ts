/**
 * Business Metrics Monitoring System
 * Monitors business KPIs, ROI, cost savings, and other business metrics
 */

export interface BusinessMetrics {
  timestamp: Date;
  acquisition: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    userRetentionRate: number;
    userChurnRate: number;
    conversionRate: number;
    costPerAcquisition: number;
    lifetimeValue: number;
  };
  engagement: {
    averageSessionDuration: number;
    pageViewsPerSession: number;
    interactionsPerSession: number;
    featureAdoptionRate: Record<string, number>;
    userSatisfactionScore: number;
    netPromoterScore: number;
  };
  productivity: {
    timeSaved: number; // hours
    costSavings: number; // USD
    productivityGain: number; // percentage
    efficiencyImprovement: number; // percentage
    tasksCompleted: number;
    averageTaskTime: number; // minutes
  };
  financial: {
    revenue: number;
    costs: {
      total: number;
      aiServices: number;
      infrastructure: number;
      support: number;
      development: number;
    };
    profit: number;
    profitMargin: number;
    roi: number; // return on investment
    paybackPeriod: number; // months
  };
  searchPerformance: {
    totalSearches: number;
    successRate: number;
    averageResults: number;
    averageResponseTime: number;
    costPerSearch: number;
    contactsFound: number;
    contactConversionRate: number;
  };
  competitive: {
    marketShare: number;
    userPreferenceScore: number;
    featureComparison: Record<string, number>;
    satisfactionBenchmark: number;
    priceComparison: number;
  };
}

export interface BusinessAlert {
  id: string;
  type: 'acquisition' | 'engagement' | 'productivity' | 'financial' | 'search' | 'competitive';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface BusinessThresholds {
  acquisition: {
    minUserRetentionRate: number; // percentage
    maxUserChurnRate: number; // percentage
    minConversionRate: number; // percentage
    maxCostPerAcquisition: number; // USD
  };
  engagement: {
    minAverageSessionDuration: number; // seconds
    minFeatureAdoptionRate: number; // percentage
    minUserSatisfactionScore: number; // 1-5 scale
    minNetPromoterScore: number; // -100 to 100
  };
  productivity: {
    minTimeSavings: number; // hours per day
    minCostSavings: number; // USD per day
    minProductivityGain: number; // percentage
    maxAverageTaskTime: number; // minutes
  };
  financial: {
    minProfitMargin: number; // percentage
    minROI: number; // percentage
    maxPaybackPeriod: number; // months
  };
  search: {
    minSuccessRate: number; // percentage
    maxCostPerSearch: number; // USD
    minContactConversionRate: number; // percentage
  };
  competitive: {
    minMarketShare: number; // percentage
    minUserPreferenceScore: number; // 1-5 scale
    minSatisfactionBenchmark: number; // 1-5 scale
  };
}

/**
 * Business Metrics Monitor Class
 */
export class BusinessMetricsMonitor {
  private static instance: BusinessMetricsMonitor;
  private metrics: BusinessMetrics;
  private thresholds: BusinessThresholds;
  private alerts: BusinessAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: BusinessMetrics[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.startMonitoring();
  }

  static getInstance(): BusinessMetricsMonitor {
    if (!BusinessMetricsMonitor.instance) {
      BusinessMetricsMonitor.instance = new BusinessMetricsMonitor();
    }
    return BusinessMetricsMonitor.instance;
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): BusinessMetrics {
    return {
      timestamp: new Date(),
      acquisition: {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        returningUsers: 0,
        userRetentionRate: 0,
        userChurnRate: 0,
        conversionRate: 0,
        costPerAcquisition: 0,
        lifetimeValue: 0
      },
      engagement: {
        averageSessionDuration: 0,
        pageViewsPerSession: 0,
        interactionsPerSession: 0,
        featureAdoptionRate: {},
        userSatisfactionScore: 0,
        netPromoterScore: 0
      },
      productivity: {
        timeSaved: 0,
        costSavings: 0,
        productivityGain: 0,
        efficiencyImprovement: 0,
        tasksCompleted: 0,
        averageTaskTime: 0
      },
      financial: {
        revenue: 0,
        costs: {
          total: 0,
          aiServices: 0,
          infrastructure: 0,
          support: 0,
          development: 0
        },
        profit: 0,
        profitMargin: 0,
        roi: 0,
        paybackPeriod: 0
      },
      searchPerformance: {
        totalSearches: 0,
        successRate: 100,
        averageResults: 0,
        averageResponseTime: 0,
        costPerSearch: 0,
        contactsFound: 0,
        contactConversionRate: 0
      },
      competitive: {
        marketShare: 0,
        userPreferenceScore: 0,
        featureComparison: {},
        satisfactionBenchmark: 0,
        priceComparison: 0
      }
    };
  }

  /**
   * Initialize default thresholds
   */
  private initializeThresholds(): BusinessThresholds {
    return {
      acquisition: {
        minUserRetentionRate: 80, // 80%
        maxUserChurnRate: 10, // 10%
        minConversionRate: 15, // 15%
        maxCostPerAcquisition: 50 // $50
      },
      engagement: {
        minAverageSessionDuration: 120, // 2 minutes
        minFeatureAdoptionRate: 20, // 20%
        minUserSatisfactionScore: 3.5, // 3.5/5
        minNetPromoterScore: 20 // 20
      },
      productivity: {
        minTimeSavings: 30, // 30 minutes per day
        minCostSavings: 100, // $100 per day
        minProductivityGain: 15, // 15%
        maxAverageTaskTime: 10 // 10 minutes
      },
      financial: {
        minProfitMargin: 20, // 20%
        minROI: 150, // 150%
        maxPaybackPeriod: 12 // 12 months
      },
      search: {
        minSuccessRate: 85, // 85%
        maxCostPerSearch: 0.10, // $0.10
        minContactConversionRate: 20 // 20%
      },
      competitive: {
        minMarketShare: 5, // 5%
        minUserPreferenceScore: 3.5, // 3.5/5
        minSatisfactionBenchmark: 4.0 // 4.0/5
      }
    };
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        this.checkAlerts();
        this.storeMetrics();
      } catch (error) {
        console.error('Business metrics monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [BUSINESS-METRICS-MONITOR] Business metrics monitoring started');
  }

  /**
   * Update all metrics
   */
  private async updateMetrics(): Promise<void> {
    this.metrics.timestamp = new Date();
    
    await Promise.all([
      this.updateAcquisitionMetrics(),
      this.updateEngagementMetrics(),
      this.updateProductivityMetrics(),
      this.updateFinancialMetrics(),
      this.updateSearchPerformanceMetrics(),
      this.updateCompetitiveMetrics()
    ]);
  }

  /**
   * Update acquisition metrics
   */
  private async updateAcquisitionMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get total users
        const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
        this.metrics.acquisition.totalUsers = parseInt(totalUsersResult.rows[0].count);
        
        // Get active users (last 30 days)
        const activeUsersResult = await pool.query(`
          SELECT COUNT(DISTINCT user_id) 
          FROM user_sessions 
          WHERE session_start >= NOW() - INTERVAL '30 days'
        `);
        this.metrics.acquisition.activeUsers = parseInt(activeUsersResult.rows[0].count);
        
        // Get new users (last 30 days)
        const newUsersResult = await pool.query(`
          SELECT COUNT(*) 
          FROM users 
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `);
        this.metrics.acquisition.newUsers = parseInt(newUsersResult.rows[0].count);
        
        // Get returning users
        this.metrics.acquisition.returningUsers = this.metrics.acquisition.activeUsers - this.metrics.acquisition.newUsers;
        
        // Calculate retention rate
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        
        const usersThirtyDaysAgo = await pool.query(`
          SELECT COUNT(*) 
          FROM users 
          WHERE created_at <= $1
        `, [thirtyDaysAgo]);
        
        const retainedUsers = await pool.query(`
          SELECT COUNT(DISTINCT u.user_id) 
          FROM users u
          JOIN user_sessions s ON u.user_id = s.user_id
          WHERE u.created_at <= $1 AND s.session_start >= $2
        `, [sixtyDaysAgo, thirtyDaysAgo]);
        
        const totalUsersThirtyDaysAgo = parseInt(usersThirtyDaysAgo.rows[0].count);
        if (totalUsersThirtyDaysAgo > 0) {
          this.metrics.acquisition.userRetentionRate = (parseInt(retainedUsers.rows[0].count) / totalUsersThirtyDaysAgo) * 100;
        }
        
        // Calculate churn rate
        const churnedUsers = await pool.query(`
          SELECT COUNT(*) 
          FROM users u
          WHERE u.created_at <= $1 
          AND NOT EXISTS (
            SELECT 1 FROM user_sessions s 
            WHERE s.user_id = u.user_id AND s.session_start >= $2
          )
        `, [sixtyDaysAgo, thirtyDaysAgo]);
        
        if (totalUsersThirtyDaysAgo > 0) {
          this.metrics.acquisition.userChurnRate = (parseInt(churnedUsers.rows[0].count) / totalUsersThirtyDaysAgo) * 100;
        }
        
        // Calculate conversion rate
        const conversionEvents = await pool.query(`
          SELECT COUNT(*) 
          FROM conversion_events 
          WHERE event_date >= NOW() - INTERVAL '30 days'
        `);
        
        const totalSessions = await pool.query(`
          SELECT COUNT(*) 
          FROM user_sessions 
          WHERE session_start >= NOW() - INTERVAL '30 days'
        `);
        
        if (parseInt(totalSessions.rows[0].count) > 0) {
          this.metrics.acquisition.conversionRate = (parseInt(conversionEvents.rows[0].count) / parseInt(totalSessions.rows[0].count)) * 100;
        }
        
        // Calculate cost per acquisition
        const marketingSpend = await pool.query(`
          SELECT SUM(amount) 
          FROM marketing_spend 
          WHERE spend_date >= NOW() - INTERVAL '30 days'
        `);
        
        const totalSpend = parseFloat(marketingSpend.rows[0].sum) || 0;
        if (this.metrics.acquisition.newUsers > 0) {
          this.metrics.acquisition.costPerAcquisition = totalSpend / this.metrics.acquisition.newUsers;
        }
        
        // Calculate lifetime value (simplified)
        const avgRevenuePerUser = await pool.query(`
          SELECT AVG(revenue) 
          FROM user_revenue 
          WHERE revenue_date >= NOW() - INTERVAL '30 days'
        `);
        
        const avgRevenue = parseFloat(avgRevenuePerUser.rows[0].avg) || 0;
        const avgUserLifespan = 12; // months (simplified)
        this.metrics.acquisition.lifetimeValue = avgRevenue * avgUserLifespan;
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating acquisition metrics:', error);
    }
  }

  /**
   * Update engagement metrics
   */
  private async updateEngagementMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get average session duration
        const sessionDurationResult = await pool.query(`
          SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))) 
          FROM user_sessions 
          WHERE session_start >= NOW() - INTERVAL '7 days' AND end_time IS NOT NULL
        `);
        this.metrics.engagement.averageSessionDuration = parseFloat(sessionDurationResult.rows[0].avg) || 0;
        
        // Get page views per session
        const pageViewsResult = await pool.query(`
          SELECT AVG(page_view_count) 
          FROM user_sessions 
          WHERE session_start >= NOW() - INTERVAL '7 days'
        `);
        this.metrics.engagement.pageViewsPerSession = parseFloat(pageViewsResult.rows[0].avg) || 0;
        
        // Get interactions per session
        const interactionsResult = await pool.query(`
          SELECT AVG(interaction_count) 
          FROM user_sessions 
          WHERE session_start >= NOW() - INTERVAL '7 days'
        `);
        this.metrics.engagement.interactionsPerSession = parseFloat(interactionsResult.rows[0].avg) || 0;
        
        // Get feature adoption rates
        const featureUsageResult = await pool.query(`
          SELECT feature, COUNT(DISTINCT user_id) * 100.0 / (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE session_start >= NOW() - INTERVAL '7 days') as adoption_rate
          FROM feature_usage
          WHERE usage_date >= NOW() - INTERVAL '7 days'
          GROUP BY feature
        `);
        
        this.metrics.engagement.featureAdoptionRate = {};
        featureUsageResult.rows.forEach(row => {
          this.metrics.engagement.featureAdoptionRate[row.feature] = parseFloat(row.adoption_rate);
        });
        
        // Get user satisfaction score
        const satisfactionResult = await pool.query(`
          SELECT AVG(rating) 
          FROM user_feedback 
          WHERE feedback_date >= NOW() - INTERVAL '30 days' AND rating IS NOT NULL
        `);
        this.metrics.engagement.userSatisfactionScore = parseFloat(satisfactionResult.rows[0].avg) || 0;
        
        // Get Net Promoter Score
        const npsResult = await pool.query(`
          SELECT 
            SUM(CASE WHEN rating >= 9 THEN 1 ELSE 0 END) as promoters,
            SUM(CASE WHEN rating <= 6 THEN 1 ELSE 0 END) as detractors,
            COUNT(*) as total
          FROM nps_surveys 
          WHERE survey_date >= NOW() - INTERVAL '30 days'
        `);
        
        const { promoters, detractors, total } = npsResult.rows[0];
        if (parseInt(total) > 0) {
          this.metrics.engagement.netPromoterScore = ((parseInt(promoters) - parseInt(detractors)) / parseInt(total)) * 100;
        }
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating engagement metrics:', error);
    }
  }

  /**
   * Update productivity metrics
   */
  private async updateProductivityMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get time saved from AI searches
        const timeSavedResult = await pool.query(`
          SELECT SUM(time_saved_minutes) 
          FROM productivity_metrics 
          WHERE metric_date >= NOW() - INTERVAL '1 day'
        `);
        this.metrics.productivity.timeSaved = parseFloat(timeSavedResult.rows[0].sum) || 0;
        
        // Get cost savings
        const costSavingsResult = await pool.query(`
          SELECT SUM(cost_savings) 
          FROM productivity_metrics 
          WHERE metric_date >= NOW() - INTERVAL '1 day'
        `);
        this.metrics.productivity.costSavings = parseFloat(costSavingsResult.rows[0].sum) || 0;
        
        // Get productivity gain
        const productivityGainResult = await pool.query(`
          SELECT AVG(productivity_gain_percent) 
          FROM productivity_metrics 
          WHERE metric_date >= NOW() - INTERVAL '7 days'
        `);
        this.metrics.productivity.productivityGain = parseFloat(productivityGainResult.rows[0].avg) || 0;
        
        // Get efficiency improvement
        const efficiencyResult = await pool.query(`
          SELECT AVG(efficiency_improvement_percent) 
          FROM productivity_metrics 
          WHERE metric_date >= NOW() - INTERVAL '7 days'
        `);
        this.metrics.productivity.efficiencyImprovement = parseFloat(efficiencyResult.rows[0].avg) || 0;
        
        // Get tasks completed
        const tasksResult = await pool.query(`
          SELECT COUNT(*) 
          FROM completed_tasks 
          WHERE completion_date >= NOW() - INTERVAL '1 day'
        `);
        this.metrics.productivity.tasksCompleted = parseInt(tasksResult.rows[0].count);
        
        // Get average task time
        const avgTaskTimeResult = await pool.query(`
          SELECT AVG(completion_time_minutes) 
          FROM completed_tasks 
          WHERE completion_date >= NOW() - INTERVAL '7 days'
        `);
        this.metrics.productivity.averageTaskTime = parseFloat(avgTaskTimeResult.rows[0].avg) || 0;
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating productivity metrics:', error);
    }
  }

  /**
   * Update financial metrics
   */
  private async updateFinancialMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get revenue
        const revenueResult = await pool.query(`
          SELECT SUM(amount) 
          FROM revenue 
          WHERE revenue_date >= NOW() - INTERVAL '1 month'
        `);
        this.metrics.financial.revenue = parseFloat(revenueResult.rows[0].sum) || 0;
        
        // Get costs by category
        const costsResult = await pool.query(`
          SELECT 
            category,
            SUM(amount) as total
          FROM costs 
          WHERE cost_date >= NOW() - INTERVAL '1 month'
          GROUP BY category
        `);
        
        this.metrics.financial.costs = {
          total: 0,
          aiServices: 0,
          infrastructure: 0,
          support: 0,
          development: 0
        };
        
        costsResult.rows.forEach(row => {
          const amount = parseFloat(row.total);
          this.metrics.financial.costs.total += amount;
          
          switch (row.category) {
            case 'ai_services':
              this.metrics.financial.costs.aiServices = amount;
              break;
            case 'infrastructure':
              this.metrics.financial.costs.infrastructure = amount;
              break;
            case 'support':
              this.metrics.financial.costs.support = amount;
              break;
            case 'development':
              this.metrics.financial.costs.development = amount;
              break;
          }
        });
        
        // Calculate profit and profit margin
        this.metrics.financial.profit = this.metrics.financial.revenue - this.metrics.financial.costs.total;
        if (this.metrics.financial.revenue > 0) {
          this.metrics.financial.profitMargin = (this.metrics.financial.profit / this.metrics.financial.revenue) * 100;
        }
        
        // Calculate ROI
        const investmentResult = await pool.query(`
          SELECT SUM(amount) 
          FROM investments 
          WHERE investment_date >= NOW() - INTERVAL '12 months'
        `);
        const totalInvestment = parseFloat(investmentResult.rows[0].sum) || 0;
        
        if (totalInvestment > 0) {
          this.metrics.financial.roi = ((this.metrics.financial.profit - totalInvestment) / totalInvestment) * 100;
        }
        
        // Calculate payback period (simplified)
        const monthlyProfit = this.metrics.financial.profit / 12;
        if (monthlyProfit > 0 && totalInvestment > 0) {
          this.metrics.financial.paybackPeriod = totalInvestment / monthlyProfit;
        }
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating financial metrics:', error);
    }
  }

  /**
   * Update search performance metrics
   */
  private async updateSearchPerformanceMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get total searches
        const totalSearchesResult = await pool.query(`
          SELECT COUNT(*) 
          FROM ai_searches 
          WHERE created_at >= NOW() - INTERVAL '1 day'
        `);
        this.metrics.searchPerformance.totalSearches = parseInt(totalSearchesResult.rows[0].count);
        
        // Get success rate
        const successResult = await pool.query(`
          SELECT COUNT(*) 
          FROM ai_searches 
          WHERE created_at >= NOW() - INTERVAL '1 day' AND status = 'COMPLETED'
        `);
        
        if (this.metrics.searchPerformance.totalSearches > 0) {
          this.metrics.searchPerformance.successRate = (parseInt(successResult.rows[0].count) / this.metrics.searchPerformance.totalSearches) * 100;
        }
        
        // Get average results
        const avgResultsResult = await pool.query(`
          SELECT AVG(contacts_found) 
          FROM ai_searches 
          WHERE created_at >= NOW() - INTERVAL '1 day' AND status = 'COMPLETED'
        `);
        this.metrics.searchPerformance.averageResults = parseFloat(avgResultsResult.rows[0].avg) || 0;
        
        // Get average response time
        const avgResponseTimeResult = await pool.query(`
          SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) 
          FROM ai_searches 
          WHERE created_at >= NOW() - INTERVAL '1 day' AND status = 'COMPLETED'
        `);
        this.metrics.searchPerformance.averageResponseTime = parseFloat(avgResponseTimeResult.rows[0].avg) || 0;
        
        // Get cost per search
        const costResult = await pool.query(`
          SELECT SUM(cost) 
          FROM ai_searches 
          WHERE created_at >= NOW() - INTERVAL '1 day'
        `);
        
        const totalCost = parseFloat(costResult.rows[0].sum) || 0;
        if (this.metrics.searchPerformance.totalSearches > 0) {
          this.metrics.searchPerformance.costPerSearch = totalCost / this.metrics.searchPerformance.totalSearches;
        }
        
        // Get contacts found
        const contactsFoundResult = await pool.query(`
          SELECT SUM(contacts_found) 
          FROM ai_searches 
          WHERE created_at >= NOW() - INTERVAL '1 day' AND status = 'COMPLETED'
        `);
        this.metrics.searchPerformance.contactsFound = parseInt(contactsFoundResult.rows[0].count) || 0;
        
        // Get contact conversion rate
        const conversionResult = await pool.query(`
          SELECT COUNT(*) 
          FROM contact_exports 
          WHERE export_date >= NOW() - INTERVAL '1 day' AND source_search_id IS NOT NULL
        `);
        
        if (this.metrics.searchPerformance.totalSearches > 0) {
          this.metrics.searchPerformance.contactConversionRate = (parseInt(conversionResult.rows[0].count) / this.metrics.searchPerformance.totalSearches) * 100;
        }
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating search performance metrics:', error);
    }
  }

  /**
   * Update competitive metrics
   */
  private async updateCompetitiveMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get market share (simplified)
        const marketShareResult = await pool.query(`
          SELECT (our_users * 100.0 / total_market) as market_share
          FROM market_analysis 
          WHERE analysis_date >= NOW() - INTERVAL '1 day'
        `);
        this.metrics.competitive.marketShare = parseFloat(marketShareResult.rows[0]?.market_share) || 0;
        
        // Get user preference score
        const preferenceResult = await pool.query(`
          SELECT AVG(preference_score) 
          FROM competitive_surveys 
          WHERE survey_date >= NOW() - INTERVAL '30 days'
        `);
        this.metrics.competitive.userPreferenceScore = parseFloat(preferenceResult.rows[0].avg) || 0;
        
        // Get feature comparison
        const featureComparisonResult = await pool.query(`
          SELECT feature, our_score, competitor_score, (our_score * 100.0 / competitor_score) as relative_score
          FROM feature_comparison 
          WHERE comparison_date >= NOW() - INTERVAL '7 days'
        `);
        
        this.metrics.competitive.featureComparison = {};
        featureComparisonResult.rows.forEach(row => {
          this.metrics.competitive.featureComparison[row.feature] = parseFloat(row.relative_score);
        });
        
        // Get satisfaction benchmark
        const benchmarkResult = await pool.query(`
          SELECT AVG(benchmark_score) 
          FROM satisfaction_benchmarks 
          WHERE benchmark_date >= NOW() - INTERVAL '30 days'
        `);
        this.metrics.competitive.satisfactionBenchmark = parseFloat(benchmarkResult.rows[0].avg) || 0;
        
        // Get price comparison
        const priceResult = await pool.query(`
          SELECT (our_price * 100.0 / competitor_price) as relative_price
          FROM price_comparison 
          WHERE comparison_date >= NOW() - INTERVAL '7 days'
        `);
        this.metrics.competitive.priceComparison = parseFloat(priceResult.rows[0]?.relative_price) || 0;
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating competitive metrics:', error);
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const alerts: BusinessAlert[] = [];

    // Acquisition alerts
    if (this.metrics.acquisition.userRetentionRate < this.thresholds.acquisition.minUserRetentionRate) {
      alerts.push(this.createAlert(
        'acquisition',
        'warning',
        'Low User Retention Rate',
        `User retention rate is ${this.metrics.acquisition.userRetentionRate.toFixed(1)}%`,
        'user_retention_rate',
        this.metrics.acquisition.userRetentionRate,
        this.thresholds.acquisition.minUserRetentionRate,
        [
          'Improve onboarding experience',
          'Enhance product value proposition',
          'Implement user engagement programs',
          'Review and address user pain points'
        ]
      ));
    }

    if (this.metrics.acquisition.userChurnRate > this.thresholds.acquisition.maxUserChurnRate) {
      alerts.push(this.createAlert(
        'acquisition',
        'critical',
        'High User Churn Rate',
        `User churn rate is ${this.metrics.acquisition.userChurnRate.toFixed(1)}%`,
        'user_churn_rate',
        this.metrics.acquisition.userChurnRate,
        this.thresholds.acquisition.maxUserChurnRate,
        [
          'Identify reasons for user churn',
          'Implement retention strategies',
          'Improve customer support',
          'Offer incentives for staying'
        ]
      ));
    }

    if (this.metrics.acquisition.costPerAcquisition > this.thresholds.acquisition.maxCostPerAcquisition) {
      alerts.push(this.createAlert(
        'acquisition',
        'warning',
        'High Cost Per Acquisition',
        `Cost per acquisition is $${this.metrics.acquisition.costPerAcquisition.toFixed(2)}`,
        'cost_per_acquisition',
        this.metrics.acquisition.costPerAcquisition,
        this.thresholds.acquisition.maxCostPerAcquisition,
        [
          'Optimize marketing channels',
          'Improve conversion rates',
          'Focus on higher-value customer segments',
          'Review marketing spend effectiveness'
        ]
      ));
    }

    // Engagement alerts
    if (this.metrics.engagement.userSatisfactionScore < this.thresholds.engagement.minUserSatisfactionScore) {
      alerts.push(this.createAlert(
        'engagement',
        'warning',
        'Low User Satisfaction',
        `User satisfaction score is ${this.metrics.engagement.userSatisfactionScore.toFixed(1)}/5`,
        'user_satisfaction_score',
        this.metrics.engagement.userSatisfactionScore,
        this.thresholds.engagement.minUserSatisfactionScore,
        [
          'Analyze user feedback',
          'Address common pain points',
          'Improve user experience',
          'Enhance product features'
        ]
      ));
    }

    // Productivity alerts
    if (this.metrics.productivity.timeSaved < this.thresholds.productivity.minTimeSavings) {
      alerts.push(this.createAlert(
        'productivity',
        'warning',
        'Low Time Savings',
        `Time saved is ${this.metrics.productivity.timeSaved.toFixed(1)} minutes per day`,
        'time_saved',
        this.metrics.productivity.timeSaved,
        this.thresholds.productivity.minTimeSavings,
        [
          'Improve AI search accuracy',
          'Enhance user interface efficiency',
          'Provide better training and documentation',
          'Optimize workflow processes'
        ]
      ));
    }

    // Financial alerts
    if (this.metrics.financial.roi < this.thresholds.financial.minROI) {
      alerts.push(this.createAlert(
        'financial',
        'critical',
        'Low Return on Investment',
        `ROI is ${this.metrics.financial.roi.toFixed(1)}%`,
        'roi',
        this.metrics.financial.roi,
        this.thresholds.financial.minROI,
        [
          'Reduce operational costs',
          'Increase revenue streams',
          'Improve pricing strategy',
          'Focus on high-margin products/services'
        ]
      ));
    }

    if (this.metrics.financial.profitMargin < this.thresholds.financial.minProfitMargin) {
      alerts.push(this.createAlert(
        'financial',
        'warning',
        'Low Profit Margin',
        `Profit margin is ${this.metrics.financial.profitMargin.toFixed(1)}%`,
        'profit_margin',
        this.metrics.financial.profitMargin,
        this.thresholds.financial.minProfitMargin,
        [
          'Reduce costs without sacrificing quality',
          'Increase prices if market allows',
          'Focus on higher-margin products',
          'Improve operational efficiency'
        ]
      ));
    }

    // Search performance alerts
    if (this.metrics.searchPerformance.successRate < this.thresholds.search.minSuccessRate) {
      alerts.push(this.createAlert(
        'search',
        'warning',
        'Low Search Success Rate',
        `Search success rate is ${this.metrics.searchPerformance.successRate.toFixed(1)}%`,
        'search_success_rate',
        this.metrics.searchPerformance.successRate,
        this.thresholds.search.minSuccessRate,
        [
          'Improve search algorithms',
          'Enhance content indexing',
          'Provide better query suggestions',
          'Review search quality metrics'
        ]
      ));
    }

    if (this.metrics.searchPerformance.costPerSearch > this.thresholds.search.maxCostPerSearch) {
      alerts.push(this.createAlert(
        'search',
        'warning',
        'High Cost Per Search',
        `Cost per search is $${this.metrics.searchPerformance.costPerSearch.toFixed(3)}`,
        'cost_per_search',
        this.metrics.searchPerformance.costPerSearch,
        this.thresholds.search.maxCostPerSearch,
        [
          'Optimize search queries',
          'Implement result caching',
          'Review AI service usage',
          'Consider more cost-effective providers'
        ]
      ));
    }

    // Competitive alerts
    if (this.metrics.competitive.userPreferenceScore < this.thresholds.competitive.minUserPreferenceScore) {
      alerts.push(this.createAlert(
        'competitive',
        'warning',
        'Low User Preference Score',
        `User preference score is ${this.metrics.competitive.userPreferenceScore.toFixed(1)}/5`,
        'user_preference_score',
        this.metrics.competitive.userPreferenceScore,
        this.thresholds.competitive.minUserPreferenceScore,
        [
          'Analyze competitive weaknesses',
          'Enhance key differentiating features',
          'Improve overall user experience',
          'Address specific competitor advantages'
        ]
      ));
    }

    // Add new alerts to the list
    alerts.forEach(alert => {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        a.type === alert.type && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 30 * 60 * 1000 // 30 minutes
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        console.log(`🚨 [BUSINESS-METRICS-MONITOR] Alert: ${alert.title}`);
      }
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Create a business alert
   */
  private createAlert(
    type: BusinessAlert['type'],
    severity: BusinessAlert['severity'],
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): BusinessAlert {
    // Determine impact based on severity and metric importance
    let impact: 'low' | 'medium' | 'high' = 'low';
    if (severity === 'critical' || severity === 'emergency') {
      impact = 'high';
    } else if (severity === 'warning') {
      impact = 'medium';
    }

    // Increase impact for critical metrics
    if (['roi', 'profit_margin', 'user_retention_rate', 'user_churn_rate'].includes(metric)) {
      if (impact === 'medium') impact = 'high';
      else if (impact === 'low') impact = 'medium';
    }

    return {
      id: `biz_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      impact,
      recommendations
    };
  }

  /**
   * Store metrics in history
   */
  private storeMetrics(): void {
    this.metricsHistory.push({ ...this.metrics });
    
    // Keep only last N metrics
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): BusinessMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): BusinessMetrics[] {
    const history = [...this.metricsHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get current alerts
   */
  getAlerts(): BusinessAlert[] {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: BusinessAlert['severity']): BusinessAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: BusinessAlert['type']): BusinessAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<BusinessThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [BUSINESS-METRICS-MONITOR] Thresholds updated');
  }

  /**
   * Get ROI analysis
   */
  getROIAnalysis(timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'): {
    revenue: number;
    costs: number;
    profit: number;
    roi: number;
    paybackPeriod: number;
    breakEvenPoint?: Date;
  } {
    // In a real implementation, this would query database for specific timeframe
    return {
      revenue: this.metrics.financial.revenue,
      costs: this.metrics.financial.costs.total,
      profit: this.metrics.financial.profit,
      roi: this.metrics.financial.roi,
      paybackPeriod: this.metrics.financial.paybackPeriod
    };
  }

  /**
   * Get cost-benefit analysis
   */
  getCostBenefitAnalysis(): {
    totalCosts: number;
    totalBenefits: number;
    netBenefit: number;
    benefitCostRatio: number;
    costSavingsBreakdown: Record<string, number>;
    productivityGainsBreakdown: Record<string, number>;
  } {
    const totalCosts = this.metrics.financial.costs.total;
    const totalBenefits = this.metrics.productivity.costSavings + this.metrics.financial.revenue;
    const netBenefit = totalBenefits - totalCosts;
    const benefitCostRatio = totalCosts > 0 ? totalBenefits / totalCosts : 0;

    return {
      totalCosts,
      totalBenefits,
      netBenefit,
      benefitCostRatio,
      costSavingsBreakdown: {
        'ai_search': this.metrics.productivity.costSavings * 0.7,
        'automation': this.metrics.productivity.costSavings * 0.3
      },
      productivityGainsBreakdown: {
        'time_efficiency': this.metrics.productivity.timeSaved * 50, // $50/hour value
        'quality_improvement': this.metrics.financial.revenue * 0.2
      }
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: BusinessMetrics;
    alerts: BusinessAlert[];
    summary: {
      overall: 'excellent' | 'good' | 'fair' | 'poor';
      kpis: Record<string, {
        current: number;
        target: number;
        status: 'on_track' | 'at_risk' | 'off_track';
      }>;
      issues: string[];
      recommendations: string[];
    };
  } {
    const criticalAlerts = this.getAlertsBySeverity('critical');
    const warningAlerts = this.getAlertsBySeverity('warning');
    
    let overall: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (criticalAlerts.length > 0) {
      overall = 'poor';
    } else if (warningAlerts.length > 5) {
      overall = 'fair';
    } else if (warningAlerts.length > 0) {
      overall = 'good';
    }

    // Define KPIs to track
    const kpis = {
      user_retention_rate: {
        current: this.metrics.acquisition.userRetentionRate,
        target: this.thresholds.acquisition.minUserRetentionRate,
        status: this.metrics.acquisition.userRetentionRate >= this.thresholds.acquisition.minUserRetentionRate ? 'on_track' : 'at_risk' as const
      },
      roi: {
        current: this.metrics.financial.roi,
        target: this.thresholds.financial.minROI,
        status: this.metrics.financial.roi >= this.thresholds.financial.minROI ? 'on_track' : 'at_risk' as const
      },
      user_satisfaction: {
        current: this.metrics.engagement.userSatisfactionScore,
        target: this.thresholds.engagement.minUserSatisfactionScore,
        status: this.metrics.engagement.userSatisfactionScore >= this.thresholds.engagement.minUserSatisfactionScore ? 'on_track' : 'at_risk' as const
      },
      search_success_rate: {
        current: this.metrics.searchPerformance.successRate,
        target: this.thresholds.search.minSuccessRate,
        status: this.metrics.searchPerformance.successRate >= this.thresholds.search.minSuccessRate ? 'on_track' : 'at_risk' as const
      }
    };

    const issues = this.alerts.map(alert => alert.title);
    const recommendations = this.alerts.flatMap(alert => alert.recommendations);

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        overall,
        kpis,
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
      console.log('🛑 [BUSINESS-METRICS-MONITOR] Business metrics monitoring stopped');
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.metricsHistory = [];
    console.log('🔄 [BUSINESS-METRICS-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const businessMetricsMonitor = BusinessMetricsMonitor.getInstance();

// Export utility functions
export function getBusinessMetrics(): BusinessMetrics {
  return businessMetricsMonitor.getMetrics();
}

export function getBusinessMetricsAlerts(): BusinessAlert[] {
  return businessMetricsMonitor.getAlerts();
}

export function getBusinessMetricsPerformanceReport() {
  return businessMetricsMonitor.getPerformanceReport();
}

export function getROIAnalysis(timeframe?: 'week' | 'month' | 'quarter' | 'year') {
  return businessMetricsMonitor.getROIAnalysis(timeframe);
}

export function getCostBenefitAnalysis() {
  return businessMetricsMonitor.getCostBenefitAnalysis();
}