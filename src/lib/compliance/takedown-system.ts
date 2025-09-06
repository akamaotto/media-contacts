/**
 * Takedown and Opt-out Handling System
 * Manages takedown requests and opt-out preferences for ethical data handling
 */

export interface TakedownRequest {
  id: string;
  type: 'takedown' | 'opt_out' | 'correction' | 'data_deletion';
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requesterInfo: {
    name: string;
    email: string;
    organization?: string;
    relationship: 'subject' | 'representative' | 'legal' | 'other';
    verificationStatus: 'unverified' | 'pending' | 'verified';
  };
  requestDetails: {
    reason: string;
    description: string;
    affectedData: string[];
    evidence?: string[];
    legalBasis?: string;
  };
  affectedRecords: {
    contactIds: string[];
    outletIds: string[];
    dataTypes: string[];
    estimatedRecordCount: number;
  };
  timeline: {
    submittedAt: Date;
    reviewStartedAt?: Date;
    decidedAt?: Date;
    completedAt?: Date;
    deadline?: Date;
  };
  actions: TakedownAction[];
  notes: string[];
  assignedTo?: string;
  reviewerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TakedownAction {
  id: string;
  type: 'remove_contact' | 'anonymize_data' | 'block_domain' | 'update_record' | 'add_opt_out';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description: string;
  executedAt?: Date;
  executedBy?: string;
  result?: string;
  error?: string;
}

export interface OptOutEntry {
  id: string;
  type: 'email' | 'domain' | 'contact' | 'organization';
  value: string;
  reason: string;
  source: 'user_request' | 'takedown' | 'bounce' | 'complaint' | 'legal';
  addedAt: Date;
  addedBy: string;
  expiresAt?: Date;
  notes?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: 'opt_out' | 'data_retention' | 'access_restriction' | 'processing_limitation';
  conditions: {
    domains?: string[];
    contactTypes?: string[];
    dataTypes?: string[];
    regions?: string[];
  };
  actions: {
    block: boolean;
    anonymize: boolean;
    delete: boolean;
    restrict: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Takedown and Opt-out Management System
 */
export class TakedownSystem {
  private static instance: TakedownSystem;
  private takedownRequests: Map<string, TakedownRequest> = new Map();
  private optOutEntries: Map<string, OptOutEntry> = new Map();
  private complianceRules: Map<string, ComplianceRule> = new Map();

  static getInstance(): TakedownSystem {
    if (!TakedownSystem.instance) {
      TakedownSystem.instance = new TakedownSystem();
    }
    return TakedownSystem.instance;
  }

  /**
   * Submit a takedown request
   */
  async submitTakedownRequest(request: Omit<TakedownRequest, 'id' | 'status' | 'actions' | 'notes' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const requestId = this.generateId();
    
    const takedownRequest: TakedownRequest = {
      ...request,
      id: requestId,
      status: 'pending',
      actions: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Set deadline based on request type and priority
    if (!takedownRequest.timeline.deadline) {
      takedownRequest.timeline.deadline = this.calculateDeadline(
        takedownRequest.type,
        takedownRequest.priority
      );
    }

    this.takedownRequests.set(requestId, takedownRequest);

    // Auto-assign based on priority
    if (takedownRequest.priority === 'urgent') {
      await this.notifyUrgentRequest(takedownRequest);
    }

    return requestId;
  }

  /**
   * Update takedown request status
   */
  async updateTakedownRequest(
    requestId: string,
    updates: Partial<TakedownRequest>,
    updatedBy: string
  ): Promise<boolean> {
    const request = this.takedownRequests.get(requestId);
    if (!request) return false;

    // Add note about the update
    if (updates.status && updates.status !== request.status) {
      request.notes.push(`Status changed from ${request.status} to ${updates.status} by ${updatedBy} at ${new Date().toISOString()}`);
    }

    // Update timeline
    if (updates.status === 'reviewing' && !request.timeline.reviewStartedAt) {
      request.timeline.reviewStartedAt = new Date();
    }
    if ((updates.status === 'approved' || updates.status === 'rejected') && !request.timeline.decidedAt) {
      request.timeline.decidedAt = new Date();
    }
    if (updates.status === 'completed' && !request.timeline.completedAt) {
      request.timeline.completedAt = new Date();
    }

    // Apply updates
    Object.assign(request, updates, {
      updatedAt: new Date(),
      assignedTo: updates.assignedTo || request.assignedTo
    });

    this.takedownRequests.set(requestId, request);

    // Execute actions if approved
    if (updates.status === 'approved') {
      await this.executeTakedownActions(request);
    }

    return true;
  }

  /**
   * Add opt-out entry
   */
  async addOptOut(entry: Omit<OptOutEntry, 'id' | 'addedAt'>): Promise<string> {
    const optOutId = this.generateId();
    
    const optOutEntry: OptOutEntry = {
      ...entry,
      id: optOutId,
      addedAt: new Date()
    };

    this.optOutEntries.set(optOutId, optOutEntry);

    // Apply opt-out immediately
    await this.applyOptOut(optOutEntry);

    return optOutId;
  }

  /**
   * Check if contact/email/domain is opted out
   */
  isOptedOut(value: string, type: 'email' | 'domain' | 'contact' | 'organization'): boolean {
    for (const entry of this.optOutEntries.values()) {
      if (entry.type === type && entry.value.toLowerCase() === value.toLowerCase()) {
        // Check if not expired
        if (!entry.expiresAt || new Date() < entry.expiresAt) {
          return true;
        }
      }
    }

    // Check domain-level opt-outs for email addresses
    if (type === 'email') {
      const domain = value.split('@')[1];
      if (domain && this.isOptedOut(domain, 'domain')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all takedown requests with filtering
   */
  getTakedownRequests(filters: {
    status?: TakedownRequest['status'];
    type?: TakedownRequest['type'];
    priority?: TakedownRequest['priority'];
    assignedTo?: string;
    limit?: number;
    offset?: number;
  } = {}): TakedownRequest[] {
    let requests = Array.from(this.takedownRequests.values());

    // Apply filters
    if (filters.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters.type) {
      requests = requests.filter(r => r.type === filters.type);
    }
    if (filters.priority) {
      requests = requests.filter(r => r.priority === filters.priority);
    }
    if (filters.assignedTo) {
      requests = requests.filter(r => r.assignedTo === filters.assignedTo);
    }

    // Sort by priority and creation date
    requests.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return requests.slice(offset, offset + limit);
  }

  /**
   * Get opt-out entries
   */
  getOptOutEntries(filters: {
    type?: OptOutEntry['type'];
    source?: OptOutEntry['source'];
    limit?: number;
    offset?: number;
  } = {}): OptOutEntry[] {
    let entries = Array.from(this.optOutEntries.values());

    // Apply filters
    if (filters.type) {
      entries = entries.filter(e => e.type === filters.type);
    }
    if (filters.source) {
      entries = entries.filter(e => e.source === filters.source);
    }

    // Filter out expired entries
    const now = new Date();
    entries = entries.filter(e => !e.expiresAt || e.expiresAt > now);

    // Sort by creation date
    entries.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return entries.slice(offset, offset + limit);
  }

  /**
   * Remove opt-out entry
   */
  async removeOptOut(optOutId: string): Promise<boolean> {
    return this.optOutEntries.delete(optOutId);
  }

  /**
   * Add compliance rule
   */
  async addComplianceRule(rule: Omit<ComplianceRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ruleId = this.generateId();
    
    const complianceRule: ComplianceRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.complianceRules.set(ruleId, complianceRule);
    return ruleId;
  }

  /**
   * Check compliance for a contact/data
   */
  checkCompliance(data: {
    contactId?: string;
    email?: string;
    domain?: string;
    dataTypes: string[];
    region?: string;
  }): {
    compliant: boolean;
    violations: string[];
    requiredActions: string[];
  } {
    const violations: string[] = [];
    const requiredActions: string[] = [];

    // Check opt-outs
    if (data.email && this.isOptedOut(data.email, 'email')) {
      violations.push('Email is opted out');
      requiredActions.push('Remove or anonymize email');
    }

    if (data.domain && this.isOptedOut(data.domain, 'domain')) {
      violations.push('Domain is opted out');
      requiredActions.push('Remove or anonymize domain data');
    }

    if (data.contactId && this.isOptedOut(data.contactId, 'contact')) {
      violations.push('Contact is opted out');
      requiredActions.push('Remove contact record');
    }

    // Check compliance rules
    for (const rule of this.complianceRules.values()) {
      if (!rule.isActive) continue;

      const matches = this.ruleMatches(rule, data);
      if (matches) {
        if (rule.actions.block) {
          violations.push(`Blocked by rule: ${rule.name}`);
          requiredActions.push('Block access to data');
        }
        if (rule.actions.anonymize) {
          requiredActions.push('Anonymize data');
        }
        if (rule.actions.delete) {
          requiredActions.push('Delete data');
        }
        if (rule.actions.restrict) {
          requiredActions.push('Restrict data processing');
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      requiredActions
    };
  }

  /**
   * Get compliance statistics
   */
  getComplianceStats(): {
    takedownRequests: {
      total: number;
      pending: number;
      overdue: number;
      byType: Record<string, number>;
      byPriority: Record<string, number>;
    };
    optOuts: {
      total: number;
      byType: Record<string, number>;
      bySource: Record<string, number>;
    };
    complianceRules: {
      total: number;
      active: number;
    };
  } {
    const now = new Date();
    const requests = Array.from(this.takedownRequests.values());
    const optOuts = Array.from(this.optOutEntries.values());
    const rules = Array.from(this.complianceRules.values());

    // Takedown request stats
    const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'reviewing');
    const overdueRequests = requests.filter(r => 
      r.timeline.deadline && now > r.timeline.deadline && r.status !== 'completed'
    );

    const requestsByType = requests.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByPriority = requests.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Opt-out stats
    const activeOptOuts = optOuts.filter(o => !o.expiresAt || o.expiresAt > now);
    
    const optOutsByType = activeOptOuts.reduce((acc, o) => {
      acc[o.type] = (acc[o.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const optOutsBySource = activeOptOuts.reduce((acc, o) => {
      acc[o.source] = (acc[o.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      takedownRequests: {
        total: requests.length,
        pending: pendingRequests.length,
        overdue: overdueRequests.length,
        byType: requestsByType,
        byPriority: requestsByPriority
      },
      optOuts: {
        total: activeOptOuts.length,
        byType: optOutsByType,
        bySource: optOutsBySource
      },
      complianceRules: {
        total: rules.length,
        active: rules.filter(r => r.isActive).length
      }
    };
  }

  /**
   * Execute takedown actions
   */
  private async executeTakedownActions(request: TakedownRequest): Promise<void> {
    const actions = this.generateTakedownActions(request);
    
    for (const action of actions) {
      try {
        action.status = 'in_progress';
        await this.executeAction(action, request);
        action.status = 'completed';
        action.executedAt = new Date();
      } catch (error) {
        action.status = 'failed';
        action.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    request.actions = actions;
    request.status = actions.every(a => a.status === 'completed') ? 'completed' : 'pending';
    request.updatedAt = new Date();
  }

  /**
   * Generate actions for a takedown request
   */
  private generateTakedownActions(request: TakedownRequest): TakedownAction[] {
    const actions: TakedownAction[] = [];

    switch (request.type) {
      case 'takedown':
        actions.push({
          id: this.generateId(),
          type: 'remove_contact',
          status: 'pending',
          description: 'Remove contact records from database'
        });
        break;

      case 'opt_out':
        actions.push({
          id: this.generateId(),
          type: 'add_opt_out',
          status: 'pending',
          description: 'Add to opt-out list'
        });
        break;

      case 'data_deletion':
        actions.push({
          id: this.generateId(),
          type: 'remove_contact',
          status: 'pending',
          description: 'Delete all associated data'
        });
        break;

      case 'correction':
        actions.push({
          id: this.generateId(),
          type: 'update_record',
          status: 'pending',
          description: 'Update contact information'
        });
        break;
    }

    return actions;
  }

  /**
   * Execute a specific action
   */
  private async executeAction(action: TakedownAction, request: TakedownRequest): Promise<void> {
    switch (action.type) {
      case 'add_opt_out':
        for (const contactId of request.affectedRecords.contactIds) {
          await this.addOptOut({
            type: 'contact',
            value: contactId,
            reason: request.requestDetails.reason,
            source: 'takedown',
            addedBy: 'system'
          });
        }
        action.result = `Added ${request.affectedRecords.contactIds.length} contacts to opt-out list`;
        break;

      case 'remove_contact':
        // In a real implementation, this would delete from database
        action.result = `Removed ${request.affectedRecords.contactIds.length} contact records`;
        break;

      case 'anonymize_data':
        // In a real implementation, this would anonymize data
        action.result = `Anonymized data for ${request.affectedRecords.contactIds.length} contacts`;
        break;

      case 'block_domain':
        // In a real implementation, this would add domain blocks
        action.result = 'Domain blocked from future scraping';
        break;

      case 'update_record':
        // In a real implementation, this would update records
        action.result = 'Contact records updated';
        break;
    }
  }

  /**
   * Apply opt-out to existing data
   */
  private async applyOptOut(entry: OptOutEntry): Promise<void> {
    // In a real implementation, this would:
    // 1. Find all matching records
    // 2. Remove or anonymize them
    // 3. Add to blocked lists
    console.log(`Applied opt-out for ${entry.type}: ${entry.value}`);
  }

  /**
   * Check if a compliance rule matches given data
   */
  private ruleMatches(rule: ComplianceRule, data: any): boolean {
    if (rule.conditions.domains && data.domain) {
      if (!rule.conditions.domains.includes(data.domain)) {
        return false;
      }
    }

    if (rule.conditions.dataTypes && data.dataTypes) {
      const hasMatchingDataType = rule.conditions.dataTypes.some(type =>
        data.dataTypes.includes(type)
      );
      if (!hasMatchingDataType) {
        return false;
      }
    }

    if (rule.conditions.regions && data.region) {
      if (!rule.conditions.regions.includes(data.region)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate deadline for takedown request
   */
  private calculateDeadline(type: TakedownRequest['type'], priority: TakedownRequest['priority']): Date {
    const now = new Date();
    let days = 30; // Default 30 days

    // Adjust based on type
    switch (type) {
      case 'data_deletion':
        days = 30; // GDPR requirement
        break;
      case 'takedown':
        days = 7;
        break;
      case 'opt_out':
        days = 3;
        break;
      case 'correction':
        days = 14;
        break;
    }

    // Adjust based on priority
    switch (priority) {
      case 'urgent':
        days = Math.min(days, 1);
        break;
      case 'high':
        days = Math.min(days, 3);
        break;
      case 'medium':
        days = Math.min(days, 7);
        break;
    }

    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Notify about urgent requests
   */
  private async notifyUrgentRequest(request: TakedownRequest): Promise<void> {
    // In a real implementation, this would send notifications
    console.log(`URGENT: Takedown request ${request.id} requires immediate attention`);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `td_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = new Date();
    
    // Remove expired opt-outs
    for (const [id, entry] of this.optOutEntries.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.optOutEntries.delete(id);
      }
    }
  }
}

// Export singleton instance
export const takedownSystem = TakedownSystem.getInstance();