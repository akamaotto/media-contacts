/**
 * Watchlist Management System
 * Monitors contacts and outlets for changes, moves, and policy updates
 */

export interface WatchlistEntry {
  id: string;
  type: 'contact' | 'outlet' | 'domain';
  targetId: string;
  name: string;
  monitoringLevel: 'basic' | 'standard' | 'intensive';
  watchTypes: WatchType[];
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  lastChecked?: Date;
  nextCheck: Date;
  alerts: WatchAlert[];
  metadata: {
    addedBy: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export type WatchType = 
  | 'contact_move'      // Contact changed outlets
  | 'role_change'       // Contact changed roles
  | 'email_change'      // Email address changed
  | 'outlet_policy'     // Outlet contact policy changed
  | 'outlet_structure'  // Outlet staff structure changed
  | 'domain_change'     // Domain/website changes
  | 'social_change'     // Social media profile changes
  | 'beat_change'       // Beat/coverage area changes
  | 'availability'      // Contact availability changes
  | 'response_pattern'; // Response pattern changes

export interface WatchAlert {
  id: string;
  watchlistId: string;
  type: WatchType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  detectedAt: Date;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    confidence: number;
  }[];
  actionRequired: boolean;
  status: 'new' | 'acknowledged' | 'resolved' | 'false_positive';
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

export interface MonitoringConfig {
  contact: {
    checkFrequency: number; // hours
    sources: string[];
    thresholds: {
      moveConfidence: number;
      changeConfidence: number;
    };
  };
  outlet: {
    checkFrequency: number;
    sources: string[];
    thresholds: {
      policyChangeConfidence: number;
      structureChangeConfidence: number;
    };
  };
  domain: {
    checkFrequency: number;
    sources: string[];
    thresholds: {
      changeConfidence: number;
    };
  };
}

/**
 * Watchlist Manager Class
 */
export class WatchlistManager {
  private static instance: WatchlistManager;
  private watchlist: Map<string, WatchlistEntry> = new Map();
  private alerts: Map<string, WatchAlert> = new Map();
  private config: MonitoringConfig = {
    contact: {
      checkFrequency: 24, // Daily
      sources: ['linkedin', 'twitter', 'company_website', 'bylines'],
      thresholds: {
        moveConfidence: 0.8,
        changeConfidence: 0.7
      }
    },
    outlet: {
      checkFrequency: 168, // Weekly
      sources: ['website', 'about_page', 'contact_page', 'staff_directory'],
      thresholds: {
        policyChangeConfidence: 0.8,
        structureChangeConfidence: 0.7
      }
    },
    domain: {
      checkFrequency: 24, // Daily
      sources: ['whois', 'dns', 'website_structure'],
      thresholds: {
        changeConfidence: 0.9
      }
    }
  };

  static getInstance(): WatchlistManager {
    if (!WatchlistManager.instance) {
      WatchlistManager.instance = new WatchlistManager();
    }
    return WatchlistManager.instance;
  }

  /**
   * Add entry to watchlist
   */
  async addToWatchlist(entry: Omit<WatchlistEntry, 'id' | 'alerts' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const watchlistId = this.generateId();
    
    const watchlistEntry: WatchlistEntry = {
      ...entry,
      id: watchlistId,
      alerts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.watchlist.set(watchlistId, watchlistEntry);

    // Schedule initial check
    if (watchlistEntry.isActive) {
      await this.scheduleCheck(watchlistEntry);
    }

    return watchlistId;
  }

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(watchlistId: string): Promise<boolean> {
    return this.watchlist.delete(watchlistId);
  }

  /**
   * Update watchlist entry
   */
  async updateWatchlistEntry(
    watchlistId: string, 
    updates: Partial<WatchlistEntry>
  ): Promise<boolean> {
    const entry = this.watchlist.get(watchlistId);
    if (!entry) return false;

    Object.assign(entry, updates, { updatedAt: new Date() });
    this.watchlist.set(watchlistId, entry);

    return true;
  }

  /**
   * Get watchlist entries
   */
  getWatchlistEntries(filters: {
    type?: WatchlistEntry['type'];
    isActive?: boolean;
    priority?: string;
    watchTypes?: WatchType[];
    limit?: number;
    offset?: number;
  } = {}): WatchlistEntry[] {
    let entries = Array.from(this.watchlist.values());

    // Apply filters
    if (filters.type) {
      entries = entries.filter(e => e.type === filters.type);
    }
    if (filters.isActive !== undefined) {
      entries = entries.filter(e => e.isActive === filters.isActive);
    }
    if (filters.priority) {
      entries = entries.filter(e => e.metadata.priority === filters.priority);
    }
    if (filters.watchTypes) {
      entries = entries.filter(e => 
        filters.watchTypes!.some(type => e.watchTypes.includes(type))
      );
    }

    // Sort by priority and next check time
    entries.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.metadata.priority];
      const bPriority = priorityOrder[b.metadata.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.nextCheck.getTime() - b.nextCheck.getTime();
    });

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return entries.slice(offset, offset + limit);
  }

  /**
   * Get entries due for checking
   */
  getEntriesDueForCheck(): WatchlistEntry[] {
    const now = new Date();
    return Array.from(this.watchlist.values())
      .filter(entry => entry.isActive && entry.nextCheck <= now)
      .sort((a, b) => a.nextCheck.getTime() - b.nextCheck.getTime());
  }

  /**
   * Perform monitoring check
   */
  async performCheck(watchlistId: string): Promise<WatchAlert[]> {
    const entry = this.watchlist.get(watchlistId);
    if (!entry || !entry.isActive) return [];

    const alerts: WatchAlert[] = [];

    try {
      // Update last checked time
      entry.lastChecked = new Date();
      entry.nextCheck = this.calculateNextCheck(entry);

      // Perform checks based on type and watch types
      switch (entry.type) {
        case 'contact':
          alerts.push(...await this.checkContact(entry));
          break;
        case 'outlet':
          alerts.push(...await this.checkOutlet(entry));
          break;
        case 'domain':
          alerts.push(...await this.checkDomain(entry));
          break;
      }

      // Store alerts
      for (const alert of alerts) {
        this.alerts.set(alert.id, alert);
        entry.alerts.push(alert);
      }

      entry.updatedAt = new Date();
      this.watchlist.set(watchlistId, entry);

    } catch (error) {
      console.error(`Watchlist check failed for ${watchlistId}:`, error);
    }

    return alerts;
  }

  /**
   * Check contact for changes
   */
  private async checkContact(entry: WatchlistEntry): Promise<WatchAlert[]> {
    const alerts: WatchAlert[] = [];

    // Mock implementation - in real system, would check various sources
    for (const watchType of entry.watchTypes) {
      switch (watchType) {
        case 'contact_move':
          // Check if contact moved to different outlet
          const moveAlert = await this.detectContactMove(entry);
          if (moveAlert) alerts.push(moveAlert);
          break;

        case 'role_change':
          // Check if contact's role changed
          const roleAlert = await this.detectRoleChange(entry);
          if (roleAlert) alerts.push(roleAlert);
          break;

        case 'email_change':
          // Check if email address changed
          const emailAlert = await this.detectEmailChange(entry);
          if (emailAlert) alerts.push(emailAlert);
          break;

        case 'social_change':
          // Check social media profiles
          const socialAlert = await this.detectSocialChange(entry);
          if (socialAlert) alerts.push(socialAlert);
          break;

        case 'beat_change':
          // Check if coverage beats changed
          const beatAlert = await this.detectBeatChange(entry);
          if (beatAlert) alerts.push(beatAlert);
          break;
      }
    }

    return alerts;
  }

  /**
   * Check outlet for changes
   */
  private async checkOutlet(entry: WatchlistEntry): Promise<WatchAlert[]> {
    const alerts: WatchAlert[] = [];

    for (const watchType of entry.watchTypes) {
      switch (watchType) {
        case 'outlet_policy':
          const policyAlert = await this.detectPolicyChange(entry);
          if (policyAlert) alerts.push(policyAlert);
          break;

        case 'outlet_structure':
          const structureAlert = await this.detectStructureChange(entry);
          if (structureAlert) alerts.push(structureAlert);
          break;
      }
    }

    return alerts;
  }

  /**
   * Check domain for changes
   */
  private async checkDomain(entry: WatchlistEntry): Promise<WatchAlert[]> {
    const alerts: WatchAlert[] = [];

    for (const watchType of entry.watchTypes) {
      switch (watchType) {
        case 'domain_change':
          const domainAlert = await this.detectDomainChange(entry);
          if (domainAlert) alerts.push(domainAlert);
          break;
      }
    }

    return alerts;
  }

  /**
   * Mock detection methods (would be implemented with real data sources)
   */
  private async detectContactMove(entry: WatchlistEntry): Promise<WatchAlert | null> {
    // Mock: randomly detect moves for demonstration
    if (Math.random() < 0.05) { // 5% chance
      return this.createAlert(entry, 'contact_move', 'warning', 
        'Contact may have moved outlets',
        'Detected potential outlet change based on recent bylines',
        [{ field: 'outlet', oldValue: 'TechCrunch', newValue: 'The Verge', confidence: 0.85 }]
      );
    }
    return null;
  }

  private async detectRoleChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.03) { // 3% chance
      return this.createAlert(entry, 'role_change', 'info',
        'Contact role may have changed',
        'LinkedIn profile shows updated job title',
        [{ field: 'role', oldValue: 'Reporter', newValue: 'Senior Reporter', confidence: 0.9 }]
      );
    }
    return null;
  }

  private async detectEmailChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.02) { // 2% chance
      return this.createAlert(entry, 'email_change', 'critical',
        'Contact email may have changed',
        'Email bounces suggest address is no longer valid',
        [{ field: 'email', oldValue: 'old@example.com', newValue: 'new@example.com', confidence: 0.8 }]
      );
    }
    return null;
  }

  private async detectSocialChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.1) { // 10% chance
      return this.createAlert(entry, 'social_change', 'info',
        'Social media profile updated',
        'Twitter bio or LinkedIn profile has been updated',
        [{ field: 'twitter_bio', oldValue: 'Tech Reporter', newValue: 'Senior Tech Reporter at XYZ', confidence: 0.95 }]
      );
    }
    return null;
  }

  private async detectBeatChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.04) { // 4% chance
      return this.createAlert(entry, 'beat_change', 'info',
        'Coverage beats may have changed',
        'Recent articles suggest shift in coverage focus',
        [{ field: 'beats', oldValue: ['AI', 'Startups'], newValue: ['AI', 'Crypto', 'Web3'], confidence: 0.75 }]
      );
    }
    return null;
  }

  private async detectPolicyChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.02) { // 2% chance
      return this.createAlert(entry, 'outlet_policy', 'warning',
        'Outlet contact policy may have changed',
        'Contact page shows updated media guidelines',
        [{ field: 'contact_policy', oldValue: 'Email preferred', newValue: 'Press releases only', confidence: 0.9 }]
      );
    }
    return null;
  }

  private async detectStructureChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.03) { // 3% chance
      return this.createAlert(entry, 'outlet_structure', 'info',
        'Outlet staff structure changed',
        'New staff members detected on about page',
        [{ field: 'staff_count', oldValue: 15, newValue: 18, confidence: 0.85 }]
      );
    }
    return null;
  }

  private async detectDomainChange(entry: WatchlistEntry): Promise<WatchAlert | null> {
    if (Math.random() < 0.01) { // 1% chance
      return this.createAlert(entry, 'domain_change', 'critical',
        'Domain configuration changed',
        'DNS records or WHOIS information has been updated',
        [{ field: 'dns_mx', oldValue: 'mail.example.com', newValue: 'mail.newprovider.com', confidence: 1.0 }]
      );
    }
    return null;
  }

  /**
   * Create alert
   */
  private createAlert(
    entry: WatchlistEntry,
    type: WatchType,
    severity: WatchAlert['severity'],
    title: string,
    description: string,
    changes: WatchAlert['changes']
  ): WatchAlert {
    return {
      id: this.generateId(),
      watchlistId: entry.id,
      type,
      severity,
      title,
      description,
      detectedAt: new Date(),
      changes,
      actionRequired: severity === 'critical' || severity === 'warning',
      status: 'new'
    };
  }

  /**
   * Calculate next check time
   */
  private calculateNextCheck(entry: WatchlistEntry): Date {
    const now = new Date();
    const baseFrequency = this.config[entry.type].checkFrequency;
    
    // Adjust frequency based on monitoring level
    let frequency = baseFrequency;
    switch (entry.monitoringLevel) {
      case 'intensive':
        frequency = Math.floor(baseFrequency / 2);
        break;
      case 'basic':
        frequency = baseFrequency * 2;
        break;
    }

    // Adjust based on priority
    switch (entry.metadata.priority) {
      case 'high':
        frequency = Math.floor(frequency * 0.8);
        break;
      case 'low':
        frequency = Math.floor(frequency * 1.5);
        break;
    }

    return new Date(now.getTime() + frequency * 60 * 60 * 1000);
  }

  /**
   * Schedule check for entry
   */
  private async scheduleCheck(entry: WatchlistEntry): Promise<void> {
    // In a real implementation, this would schedule with a job queue
    console.log(`Scheduled check for ${entry.name} at ${entry.nextCheck.toISOString()}`);
  }

  /**
   * Get alerts
   */
  getAlerts(filters: {
    watchlistId?: string;
    type?: WatchType;
    severity?: WatchAlert['severity'];
    status?: WatchAlert['status'];
    limit?: number;
    offset?: number;
  } = {}): WatchAlert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters.watchlistId) {
      alerts = alerts.filter(a => a.watchlistId === filters.watchlistId);
    }
    if (filters.type) {
      alerts = alerts.filter(a => a.type === filters.type);
    }
    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }

    // Sort by detection time (newest first)
    alerts.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    return alerts.slice(offset, offset + limit);
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: WatchAlert['status'],
    resolvedBy?: string,
    notes?: string
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = status;
    if (status === 'resolved' || status === 'false_positive') {
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
    }
    if (notes) {
      alert.notes = notes;
    }

    this.alerts.set(alertId, alert);
    return true;
  }

  /**
   * Get watchlist statistics
   */
  getWatchlistStats(): {
    totalEntries: number;
    activeEntries: number;
    entriesByType: Record<string, number>;
    entriesByPriority: Record<string, number>;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    pendingAlerts: number;
  } {
    const entries = Array.from(this.watchlist.values());
    const alerts = Array.from(this.alerts.values());

    const entriesByType = entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const entriesByPriority = entries.reduce((acc, entry) => {
      acc[entry.metadata.priority] = (acc[entry.metadata.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pendingAlerts = alerts.filter(a => a.status === 'new').length;

    return {
      totalEntries: entries.length,
      activeEntries: entries.filter(e => e.isActive).length,
      entriesByType,
      entriesByPriority,
      alertsByType,
      alertsBySeverity,
      pendingAlerts
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const watchlistManager = WatchlistManager.getInstance();