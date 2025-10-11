/**
 * Automated Reporting Service
 * Generates and distributes regular analytics reports for stakeholders
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

export interface ReportSchedule {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: ReportRecipient[];
  reportType: 'success_metrics' | 'adoption' | 'usage' | 'satisfaction' | 'impact' | 'comprehensive';
  timeRange: { days: number }; // Days before current date
  format: 'html' | 'pdf' | 'json' | 'csv';
  enabled: boolean;
  nextRun: Date;
  lastRun?: Date;
  createdBy: string;
  createdAt: Date;
  customFilters?: Record<string, any>;
}

export interface ReportRecipient {
  id: string;
  name: string;
  email: string;
  role: 'stakeholder' | 'manager' | 'executive' | 'analyst' | 'developer';
  preferences: {
    includeRawData: boolean;
    includeRecommendations: boolean;
    includeVisualizations: boolean;
    detailLevel: 'summary' | 'standard' | 'detailed';
  };
}

export interface GeneratedReport {
  id: string;
  scheduleId: string;
  type: ReportSchedule['reportType'];
  timeRange: { start: Date; end: Date };
  generatedAt: Date;
  format: ReportSchedule['format'];
  status: 'generating' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
  metadata: {
    title: string;
    description: string;
    metrics: Record<string, any>;
    insights: any[];
    recommendations: string[];
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  reportType: ReportSchedule['reportType'];
  template: string; // HTML template or format specification
  sections: ReportSection[];
  variables: Record<string, string>; // Template variables
  createdBy: string;
  createdAt: Date;
}

export interface ReportSection {
  id: string;
  name: string;
  type: 'summary' | 'chart' | 'table' | 'insights' | 'recommendations';
  title: string;
  description: string;
  required: boolean;
  order: number;
  config: Record<string, any>;
}

export interface ReportDistribution {
  reportId: string;
  recipientId: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  error?: string;
}

export class AutomatedReportingService {
  private static instance: AutomatedReportingService;
  private schedules: Map<string, ReportSchedule> = new Map();
  private reports: Map<string, GeneratedReport> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private distributions: Map<string, ReportDistribution[]> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultTemplates();
    this.startProcessing();
  }

  static getInstance(): AutomatedReportingService {
    if (!AutomatedReportingService.instance) {
      AutomatedReportingService.instance = new AutomatedReportingService();
    }
    return AutomatedReportingService.instance;
  }

  /**
   * Create a new report schedule
   */
  async createSchedule(data: {
    name: string;
    description: string;
    frequency: ReportSchedule['frequency'];
    recipients: Omit<ReportRecipient, 'id'>[];
    reportType: ReportSchedule['reportType'];
    timeRange: { days: number };
    format: ReportSchedule['format'];
    customFilters?: Record<string, any>;
    createdBy: string;
  }): Promise<string> {
    const scheduleId = this.generateId();
    
    // Generate recipient IDs
    const recipients: ReportRecipient[] = data.recipients.map(recipient => ({
      ...recipient,
      id: this.generateId()
    }));
    
    // Calculate next run time
    const nextRun = this.calculateNextRun(data.frequency);
    
    const schedule: ReportSchedule = {
      id: scheduleId,
      name: data.name,
      description: data.description,
      frequency: data.frequency,
      recipients,
      reportType: data.reportType,
      timeRange: data.timeRange,
      format: data.format,
      enabled: true,
      nextRun,
      createdBy: data.createdBy,
      createdAt: new Date(),
      customFilters: data.customFilters
    };
    
    this.schedules.set(scheduleId, schedule);
    
    console.log(`📊 [REPORTING-SERVICE] Created report schedule: ${data.name} (${data.frequency})`);
    
    return scheduleId;
  }

  /**
   * Generate a report on demand
   */
  async generateReport(
    reportType: ReportSchedule['reportType'],
    timeRange: { start: Date; end: Date },
    format: ReportSchedule['format'] = 'json',
    customFilters?: Record<string, any>
  ): Promise<string> {
    const reportId = this.generateId();
    
    const report: GeneratedReport = {
      id: reportId,
      scheduleId: 'on-demand',
      type: reportType,
      timeRange,
      generatedAt: new Date(),
      format,
      status: 'generating',
      metadata: {
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        description: `Generated report for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics: {},
        insights: [],
        recommendations: []
      }
    };
    
    this.reports.set(reportId, report);
    
    try {
      // Generate report content based on type
      const content = await this.generateReportContent(reportType, timeRange, customFilters);
      
      // Update report with generated content
      report.metadata = content.metadata;
      report.status = 'completed';
      
      // Save report to file (in a real implementation)
      const filePath = await this.saveReportToFile(reportId, format, content.data);
      report.filePath = filePath;
      report.fileSize = content.data.length;
      report.downloadUrl = `/api/reports/${reportId}/download`;
      
      console.log(`📊 [REPORTING-SERVICE] Generated report: ${reportId}`);
    } catch (error) {
      console.error(`Error generating report ${reportId}:`, error);
      report.status = 'failed';
      report.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return reportId;
  }

  /**
   * Get all report schedules
   */
  getSchedules(): ReportSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get a specific report schedule
   */
  getSchedule(scheduleId: string): ReportSchedule | null {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * Update a report schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<ReportSchedule, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Report schedule ${scheduleId} not found`);
    }
    
    // Update schedule
    Object.assign(schedule, updates);
    
    // Recalculate next run if frequency changed
    if (updates.frequency) {
      schedule.nextRun = this.calculateNextRun(updates.frequency);
    }
    
    console.log(`📊 [REPORTING-SERVICE] Updated report schedule: ${schedule.name}`);
  }

  /**
   * Delete a report schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Report schedule ${scheduleId} not found`);
    }
    
    this.schedules.delete(scheduleId);
    console.log(`📊 [REPORTING-SERVICE] Deleted report schedule: ${schedule.name}`);
  }

  /**
   * Get generated reports
   */
  getReports(limit?: number): GeneratedReport[] {
    const reports = Array.from(this.reports.values()).sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    return limit ? reports.slice(0, limit) : reports;
  }

  /**
   * Get a specific generated report
   */
  getReport(reportId: string): GeneratedReport | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * Get report distribution status
   */
  getReportDistributions(reportId: string): ReportDistribution[] {
    return this.distributions.get(reportId) || [];
  }

  /**
   * Create a custom report template
   */
  async createTemplate(data: {
    name: string;
    description: string;
    reportType: ReportSchedule['reportType'];
    template: string;
    sections: Omit<ReportSection, 'id'>[];
    variables: Record<string, string>;
    createdBy: string;
  }): Promise<string> {
    const templateId = this.generateId();
    
    const template: ReportTemplate = {
      id: templateId,
      name: data.name,
      description: data.description,
      reportType: data.reportType,
      template: data.template,
      sections: data.sections.map(section => ({
        ...section,
        id: this.generateId()
      })),
      variables: data.variables,
      createdBy: data.createdBy,
      createdAt: new Date()
    };
    
    this.templates.set(templateId, template);
    
    console.log(`📊 [REPORTING-SERVICE] Created report template: ${data.name}`);
    
    return templateId;
  }

  /**
   * Get report templates
   */
  getTemplates(reportType?: ReportSchedule['reportType']): ReportTemplate[] {
    const templates = Array.from(this.templates.values());
    return reportType ? templates.filter(t => t.reportType === reportType) : templates;
  }

  private async generateReportContent(
    reportType: ReportSchedule['reportType'],
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    switch (reportType) {
      case 'success_metrics':
        return this.generateSuccessMetricsReport(timeRange, customFilters);
      case 'adoption':
        return this.generateAdoptionReport(timeRange, customFilters);
      case 'usage':
        return this.generateUsageReport(timeRange, customFilters);
      case 'satisfaction':
        return this.generateSatisfactionReport(timeRange, customFilters);
      case 'impact':
        return this.generateImpactReport(timeRange, customFilters);
      case 'comprehensive':
        return this.generateComprehensiveReport(timeRange, customFilters);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private async generateSuccessMetricsReport(
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    const report = await aiFeatureSuccessMetrics.generateSuccessReport(timeRange);
    
    return {
      metadata: {
        title: 'Success Metrics Report',
        description: `Feature success metrics for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics: report.metrics,
        insights: report.insights,
        recommendations: report.insights.flatMap(i => i.recommendations)
      },
      data: report
    };
  }

  private async generateAdoptionReport(
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    const metrics = await featureAdoptionTracker.getAdoptionMetrics(timeRange);
    
    return {
      metadata: {
        title: 'Feature Adoption Report',
        description: `Feature adoption metrics for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics,
        insights: [],
        recommendations: ['Improve feature discoverability', 'Enhance onboarding experience']
      },
      data: metrics
    };
  }

  private async generateUsageReport(
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    const report = await usagePatternAnalyzer.generateUsageReport(timeRange);
    
    return {
      metadata: {
        title: 'Usage Patterns Report',
        description: `Usage patterns for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics: report.patterns,
        insights: report.insights,
        recommendations: report.recommendations.immediate
      },
      data: report
    };
  }

  private async generateSatisfactionReport(
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    const report = await userSatisfactionTracker.generateSatisfactionReport(timeRange);
    
    return {
      metadata: {
        title: 'User Satisfaction Report',
        description: `User satisfaction metrics for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics: report.metrics,
        insights: report.insights,
        recommendations: report.actionPlan.immediate
      },
      data: report
    };
  }

  private async generateImpactReport(
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    const report = await businessImpactCalculator.generateImpactReport(timeRange);
    
    return {
      metadata: {
        title: 'Business Impact Report',
        description: `Business impact metrics for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics: report.currentMetrics,
        insights: report.insights,
        recommendations: report.actionPlan.immediate
      },
      data: report
    };
  }

  private async generateComprehensiveReport(
    timeRange: { start: Date; end: Date },
    customFilters?: Record<string, any>
  ): Promise<{ metadata: GeneratedReport['metadata']; data: any }> {
    const [
      successReport,
      adoptionMetrics,
      usageReport,
      satisfactionReport,
      impactReport
    ] = await Promise.all([
      this.generateSuccessMetricsReport(timeRange),
      this.generateAdoptionReport(timeRange),
      this.generateUsageReport(timeRange),
      this.generateSatisfactionReport(timeRange),
      this.generateImpactReport(timeRange)
    ]);
    
    const allInsights = [
      ...successReport.metadata.insights,
      ...usageReport.metadata.insights,
      ...satisfactionReport.metadata.insights,
      ...impactReport.metadata.insights
    ];
    
    const allRecommendations = [
      ...successReport.metadata.recommendations,
      ...usageReport.metadata.recommendations,
      ...satisfactionReport.metadata.recommendations,
      ...impactReport.metadata.recommendations
    ];
    
    return {
      metadata: {
        title: 'Comprehensive Analytics Report',
        description: `Comprehensive analytics for ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}`,
        metrics: {
          success: successReport.metadata.metrics,
          adoption: adoptionReport.metadata.metrics,
          usage: usageReport.metadata.metrics,
          satisfaction: satisfactionReport.metadata.metrics,
          impact: impactReport.metadata.metrics
        },
        insights: allInsights,
        recommendations: [...new Set(allRecommendations)]
      },
      data: {
        success: successReport.data,
        adoption: adoptionReport.data,
        usage: usageReport.data,
        satisfaction: satisfactionReport.data,
        impact: impactReport.data
      }
    };
  }

  private async saveReportToFile(reportId: string, format: string, data: any): Promise<string> {
    // In a real implementation, this would save the report to a file system or cloud storage
    const filePath = `/reports/${reportId}.${format}`;
    
    // Simulate file save
    console.log(`💾 [REPORTING-SERVICE] Saved report to ${filePath}`);
    
    return filePath;
  }

  private calculateNextRun(frequency: ReportSchedule['frequency']): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9 AM
        return tomorrow;
        
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0); // 9 AM
        return nextWeek;
        
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // First day of month
        nextMonth.setHours(9, 0, 0, 0); // 9 AM
        return nextMonth;
        
      case 'quarterly':
        const nextQuarter = new Date(now);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        nextQuarter.setDate(1); // First day of quarter
        nextQuarter.setHours(9, 0, 0, 0); // 9 AM
        return nextQuarter;
        
      default:
        return now;
    }
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processScheduledReports();
    }, 60000); // Check every minute

    console.log('✅ [REPORTING-SERVICE] Automated reporting started');
  }

  private async processScheduledReports(): Promise<void> {
    const now = new Date();
    
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && now >= schedule.nextRun) {
        try {
          await this.executeScheduledReport(schedule);
          
          // Update next run time
          schedule.nextRun = this.calculateNextRun(schedule.frequency);
          schedule.lastRun = now;
        } catch (error) {
          console.error(`Error processing scheduled report ${schedule.id}:`, error);
        }
      }
    }
  }

  private async executeScheduledReport(schedule: ReportSchedule): Promise<void> {
    // Calculate time range for the report
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - schedule.timeRange.days);
    
    // Generate the report
    const reportId = await this.generateReport(
      schedule.reportType,
      { start, end },
      schedule.format,
      schedule.customFilters
    );
    
    // Distribute the report to recipients
    await this.distributeReport(reportId, schedule.recipients);
    
    console.log(`📊 [REPORTING-SERVICE] Executed scheduled report: ${schedule.name}`);
  }

  private async distributeReport(reportId: string, recipients: ReportRecipient[]): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report || report.status !== 'completed') {
      throw new Error(`Report ${reportId} not ready for distribution`);
    }
    
    const distributions: ReportDistribution[] = [];
    
    for (const recipient of recipients) {
      const distribution: ReportDistribution = {
        reportId,
        recipientId: recipient.id,
        status: 'pending'
      };
      
      try {
        // Send report via email (in a real implementation)
        await this.sendReportByEmail(report, recipient);
        
        distribution.status = 'sent';
        distribution.sentAt = new Date();
        
        // In a real implementation, we'd track delivery and open status
        distribution.status = 'delivered';
        distribution.deliveredAt = new Date();
        
        console.log(`📧 [REPORTING-SERVICE] Sent report to ${recipient.email}`);
      } catch (error) {
        distribution.status = 'failed';
        distribution.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error sending report to ${recipient.email}:`, error);
      }
      
      distributions.push(distribution);
    }
    
    this.distributions.set(reportId, distributions);
  }

  private async sendReportByEmail(report: GeneratedReport, recipient: ReportRecipient): Promise<void> {
    // In a real implementation, this would use an email service
    console.log(`📧 [REPORTING-SERVICE] Sending report ${report.id} to ${recipient.email}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private initializeDefaultTemplates(): void {
    // Create default templates for each report type
    const defaultTemplates = [
      {
        name: 'Executive Summary',
        description: 'High-level summary for executives',
        reportType: 'comprehensive' as const,
        template: '<h1>{{title}}</h1><p>{{description}}</p>',
        sections: [
          {
            name: 'Summary',
            type: 'summary' as const,
            title: 'Executive Summary',
            description: 'High-level overview',
            required: true,
            order: 1,
            config: {}
          },
          {
            name: 'Key Metrics',
            type: 'chart' as const,
            title: 'Key Performance Indicators',
            description: 'Critical metrics',
            required: true,
            order: 2,
            config: {}
          }
        ],
        variables: {
          title: 'Analytics Report',
          description: 'Generated report'
        },
        createdBy: 'system'
      },
      {
        name: 'Technical Deep Dive',
        description: 'Detailed technical report for analysts',
        reportType: 'usage' as const,
        template: '<h1>{{title}}</h1><p>{{description}}</p>',
        sections: [
          {
            name: 'Usage Patterns',
            type: 'table' as const,
            title: 'Detailed Usage Analysis',
            description: 'Comprehensive usage data',
            required: true,
            order: 1,
            config: {}
          }
        ],
        variables: {
          title: 'Usage Analysis Report',
          description: 'Detailed usage patterns'
        },
        createdBy: 'system'
      }
    ];
    
    defaultTemplates.forEach(template => {
      this.createTemplate(template);
    });
  }

  private generateId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop the automated reporting service
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('🛑 [REPORTING-SERVICE] Automated reporting stopped');
    }
  }
}

// Export singleton instance
export const automatedReportingService = AutomatedReportingService.getInstance();

// Export utility functions
export async function createReportSchedule(data: {
  name: string;
  description: string;
  frequency: ReportSchedule['frequency'];
  recipients: Omit<ReportRecipient, 'id'>[];
  reportType: ReportSchedule['reportType'];
  timeRange: { days: number };
  format: ReportSchedule['format'];
  customFilters?: Record<string, any>;
  createdBy: string;
}): Promise<string> {
  return automatedReportingService.createSchedule(data);
}

export async function generateReport(
  reportType: ReportSchedule['reportType'],
  timeRange: { start: Date; end: Date },
  format?: ReportSchedule['format'],
  customFilters?: Record<string, any>
): Promise<string> {
  return automatedReportingService.generateReport(reportType, timeRange, format, customFilters);
}

export function getReportSchedules(): ReportSchedule[] {
  return automatedReportingService.getSchedules();
}

export function getGeneratedReports(limit?: number): GeneratedReport[] {
  return automatedReportingService.getReports(limit);
}