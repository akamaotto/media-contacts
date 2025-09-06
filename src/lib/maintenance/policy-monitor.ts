/**
 * Policy Change Detection and Monitoring System
 * Monitors outlet contact policies and media guidelines for changes
 */

export interface PolicySnapshot {
  id: string;
  outletId: string;
  outletName: string;
  url: string;
  capturedAt: Date;
  content: {
    rawText: string;
    structuredData: {
      contactMethods: string[];
      preferredContact: string;
      responseTime: string;
      pitchGuidelines: string[];
      restrictions: string[];
      emailFormat: string;
      subjects: string[];
      attachmentPolicy: string;
      followUpPolicy: string;
    };
  };
  hash: string; // Content hash for change detection
  metadata: {
    pageTitle: string;
    lastModified?: string;
    contentLength: number;
    language: string;
  };
}

export interface PolicyChange {
  id: string;
  outletId: string;
  changeType: 'addition' | 'removal' | 'modification' | 'restructure';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  field: string;
  oldValue: any;
  newValue: any;
  confidence: number;
  detectedAt: Date;
  description: string;
  impact: {
    affectedContacts: number;
    actionRequired: boolean;
    recommendations: string[];
  };
  status: 'new' | 'reviewed' | 'applied' | 'ignored';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface PolicyAlert {
  id: string;
  outletId: string;
  alertType: 'policy_change' | 'policy_removal' | 'new_policy' | 'access_blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  changes: PolicyChange[];
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Policy Monitor Class
 */
export class PolicyMonitor {
  private static instance: PolicyMonitor;
  private snapshots: Map<string, PolicySnapshot[]> = new Map(); // outletId -> snapshots
  private changes: Map<string, PolicyChange> = new Map();
  private alerts: Map<string, PolicyAlert> = new Map();

  static getInstance(): PolicyMonitor {
    if (!PolicyMonitor.instance) {
      PolicyMonitor.instance = new PolicyMonitor();
    }
    return PolicyMonitor.instance;
  }

  /**
   * Capture policy snapshot
   */
  async captureSnapshot(params: {
    outletId: string;
    outletName: string;
    url: string;
    content: string;
    metadata?: Partial<PolicySnapshot['metadata']>;
  }): Promise<string> {
    const snapshotId = this.generateId();
    
    // Extract structured data from content
    const structuredData = this.extractStructuredData(params.content);
    
    // Calculate content hash
    const hash = this.calculateHash(params.content);
    
    const snapshot: PolicySnapshot = {
      id: snapshotId,
      outletId: params.outletId,
      outletName: params.outletName,
      url: params.url,
      capturedAt: new Date(),
      content: {
        rawText: params.content,
        structuredData
      },
      hash,
      metadata: {
        pageTitle: '',
        contentLength: params.content.length,
        language: 'en',
        ...params.metadata
      }
    };

    // Store snapshot
    const outletSnapshots = this.snapshots.get(params.outletId) || [];
    outletSnapshots.push(snapshot);
    
    // Keep only last 10 snapshots per outlet
    if (outletSnapshots.length > 10) {
      outletSnapshots.splice(0, outletSnapshots.length - 10);
    }
    
    this.snapshots.set(params.outletId, outletSnapshots);

    // Detect changes if previous snapshot exists
    if (outletSnapshots.length > 1) {
      const previousSnapshot = outletSnapshots[outletSnapshots.length - 2];
      await this.detectChanges(previousSnapshot, snapshot);
    }

    return snapshotId;
  }

  /**
   * Detect changes between snapshots
   */
  private async detectChanges(
    oldSnapshot: PolicySnapshot,
    newSnapshot: PolicySnapshot
  ): Promise<PolicyChange[]> {
    const changes: PolicyChange[] = [];

    // Skip if content is identical
    if (oldSnapshot.hash === newSnapshot.hash) {
      return changes;
    }

    const oldData = oldSnapshot.content.structuredData;
    const newData = newSnapshot.content.structuredData;

    // Check each field for changes
    const fieldsToCheck: Array<keyof typeof oldData> = [
      'contactMethods',
      'preferredContact',
      'responseTime',
      'pitchGuidelines',
      'restrictions',
      'emailFormat',
      'subjects',
      'attachmentPolicy',
      'followUpPolicy'
    ];

    for (const field of fieldsToCheck) {
      const change = this.compareField(field, oldData[field], newData[field], newSnapshot);
      if (change) {
        changes.push(change);
        this.changes.set(change.id, change);
      }
    }

    // Create alert if significant changes detected
    if (changes.length > 0) {
      await this.createPolicyAlert(newSnapshot.outletId, changes);
    }

    return changes;
  }

  /**
   * Compare field values and create change record
   */
  private compareField(
    field: string,
    oldValue: any,
    newValue: any,
    snapshot: PolicySnapshot
  ): PolicyChange | null {
    // Convert to comparable format
    const oldStr = Array.isArray(oldValue) ? oldValue.join(', ') : String(oldValue || '');
    const newStr = Array.isArray(newValue) ? newValue.join(', ') : String(newValue || '');

    if (oldStr === newStr) return null;

    // Determine change type
    let changeType: PolicyChange['changeType'];
    if (!oldStr && newStr) changeType = 'addition';
    else if (oldStr && !newStr) changeType = 'removal';
    else changeType = 'modification';

    // Calculate severity
    const severity = this.calculateChangeSeverity(field, oldValue, newValue);
    
    // Calculate confidence (simple implementation)
    const confidence = 0.9; // Would use more sophisticated comparison in real implementation

    // Generate description
    const description = this.generateChangeDescription(field, changeType, oldValue, newValue);

    // Calculate impact
    const impact = this.calculateImpact(field, changeType, oldValue, newValue);

    return {
      id: this.generateId(),
      outletId: snapshot.outletId,
      changeType,
      severity,
      field,
      oldValue,
      newValue,
      confidence,
      detectedAt: snapshot.capturedAt,
      description,
      impact,
      status: 'new'
    };
  }

  /**
   * Calculate change severity
   */
  private calculateChangeSeverity(
    field: string,
    oldValue: any,
    newValue: any
  ): PolicyChange['severity'] {
    // Critical changes
    if (field === 'preferredContact' && oldValue === 'email' && newValue !== 'email') {
      return 'critical';
    }
    if (field === 'restrictions' && Array.isArray(newValue) && newValue.length > (Array.isArray(oldValue) ? oldValue.length : 0)) {
      return 'major';
    }

    // Major changes
    if (['contactMethods', 'emailFormat', 'attachmentPolicy'].includes(field)) {
      return 'major';
    }

    // Moderate changes
    if (['responseTime', 'pitchGuidelines', 'followUpPolicy'].includes(field)) {
      return 'moderate';
    }

    // Minor changes
    return 'minor';
  }

  /**
   * Generate change description
   */
  private generateChangeDescription(
    field: string,
    changeType: PolicyChange['changeType'],
    oldValue: any,
    newValue: any
  ): string {
    const fieldNames: Record<string, string> = {
      contactMethods: 'Contact Methods',
      preferredContact: 'Preferred Contact Method',
      responseTime: 'Response Time',
      pitchGuidelines: 'Pitch Guidelines',
      restrictions: 'Restrictions',
      emailFormat: 'Email Format',
      subjects: 'Subject Requirements',
      attachmentPolicy: 'Attachment Policy',
      followUpPolicy: 'Follow-up Policy'
    };

    const fieldName = fieldNames[field] || field;

    switch (changeType) {
      case 'addition':
        return `${fieldName} added: ${this.formatValue(newValue)}`;
      case 'removal':
        return `${fieldName} removed: ${this.formatValue(oldValue)}`;
      case 'modification':
        return `${fieldName} changed from "${this.formatValue(oldValue)}" to "${this.formatValue(newValue)}"`;
      case 'restructure':
        return `${fieldName} restructured`;
      default:
        return `${fieldName} updated`;
    }
  }

  /**
   * Calculate impact of change
   */
  private calculateImpact(
    field: string,
    changeType: PolicyChange['changeType'],
    oldValue: any,
    newValue: any
  ): PolicyChange['impact'] {
    const recommendations: string[] = [];
    let actionRequired = false;
    const affectedContacts = 0; // Would calculate from actual data

    switch (field) {
      case 'preferredContact':
        if (oldValue === 'email' && newValue !== 'email') {
          actionRequired = true;
          recommendations.push('Update outreach strategy to use new preferred contact method');
          recommendations.push('Review and update contact templates');
        }
        break;

      case 'emailFormat':
        actionRequired = true;
        recommendations.push('Update email templates to match new format requirements');
        recommendations.push('Review recent pitches for compliance');
        break;

      case 'restrictions':
        if (changeType === 'addition') {
          actionRequired = true;
          recommendations.push('Review current outreach practices against new restrictions');
          recommendations.push('Update pitch guidelines for this outlet');
        }
        break;

      case 'responseTime':
        recommendations.push('Adjust follow-up timing based on new response time expectations');
        break;

      case 'attachmentPolicy':
        if (changeType === 'removal' || (newValue && newValue.includes('no attachments'))) {
          actionRequired = true;
          recommendations.push('Remove attachments from future pitches to this outlet');
          recommendations.push('Update pitch templates to exclude attachments');
        }
        break;
    }

    return {
      affectedContacts,
      actionRequired,
      recommendations
    };
  }

  /**
   * Create policy alert
   */
  private async createPolicyAlert(
    outletId: string,
    changes: PolicyChange[]
  ): Promise<string> {
    const alertId = this.generateId();
    
    // Determine alert severity based on changes
    const maxSeverity = changes.reduce((max, change) => {
      const severityOrder = { minor: 1, moderate: 2, major: 3, critical: 4 };
      const changeSeverity = severityOrder[change.severity];
      const maxSeverity = severityOrder[max];
      return changeSeverity > maxSeverity ? change.severity : max;
    }, 'minor' as PolicyChange['severity']);

    const severityMap = {
      minor: 'low' as const,
      moderate: 'medium' as const,
      major: 'high' as const,
      critical: 'critical' as const
    };

    // Determine alert type
    let alertType: PolicyAlert['alertType'] = 'policy_change';
    if (changes.some(c => c.changeType === 'addition')) {
      alertType = 'new_policy';
    } else if (changes.some(c => c.changeType === 'removal')) {
      alertType = 'policy_removal';
    }

    const alert: PolicyAlert = {
      id: alertId,
      outletId,
      alertType,
      severity: severityMap[maxSeverity],
      title: `Policy changes detected for outlet`,
      message: `${changes.length} policy change(s) detected with ${maxSeverity} severity`,
      changes,
      createdAt: new Date(),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    return alertId;
  }

  /**
   * Extract structured data from policy content
   */
  private extractStructuredData(content: string): PolicySnapshot['content']['structuredData'] {
    // Simple extraction - in real implementation would use NLP/AI
    const lowerContent = content.toLowerCase();
    
    const contactMethods: string[] = [];
    if (lowerContent.includes('email')) contactMethods.push('email');
    if (lowerContent.includes('phone')) contactMethods.push('phone');
    if (lowerContent.includes('twitter') || lowerContent.includes('dm')) contactMethods.push('social');
    if (lowerContent.includes('form') || lowerContent.includes('contact form')) contactMethods.push('form');

    const preferredContact = contactMethods.includes('email') ? 'email' : contactMethods[0] || 'unknown';

    const responseTime = this.extractResponseTime(content);
    const pitchGuidelines = this.extractGuidelines(content);
    const restrictions = this.extractRestrictions(content);
    const emailFormat = this.extractEmailFormat(content);
    const subjects = this.extractSubjectRequirements(content);
    const attachmentPolicy = this.extractAttachmentPolicy(content);
    const followUpPolicy = this.extractFollowUpPolicy(content);

    return {
      contactMethods,
      preferredContact,
      responseTime,
      pitchGuidelines,
      restrictions,
      emailFormat,
      subjects,
      attachmentPolicy,
      followUpPolicy
    };
  }

  /**
   * Extract response time from content
   */
  private extractResponseTime(content: string): string {
    const patterns = [
      /respond within (\d+) (days?|hours?|weeks?)/i,
      /response time:?\s*(\d+)\s*(days?|hours?|weeks?)/i,
      /(\d+)\s*(day|hour|week) response/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return `${match[1]} ${match[2]}`;
      }
    }

    return 'not specified';
  }

  /**
   * Extract pitch guidelines
   */
  private extractGuidelines(content: string): string[] {
    const guidelines: string[] = [];
    
    // Look for common guideline patterns
    if (content.includes('exclusive')) guidelines.push('Exclusive stories preferred');
    if (content.includes('embargo')) guidelines.push('Respect embargos');
    if (content.includes('brief') || content.includes('concise')) guidelines.push('Keep pitches brief');
    if (content.includes('relevant')) guidelines.push('Ensure relevance to beat');
    if (content.includes('personalize')) guidelines.push('Personalize pitches');

    return guidelines;
  }

  /**
   * Extract restrictions
   */
  private extractRestrictions(content: string): string[] {
    const restrictions: string[] = [];
    
    if (content.includes('no press release')) restrictions.push('No press releases');
    if (content.includes('no cold pitch')) restrictions.push('No cold pitches');
    if (content.includes('no attachment')) restrictions.push('No attachments');
    if (content.includes('no follow')) restrictions.push('No follow-ups');
    if (content.includes('invitation only')) restrictions.push('Invitation only');

    return restrictions;
  }

  /**
   * Extract email format requirements
   */
  private extractEmailFormat(content: string): string {
    if (content.includes('plain text')) return 'Plain text only';
    if (content.includes('html')) return 'HTML allowed';
    if (content.includes('markdown')) return 'Markdown preferred';
    return 'No specific format';
  }

  /**
   * Extract subject requirements
   */
  private extractSubjectRequirements(content: string): string[] {
    const requirements: string[] = [];
    
    if (content.includes('PITCH:')) requirements.push('Use PITCH: prefix');
    if (content.includes('EXCLUSIVE:')) requirements.push('Use EXCLUSIVE: for exclusives');
    if (content.includes('company name')) requirements.push('Include company name');
    if (content.includes('beat') && content.includes('subject')) requirements.push('Include beat in subject');

    return requirements;
  }

  /**
   * Extract attachment policy
   */
  private extractAttachmentPolicy(content: string): string {
    if (content.includes('no attachment')) return 'No attachments allowed';
    if (content.includes('pdf only')) return 'PDF attachments only';
    if (content.includes('image')) return 'Images allowed';
    if (content.includes('link only')) return 'Links preferred over attachments';
    return 'Attachments allowed';
  }

  /**
   * Extract follow-up policy
   */
  private extractFollowUpPolicy(content: string): string {
    if (content.includes('no follow')) return 'No follow-ups';
    if (content.includes('one follow')) return 'One follow-up allowed';
    if (content.includes('week') && content.includes('follow')) return 'Follow-up after one week';
    return 'Follow-ups allowed';
  }

  /**
   * Calculate content hash
   */
  private calculateHash(content: string): string {
    // Simple hash implementation - would use crypto in real implementation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value || '');
  }

  /**
   * Get policy snapshots for outlet
   */
  getOutletSnapshots(outletId: string): PolicySnapshot[] {
    return this.snapshots.get(outletId) || [];
  }

  /**
   * Get policy changes
   */
  getPolicyChanges(filters: {
    outletId?: string;
    severity?: PolicyChange['severity'];
    status?: PolicyChange['status'];
    limit?: number;
    offset?: number;
  } = {}): PolicyChange[] {
    let changes = Array.from(this.changes.values());

    // Apply filters
    if (filters.outletId) {
      changes = changes.filter(c => c.outletId === filters.outletId);
    }
    if (filters.severity) {
      changes = changes.filter(c => c.severity === filters.severity);
    }
    if (filters.status) {
      changes = changes.filter(c => c.status === filters.status);
    }

    // Sort by detection time (newest first)
    changes.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return changes.slice(offset, offset + limit);
  }

  /**
   * Get policy alerts
   */
  getPolicyAlerts(filters: {
    outletId?: string;
    severity?: PolicyAlert['severity'];
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  } = {}): PolicyAlert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters.outletId) {
      alerts = alerts.filter(a => a.outletId === filters.outletId);
    }
    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
    }

