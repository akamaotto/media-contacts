/**
 * AI Analytics Dashboard
 * Comprehensive dashboard for visualizing "Find Contacts with AI" feature analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Users, Target, DollarSign, Clock, Star, AlertCircle, Download } from 'lucide-react';
import { 
  aiFeatureSuccessMetrics, 
  type SuccessMetricsReport 
} from '@/lib/analytics/ai-feature-success-metrics';
import { 
  featureAdoptionTracker, 
  type AdoptionMetrics 
} from '@/lib/analytics/feature-adoption-tracker';
import { 
  usagePatternAnalyzer, 
  type UsageReport 
} from '@/lib/analytics/usage-pattern-analyzer';
import { 
  userSatisfactionTracker, 
  type SatisfactionReport 
} from '@/lib/analytics/user-satisfaction-tracker';
import { 
  businessImpactCalculator, 
  type ImpactReport 
} from '@/lib/analytics/business-impact-calculator';

interface DashboardProps {
  timeRange: { start: Date; end: Date };
  onTimeRangeChange?: (timeRange: { start: Date; end: Date }) => void;
}

export function AIAnalyticsDashboard({ timeRange, onTimeRangeChange }: DashboardProps) {
  const [successReport, setSuccessReport] = useState<SuccessMetricsReport | null>(null);
  const [adoptionMetrics, setAdoptionMetrics] = useState<AdoptionMetrics | null>(null);
  const [usageReport, setUsageReport] = useState<UsageReport | null>(null);
  const [satisfactionReport, setSatisfactionReport] = useState<SatisfactionReport | null>(null);
  const [impactReport, setImpactReport] = useState<ImpactReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [
        successData,
        adoptionData,
        usageData,
        satisfactionData,
        impactData
      ] = await Promise.all([
        aiFeatureSuccessMetrics.generateSuccessReport(timeRange),
        featureAdoptionTracker.getAdoptionMetrics(timeRange),
        usagePatternAnalyzer.generateUsageReport(timeRange),
        userSatisfactionTracker.generateSatisfactionReport(timeRange),
        businessImpactCalculator.generateImpactReport(timeRange)
      ]);

      setSuccessReport(successData);
      setAdoptionMetrics(adoptionData);
      setUsageReport(usageData);
      setSatisfactionReport(satisfactionData);
      setImpactReport(impactData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        timeRange,
        successReport,
        adoptionMetrics,
        usageReport,
        satisfactionReport,
        impactReport,
        exportedAt: new Date()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-analytics-${timeRange.start.toISOString().split('T')[0]}-${timeRange.end.toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-2">{error}</p>
          <Button onClick={loadDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Feature Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics for "Find Contacts with AI" feature
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDashboardData}>
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {successReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Overall Status"
            value={successReport.status.overall}
            icon={<Target className="h-4 w-4" />}
            trend={null}
          />
          <SummaryCard
            title="Adoption Rate"
            value={`${successReport.metrics.adoption.adoptionRate.toFixed(1)}%`}
            icon={<Users className="h-4 w-4" />}
            trend={successReport.trends.adoption[successReport.trends.adoption.length - 1]?.value}
          />
          <SummaryCard
            title="User Satisfaction"
            value={`${successReport.metrics.satisfaction.averageRating.toFixed(1)}/5`}
            icon={<Star className="h-4 w-4" />}
            trend={successReport.trends.satisfaction[successReport.trends.satisfaction.length - 1]?.value}
          />
          <SummaryCard
            title="ROI"
            value={`${impactReport?.currentMetrics.roi.monthlyROI.toFixed(0)}%`}
            icon={<DollarSign className="h-4 w-4" />}
            trend={null}
          />
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="adoption">Adoption</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {successReport && <SuccessStatusCard report={successReport} />}
            {adoptionMetrics && <AdoptionFunnelCard metrics={adoptionMetrics} />}
            {usageReport && <UsageKPICard report={usageReport} />}
            {impactReport && <BusinessImpactCard report={impactReport} />}
          </div>
        </TabsContent>

        {/* Adoption Tab */}
        <TabsContent value="adoption" className="space-y-4">
          {adoptionMetrics && (
            <>
              <AdoptionMetricsCard metrics={adoptionMetrics} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AdoptionSourceCard metrics={adoptionMetrics} />
                <AdoptionCohortCard metrics={adoptionMetrics} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          {usageReport && (
            <>
              <UsagePatternsCard patterns={usageReport.patterns} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <UsageInteractionCard patterns={usageReport.patterns} />
                <UsageSegmentCard patterns={usageReport.patterns} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Satisfaction Tab */}
        <TabsContent value="satisfaction" className="space-y-4">
          {satisfactionReport && (
            <>
              <SatisfactionOverviewCard report={satisfactionReport} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SatisfactionDimensionCard metrics={satisfactionReport.metrics} />
                <SatisfactionSentimentCard metrics={satisfactionReport.metrics} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Impact Tab */}
        <TabsContent value="impact" className="space-y-4">
          {impactReport && (
            <>
              <BusinessImpactOverviewCard report={impactReport} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ROIAnalysisCard report={impactReport} />
                <ValueCreationCard report={impactReport} />
              </div>
            </>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {successReport && <InsightsCard insights={successReport.insights} title="Success Insights" />}
            {usageReport && <InsightsCard insights={usageReport.insights} title="Usage Insights" />}
            {satisfactionReport && <InsightsCard insights={satisfactionReport.insights} title="Satisfaction Insights" />}
            {impactReport && <InsightsCard insights={impactReport.insights} title="Impact Insights" />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ 
  title, 
  value, 
  icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  trend?: number | null; 
}) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className={`text-2xl font-bold ${title === 'Overall Status' ? getStatusColor(value as string) : ''}`}>
            {value}
          </div>
          {getTrendIcon()}
        </div>
      </CardContent>
    </Card>
  );
}

// Success Status Card Component
function SuccessStatusCard({ report }: { report: SuccessMetricsReport }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Success Status</CardTitle>
        <CardDescription>
          Overall performance across all success dimensions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Status</span>
          <Badge className={getStatusColor(report.status.overall)}>
            {report.status.overall.toUpperCase()}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Category Status</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(report.status.categories).map(([category, status]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-xs capitalize">{category.replace(/([A-Z])/g, ' $1')}</span>
                <Badge variant="outline" className={getStatusColor(status)}>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Adoption Funnel Card Component
function AdoptionFunnelCard({ metrics }: { metrics: AdoptionMetrics }) {
  const funnelData = [
    { stage: 'Total Users', count: metrics.funnel.totalUsers, color: 'bg-gray-200' },
    { stage: 'Aware', count: metrics.funnel.awareUsers, color: 'bg-blue-200' },
    { stage: 'Interested', count: metrics.funnel.interestedUsers, color: 'bg-indigo-200' },
    { stage: 'First Use', count: metrics.funnel.firstTimeUsers, color: 'bg-purple-200' },
    { stage: 'Active', count: metrics.funnel.activeUsers, color: 'bg-pink-200' },
    { stage: 'Regular', count: metrics.funnel.regularUsers, color: 'bg-red-200' },
    { stage: 'Power Users', count: metrics.funnel.powerUsers, color: 'bg-orange-200' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adoption Funnel</CardTitle>
        <CardDescription>
          User journey through adoption stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {funnelData.map((stage, index) => (
            <div key={stage.stage} className="flex items-center space-x-2">
              <div className="w-24 text-sm">{stage.stage}</div>
              <div className="flex-1">
                <div className="relative">
                  <div className={`h-6 ${stage.color} rounded`}></div>
                  <div 
                    className="absolute top-0 left-0 h-6 bg-primary rounded" 
                    style={{ width: `${(stage.count / metrics.funnel.totalUsers) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-12 text-sm text-right">{stage.count}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Conversion Rates</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Awareness to Interest</span>
              <span>{metrics.conversionRates.awarenessToInterest.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Interest to First Use</span>
              <span>{metrics.conversionRates.interestToFirstUse.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>First Use to Active</span>
              <span>{metrics.conversionRates.firstUseToActive.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Usage KPI Card Component
function UsageKPICard({ report }: { report: UsageReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage KPIs</CardTitle>
        <CardDescription>
          Key performance indicators for user engagement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{(report.kpis.queryEfficiency * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Query Efficiency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(report.kpis.userEngagement * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">User Engagement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(report.kpis.featureUtilization * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Feature Utilization</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(report.kpis.contentSatisfaction * 100).toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Content Satisfaction</div>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Recent Insights</h4>
          <div className="space-y-2">
            {report.insights.slice(0, 2).map((insight, index) => (
              <div key={index} className="flex items-start space-x-2">
                <Badge variant={insight.impact === 'high' ? 'destructive' : 'secondary'} className="text-xs mt-0.5">
                  {insight.type}
                </Badge>
                <p className="text-xs">{insight.title}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Business Impact Card Component
function BusinessImpactCard({ report }: { report: ImpactReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Impact</CardTitle>
        <CardDescription>
          Business value and ROI metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Monthly ROI</span>
            <span className="font-bold">{report.currentMetrics.roi.monthlyROI.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Contacts Discovered</span>
            <span className="font-bold">{report.currentMetrics.directValue.contactsDiscovered.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Time Saved</span>
            <span className="font-bold">{report.currentMetrics.efficiency.timeSaved.toFixed(1)} hrs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Cost Savings</span>
            <span className="font-bold">${report.currentMetrics.efficiency.costSavings.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Top Recommendations</h4>
          <div className="space-y-1">
            {report.actionPlan.immediate.slice(0, 2).map((action, index) => (
              <p key={index} className="text-xs">{action.action}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Placeholder components for other tabs
function AdoptionMetricsCard({ metrics }: { metrics: AdoptionMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adoption Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Detailed adoption metrics implementation</p>
      </CardContent>
    </Card>
  );
}

function AdoptionSourceCard({ metrics }: { metrics: AdoptionMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adoption Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Adoption source analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function AdoptionCohortCard({ metrics }: { metrics: AdoptionMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Cohort analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function UsagePatternsCard({ patterns }: { patterns: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Usage patterns analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function UsageInteractionCard({ patterns }: { patterns: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interaction Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Interaction patterns analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function UsageSegmentCard({ patterns }: { patterns: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Segments</CardTitle>
      </CardHeader>
      <CardContent>
        <p>User segment analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function SatisfactionOverviewCard({ report }: { report: SatisfactionReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Satisfaction Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Satisfaction overview implementation</p>
      </CardContent>
    </Card>
  );
}

function SatisfactionDimensionCard({ metrics }: { metrics: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Satisfaction Dimensions</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Satisfaction dimensions implementation</p>
      </CardContent>
    </Card>
  );
}

function SatisfactionSentimentCard({ metrics }: { metrics: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Sentiment analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function BusinessImpactOverviewCard({ report }: { report: ImpactReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Impact Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Business impact overview implementation</p>
      </CardContent>
    </Card>
  );
}

function ROIAnalysisCard({ report }: { report: ImpactReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <p>ROI analysis implementation</p>
      </CardContent>
    </Card>
  );
}

function ValueCreationCard({ report }: { report: ImpactReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Value Creation</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Value creation implementation</p>
      </CardContent>
    </Card>
  );
}

function InsightsCard({ insights, title }: { insights: any[]; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="border-l-2 border-primary pl-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={insight.impact === 'high' ? 'destructive' : 'secondary'}>
                  {insight.type}
                </Badge>
                <h4 className="text-sm font-medium">{insight.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdoptionMetricsCard({ metrics }: { metrics: AdoptionMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Adoption Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Detailed adoption metrics implementation</p>
      </CardContent>
    </Card>
  );
}