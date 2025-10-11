/**
 * Monitoring System Integration Tests
 * Tests the integration between all monitoring components
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import all monitoring systems
import { aiSearchMonitor } from '../ai-search-monitor';
import { alertManager } from '../alert-manager';
import { alertConfigManager } from '../alert-config';
import { alertNotifier } from '../alert-notifier';
import { monitoringDashboard } from '../monitoring-dashboard';
import { databaseMonitor } from '../database-monitor';
import { aiServiceMonitor } from '../ai-service-monitor';
import { systemResourceMonitor } from '../system-resource-monitor';
import { userExperienceMonitor } from '../user-experience-monitor';
import { businessMetricsMonitor } from '../business-metrics-monitor';
import { automatedAlertSystem } from '../automated-alert-system';

// Mock external dependencies
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn()
  }))
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => '{}'),
  writeFileSync: jest.fn()
}));

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    // Mock different command outputs
    if (cmd.includes('nproc')) {
      callback(null, { stdout: '4\n' });
    } else if (cmd.includes('uptime')) {
      callback(null, { stdout: '10:30:00 up 2 days,  3:15,  1 user,  load average: 0.5, 0.3, 0.2\n' });
    } else {
      callback(null, { stdout: '' });
    }
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Monitoring System Integration Tests', () => {
  beforeEach(() => {
    // Reset all monitoring systems before each test
    aiSearchMonitor.reset();
    alertManager.reset();
    databaseMonitor.reset();
    aiServiceMonitor.reset();
    systemResourceMonitor.reset();
    userExperienceMonitor.reset();
    businessMetricsMonitor.reset();
    automatedAlertSystem.reset();
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  describe('AI Search Monitor Integration', () => {
    it('should record search and trigger alerts when thresholds are exceeded', async () => {
      // Record a search with high latency
      aiSearchMonitor.recordSearch({
        latency: 15000, // 15 seconds (exceeds threshold)
        success: true,
        provider: 'openai',
        resultCount: 5,
        cost: 0.05,
        userId: 'test-user',
        error: undefined,
        relevanceScore: 0.8
      });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that alert was triggered
      const alerts = aiSearchMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.metric === 'search_latency')).toBe(true);
    });

    it('should update metrics correctly', async () => {
      // Record multiple searches
      for (let i = 0; i < 5; i++) {
        aiSearchMonitor.recordSearch({
          latency: 1000,
          success: true,
          provider: 'openai',
          resultCount: 10,
          cost: 0.02,
          userId: 'test-user',
          error: undefined,
          relevanceScore: 0.9
        });
      }

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check metrics
      const metrics = aiSearchMonitor.getMetrics();
      expect(metrics.totalSearches).toBe(5);
      expect(metrics.searchSuccessRate).toBe(100);
      expect(metrics.averageResultsPerSearch).toBe(10);
    });
  });

  describe('Database Monitor Integration', () => {
    it('should detect high memory usage and trigger alerts', async () => {
      // Mock database query to return high memory usage
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query = jest.fn().mockImplementation((query) => {
        if (query.includes('MemTotal')) {
          return Promise.resolve({ rows: [{ memtotal: '8000000 kB' }] });
        } else if (query.includes('MemAvailable')) {
          return Promise.resolve({ rows: [{ memavailable: '1000000 kB' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that alert was triggered
      const alerts = databaseMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.metric === 'memory_usage')).toBe(true);
    });

    it('should update connection metrics', async () => {
      // Mock database query to return connection info
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query = jest.fn().mockImplementation((query) => {
        if (query.includes('pg_stat_activity')) {
          return Promise.resolve({ rows: [
            { state: 'active' },
            { state: 'active' },
            { state: 'idle' },
            { state: 'idle' },
            { state: 'idle' }
          ] });
        } else if (query.includes('max_connections')) {
          return Promise.resolve({ rows: [{ setting: '100' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check metrics
      const metrics = databaseMonitor.getMetrics();
      expect(metrics.connections.active).toBe(2);
      expect(metrics.connections.idle).toBe(3);
      expect(metrics.connections.utilizationPercentage).toBe(5);
    });
  });

  describe('AI Service Monitor Integration', () => {
    it('should detect service unavailability and trigger alerts', async () => {
      // Mock failed health check
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that alert was triggered
      const alerts = aiServiceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'availability')).toBe(true);
    });

    it('should record service requests and update metrics', async () => {
      // Record a successful request
      aiServiceMonitor.recordRequest({
        provider: 'openai',
        service: 'chat-completion',
        timestamp: new Date(),
        success: true,
        responseTime: 1500,
        tokensUsed: 100,
        cost: 0.03
      });

      // Check metrics
      const metrics = aiServiceMonitor.getServiceMetrics('openai', 'chat-completion');
      expect(metrics).toBeDefined();
      expect(metrics?.usage.totalRequests).toBe(1);
      expect(metrics?.usage.cost).toBe(0.03);
    });
  });

  describe('System Resource Monitor Integration', () => {
    it('should detect high CPU usage and trigger alerts', async () => {
      // Mock high CPU usage
      const { exec } = require('child_process');
      exec.mockImplementation((cmd, callback) => {
        if (cmd.includes('Cpu(s)')) {
          callback(null, { stdout: '95.0 us, 5.0 sy' });
        } else {
          callback(null, { stdout: '' });
        }
      });

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that alert was triggered
      const alerts = systemResourceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'cpu')).toBe(true);
    });

    it('should update system metrics', async () => {
      // Mock system metrics
      const { exec } = require('child_process');
      exec.mockImplementation((cmd, callback) => {
        if (cmd.includes('Cpu(s)')) {
          callback(null, { stdout: '50.0 us, 50.0 sy' });
        } else if (cmd.includes('MemTotal')) {
          callback(null, { stdout: '8000000 kB' });
        } else if (cmd.includes('MemAvailable')) {
          callback(null, { stdout: '4000000 kB' });
        } else {
          callback(null, { stdout: '' });
        }
      });

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check metrics
      const metrics = systemResourceMonitor.getMetrics();
      expect(metrics.cpu.usage).toBe(50);
      expect(metrics.memory.usage).toBe(50);
    });
  });

  describe('User Experience Monitor Integration', () => {
    it('should track user sessions and interactions', () => {
      // Start a session
      userExperienceMonitor.startSession({
        sessionId: 'test-session-1',
        userId: 'test-user',
        deviceType: 'desktop',
        browser: 'Chrome',
        platform: 'Windows',
        page: '/search'
      });

      // Record interactions
      userExperienceMonitor.recordInteraction({
        sessionId: 'test-session-1',
        userId: 'test-user',
        type: 'search',
        feature: 'ai-search',
        responseTime: 2000,
        success: true,
        page: '/search'
      });

      userExperienceMonitor.recordInteraction({
        sessionId: 'test-session-1',
        userId: 'test-user',
        type: 'click',
        element: 'export-button',
        feature: 'export',
        page: '/results'
      });

      // End session
      userExperienceMonitor.endSession('test-session-1', {
        satisfaction: 4
      });

      // Check session metrics
      const sessionMetrics = userExperienceMonitor.getSessionMetrics('test-session-1');
      expect(sessionMetrics).toBeDefined();
      expect(sessionMetrics?.interactions).toBe(2);
      expect(sessionMetrics?.searchQueries).toBe(1);
      expect(sessionMetrics?.userSatisfaction).toBe(4);
    });

    it('should detect low satisfaction and trigger alerts', async () => {
      // Start a session with low satisfaction
      userExperienceMonitor.startSession({
        sessionId: 'test-session-2',
        userId: 'test-user',
        deviceType: 'desktop',
        browser: 'Chrome',
        platform: 'Windows',
        page: '/search'
      });

      // Record feedback
      userExperienceMonitor.recordFeedback({
        userId: 'test-user',
        sessionId: 'test-session-2',
        feature: 'ai-search',
        rating: 2,
        category: 'usability',
        comment: 'Difficult to use'
      });

      // End session
      userExperienceMonitor.endSession('test-session-2', {
        satisfaction: 2
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that alert was triggered
      const alerts = userExperienceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'satisfaction')).toBe(true);
    });
  });

  describe('Business Metrics Monitor Integration', () => {
    it('should detect low ROI and trigger alerts', async () => {
      // Mock database queries to return low ROI
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query = jest.fn().mockImplementation((query) => {
        if (query.includes('revenue')) {
          return Promise.resolve({ rows: [{ sum: '1000' }] });
        } else if (query.includes('costs')) {
          return Promise.resolve({ rows: [{ sum: '2000' }] });
        } else if (query.includes('investments')) {
          return Promise.resolve({ rows: [{ sum: '1500' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that alert was triggered
      const alerts = businessMetricsMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'financial')).toBe(true);
    });

    it('should calculate cost-benefit analysis', async () => {
      // Mock database queries
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query = jest.fn().mockImplementation((query) => {
        if (query.includes('revenue')) {
          return Promise.resolve({ rows: [{ sum: '5000' }] });
        } else if (query.includes('costs')) {
          return Promise.resolve({ rows: [{ sum: '2000' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      // Wait for monitoring cycle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check cost-benefit analysis
      const analysis = businessMetricsMonitor.getCostBenefitAnalysis();
      expect(analysis.totalCosts).toBe(2000);
      expect(analysis.totalBenefits).toBe(5000);
      expect(analysis.netBenefit).toBe(3000);
      expect(analysis.benefitCostRatio).toBe(2.5);
    });
  });

  describe('Alert Configuration Integration', () => {
    it('should load default configuration', () => {
      const config = alertConfigManager.getConfiguration();
      expect(config.rules.length).toBeGreaterThan(0);
      expect(config.channels.length).toBeGreaterThan(0);
      expect(config.templates.length).toBeGreaterThan(0);
    });

    it('should update rules and channels', () => {
      // Add a new rule
      alertConfigManager.addRule({
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test rule for integration testing',
        category: 'performance',
        severity: 'warning',
        enabled: true,
        condition: {
          type: 'response_time',
          target: 'test-endpoint',
          timeWindow: 300000,
          evaluationInterval: 60000
        },
        threshold: {
          operator: '>',
          value: 1000,
          unit: 'milliseconds'
        },
        cooldownMs: 300000,
        notificationChannels: ['console'],
        tags: { test: 'true' }
      });

      // Check that rule was added
      const rules = alertConfigManager.getAlertRules();
      expect(rules.some(rule => rule.id === 'test-rule')).toBe(true);

      // Update the rule
      const updated = alertConfigManager.updateAlertRule('test-rule', {
        severity: 'critical'
      });

      expect(updated).toBe(true);

      // Check that rule was updated
      const updatedRule = rules.find(rule => rule.id === 'test-rule');
      expect(updatedRule?.severity).toBe('critical');
    });
  });

  describe('Alert Notifier Integration', () => {
    it('should send notifications through different channels', async () => {
      // Mock console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create a notification message
      const message = {
        id: 'test-notification',
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        severity: 'warning' as const,
        title: 'Test Alert',
        message: 'This is a test alert',
        description: 'Test alert description',
        current_value: 1500,
        threshold_value: 1000,
        unit: 'milliseconds',
        metric: 'response_time',
        timestamp: new Date(),
        environment: 'test',
        recommendations: ['Fix the issue'],
        affected_services: ['test-service'],
        dashboard_url: 'https://dashboard.example.com',
        tags: {}
      };

      // Send notification
      const results = await alertNotifier.sendNotification(message, ['console']);

      // Check that notification was sent
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ [ALERT] Test Alert')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Monitoring Dashboard Integration', () => {
    it('should generate dashboard data', async () => {
      // Get dashboard data
      const dashboardId = 'ai_search_overview';
      const data = await monitoringDashboard.getDashboardData(dashboardId);

      expect(data).toBeDefined();
      expect(data.timestamp).toBeInstanceOf(Date);
      expect(data.metrics).toBeDefined();
      expect(data.alerts).toBeDefined();
      expect(data.systemHealth).toBeDefined();
    });

    it('should update widget data', async () => {
      // Get widget data
      const dashboardId = 'ai_search_overview';
      const widgetId = 'status_overview';
      const data = await monitoringDashboard.getWidgetData(dashboardId, widgetId);

      expect(data).toBeDefined();
    });
  });

  describe('Automated Alert System Integration', () => {
    it('should collect alerts from all sources', async () => {
      // Trigger alerts in different monitoring systems
      aiSearchMonitor.recordSearch({
        latency: 15000,
        success: true,
        provider: 'openai',
        resultCount: 5,
        cost: 0.05,
        userId: 'test-user',
        error: undefined,
        relevanceScore: 0.8
      });

      userExperienceMonitor.recordFeedback({
        userId: 'test-user',
        feature: 'ai-search',
        rating: 2,
        category: 'usability',
        comment: 'Difficult to use'
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that alerts were collected
      const alerts = automatedAlertSystem.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.source === 'ai_search')).toBe(true);
      expect(alerts.some(alert => alert.source === 'user_experience')).toBe(true);
    });

    it('should acknowledge and resolve alerts', () => {
      // Get alerts
      const alerts = automatedAlertSystem.getAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;

        // Acknowledge alert
        const acknowledged = automatedAlertSystem.acknowledgeAlert(alertId, 'test-user');
        expect(acknowledged).toBe(true);

        // Check that alert was acknowledged
        const acknowledgedAlert = automatedAlertSystem.getAlert(alertId);
        expect(acknowledgedAlert?.acknowledged).toBe(true);
        expect(acknowledgedAlert?.acknowledgedBy).toBe('test-user');

        // Resolve alert
        const resolved = automatedAlertSystem.resolveAlert(alertId, 'test-user');
        expect(resolved).toBe(true);

        // Check that alert was resolved
        const resolvedAlert = automatedAlertSystem.getAlert(alertId);
        expect(resolvedAlert?.resolved).toBe(true);
        expect(resolvedAlert?.resolvedBy).toBe('test-user');
      }
    });

    it('should generate and send digests', async () => {
      // Generate a digest
      const digests = automatedAlertSystem.getDigests({ type: 'hourly' });
      expect(Array.isArray(digests)).toBe(true);
    });
  });

  describe('End-to-End Monitoring Flow', () => {
    it('should handle a complete monitoring flow from issue to resolution', async () => {
      // 1. Simulate a performance issue
      aiSearchMonitor.recordSearch({
        latency: 15000, // High latency
        success: true,
        provider: 'openai',
        resultCount: 5,
        cost: 0.05,
        userId: 'test-user',
        error: undefined,
        relevanceScore: 0.8
      });

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // 2. Check that alert was triggered
      const aiSearchAlerts = aiSearchMonitor.getAlerts();
      expect(aiSearchAlerts.length).toBeGreaterThan(0);

      // 3. Check that unified alert was created
      const unifiedAlerts = automatedAlertSystem.getAlerts();
      expect(unifiedAlerts.length).toBeGreaterThan(0);
      expect(unifiedAlerts.some(alert => alert.source === 'ai_search')).toBe(true);

      // 4. Acknowledge the alert
      if (unifiedAlerts.length > 0) {
        const alertId = unifiedAlerts[0].id;
        const acknowledged = automatedAlertSystem.acknowledgeAlert(alertId, 'test-user');
        expect(acknowledged).toBe(true);

        // 5. Simulate issue resolution
        aiSearchMonitor.recordSearch({
          latency: 1000, // Normal latency
          success: true,
          provider: 'openai',
          resultCount: 5,
          cost: 0.02,
          userId: 'test-user',
          error: undefined,
          relevanceScore: 0.9
        });

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 200));

        // 6. Resolve the alert
        const resolved = automatedAlertSystem.resolveAlert(alertId, 'test-user');
        expect(resolved).toBe(true);

        // 7. Check that alert was resolved
        const resolvedAlert = automatedAlertSystem.getAlert(alertId);
        expect(resolvedAlert?.resolved).toBe(true);
      }
    });

    it('should handle multiple simultaneous issues', async () => {
      // Simulate multiple issues
      aiSearchMonitor.recordSearch({
        latency: 15000,
        success: false,
        provider: 'openai',
        resultCount: 0,
        cost: 0.05,
        userId: 'test-user',
        error: 'Service unavailable',
        relevanceScore: 0
      });

      userExperienceMonitor.recordFeedback({
        userId: 'test-user',
        feature: 'ai-search',
        rating: 1,
        category: 'bug_report',
        comment: 'Completely broken'
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that multiple alerts were triggered
      const unifiedAlerts = automatedAlertSystem.getAlerts();
      expect(unifiedAlerts.length).toBeGreaterThan(1);

      // Check that alerts from different sources were created
      const sources = new Set(unifiedAlerts.map(alert => alert.source));
      expect(sources.has('ai_search')).toBe(true);
      expect(sources.has('user_experience')).toBe(true);
    });
  });

  describe('Monitoring System Performance', () => {
    it('should handle high volume of monitoring data', async () => {
      // Generate a large number of searches
      for (let i = 0; i < 100; i++) {
        aiSearchMonitor.recordSearch({
          latency: 1000 + Math.random() * 2000,
          success: Math.random() > 0.1,
          provider: 'openai',
          resultCount: Math.floor(Math.random() * 20),
          cost: 0.01 + Math.random() * 0.05,
          userId: `user-${i % 10}`,
          error: Math.random() > 0.9 ? 'Random error' : undefined,
          relevanceScore: 0.7 + Math.random() * 0.3
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check that metrics were updated correctly
      const metrics = aiSearchMonitor.getMetrics();
      expect(metrics.totalSearches).toBe(100);
      expect(metrics.searchSuccessRate).toBeGreaterThan(0);
      expect(metrics.averageResultsPerSearch).toBeGreaterThan(0);
    });

    it('should not impact application performance', async () => {
      // Measure time to record multiple searches
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        aiSearchMonitor.recordSearch({
          latency: 1000,
          success: true,
          provider: 'openai',
          resultCount: 10,
          cost: 0.02,
          userId: 'test-user',
          error: undefined,
          relevanceScore: 0.8
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 50 searches)
      expect(duration).toBeLessThan(100);
    });
  });
});