    // Sort by creation time (newest first)
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return alerts.slice(offset, offset + limit);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.alerts.set(alertId, alert);
    return true;
  }

  /**
   * Update change status
   */
  async updateChangeStatus(
    changeId: string,
    status: PolicyChange['status'],
    reviewedBy?: string,
    notes?: string
  ): Promise<boolean> {
    const change = this.changes.get(changeId);
    if (!change) return false;

    change.status = status;
    if (reviewedBy) {
      change.reviewedBy = reviewedBy;
      change.reviewedAt = new Date();
    }
    if (notes) {
      change.notes = notes;
    }

    this.changes.set(changeId, change);
    return true;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    totalSnapshots: number;
    outletsCovered: number;
    totalChanges: number;
    changesBySeverity: Record<string, number>;
    changesByStatus: Record<string, number>;
    unacknowledgedAlerts: number;
    alertsBySeverity: Record<string, number>;
  } {
    const allSnapshots = Array.from(this.snapshots.values()).flat();
    const allChanges = Array.from(this.changes.values());
    const allAlerts = Array.from(this.alerts.values());

    const changesBySeverity = allChanges.reduce((acc, change) => {
      acc[change.severity] = (acc[change.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const changesByStatus = allChanges.reduce((acc, change) => {
      acc[change.status] = (acc[change.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySeverity = allAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const unacknowledgedAlerts = allAlerts.filter(a => !a.acknowledged).length;

    return {
      totalSnapshots: allSnapshots.length,
      outletsCovered: this.snapshots.size,
      totalChanges: allChanges.length,
      changesBySeverity,
      changesByStatus,
      unacknowledgedAlerts,
      alertsBySeverity
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const policyMonitor = PolicyMonitor.getInstance();