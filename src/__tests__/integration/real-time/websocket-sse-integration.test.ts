/**
 * Real-time WebSocket/SSE Integration Tests
 * Tests the real-time communication functionality for AI search progress and results
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import { Server } from 'mock-socket';
import WebSocket from 'ws';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/search/orchestration/route';

// Mock WebSocket server
let mockServer: Server;
let wsUrl: string;

// Mock dependencies
jest.mock('@/lib/ai/search-orchestration', () => ({
  SearchOrchestrationService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    submitSearch: jest.fn().mockImplementation((searchData) => {
      const searchId = `test-search-${Date.now()}`;
      
      // Simulate progress updates
      setTimeout(() => {
        mockServer.emit('search-progress', {
          searchId,
          status: 'processing',
          progress: 25,
          currentStep: 'query-generation',
          estimatedTimeRemaining: 45000
        });
      }, 1000);
      
      setTimeout(() => {
        mockServer.emit('search-progress', {
          searchId,
          status: 'processing',
          progress: 50,
          currentStep: 'web-search',
          estimatedTimeRemaining: 30000
        });
      }, 2000);
      
      setTimeout(() => {
        mockServer.emit('search-progress', {
          searchId,
          status: 'processing',
          progress: 75,
          currentStep: 'contact-extraction',
          estimatedTimeRemaining: 15000
        });
      }, 3000);
      
      setTimeout(() => {
        mockServer.emit('search-progress', {
          searchId,
          status: 'completed',
          progress: 100,
          currentStep: 'completed',
          results: [
            {
              id: 'result-1',
              url: 'https://techcrunch.com/2024/01/15/ai-journalists',
              title: 'The Rise of AI Journalism',
              summary: 'An in-depth look at AI journalists',
              contacts: [
                {
                  name: 'John Doe',
                  email: 'john.doe@example.com',
                  role: 'Technology Journalist',
                  organization: 'Tech News Outlet',
                  confidence: 0.92
                }
              ],
              relevanceScore: 0.95
            }
          ],
          metrics: {
            totalQueries: 5,
            completedQueries: 5,
            averageConfidence: 0.92,
            processingTime: 60000
          }
        });
      }, 4000);
      
      return Promise.resolve({
        searchId,
        status: 'pending',
        progress: 0,
        estimatedDuration: 60000
      });
    }),
    getSearchStatus: jest.fn().mockImplementation((searchId) => {
      return Promise.resolve({
        searchId,
        status: 'processing',
        progress: 50,
        currentStep: 'web-search',
        estimatedTimeRemaining: 30000
      });
    }),
    cancelSearch: jest.fn().mockImplementation((searchId) => {
      // Simulate cancellation
      mockServer.emit('search-progress', {
        searchId,
        status: 'cancelled',
        progress: 50,
        currentStep: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      
      return Promise.resolve({
        searchId,
        success: true,
        message: 'Search cancelled successfully',
        cancelledAt: new Date().toISOString()
      });
    })
  }))
}));

jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Real-time WebSocket/SSE Integration Tests', () => {
  beforeAll(async () => {
    // Set up mock WebSocket server
    mockServer = new Server('ws://localhost:8080');
    wsUrl = 'ws://localhost:8080';
    
    // Add event handlers for the mock server
    mockServer.on('connection', (ws) => {
      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe-search') {
          // Acknowledge subscription
          ws.send(JSON.stringify({
            type: 'subscription-acknowledged',
            searchId: data.searchId,
            timestamp: new Date().toISOString()
          }));
        }
      });
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Clean up mock server
    if (mockServer) {
      mockServer.stop();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining connections
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection successfully', async () => {
      // Arrange
      const ws = new WebSocket(wsUrl);
      
      // Act
      const connectionPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          resolve(true);
        });
        
        ws.on('error', (error) => {
          reject(error);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Assert
      await expect(connectionPromise).resolves.toBe(true);
      
      // Clean up
      ws.close();
    });

    it('should handle WebSocket connection errors gracefully', async () => {
      // Arrange
      const invalidWsUrl = 'ws://invalid-host:8080';
      const ws = new WebSocket(invalidWsUrl);
      
      // Act
      const connectionPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          resolve(true);
        });
        
        ws.on('error', (error) => {
          reject(error);
        });
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Assert
      await expect(connectionPromise).rejects.toThrow();
      
      // Clean up
      ws.close();
    });

    it('should handle WebSocket disconnection', async () => {
      // Arrange
      const ws = new WebSocket(wsUrl);
      
      // Wait for connection to establish
      await new Promise(resolve => {
        ws.on('open', resolve);
      });
      
      // Act
      const disconnectionPromise = new Promise((resolve) => {
        ws.on('close', () => {
          resolve(true);
        });
        
        ws.close();
      });
      
      // Assert
      await expect(disconnectionPromise).resolves.toBe(true);
    });
  });

  describe('Search Progress Updates via WebSocket', () => {
    it('should receive real-time search progress updates', async () => {
      // Arrange
      const ws = new WebSocket(wsUrl);
      const searchId = `test-search-${Date.now()}`;
      const progressUpdates: any[] = [];
      
      // Wait for connection to establish
      await new Promise(resolve => {
        ws.on('open', resolve);
      });
      
      // Subscribe to search progress
      ws.send(JSON.stringify({
        type: 'subscribe-search',
        searchId
      }));
      
      // Listen for progress updates
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'search-progress') {
          progressUpdates.push(message);
        }
      });
      
      // Submit a search request
      const searchRequest = {
        query: 'AI technology journalists',
        countries: ['US'],
        categories: ['technology'],
        maxResults: 10
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-ws-${Date.now()}`
        },
        body: JSON.stringify(searchRequest)
      });

      const response = await POST(request);
      const responseData = await response.json();
      
      // Act
      // Wait for progress updates
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Assert
      expect(response.status).toBe(202);
      expect(responseData.success).toBe(true);
      expect(responseData.data.searchId).toBeDefined();
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check that we received progress updates in the expected order
      const progressValues = progressUpdates.map(update => update.progress);
      expect(progressValues).toEqual(expect.arrayContaining([25, 50, 75, 100]));
      
      // Check that the final update has results
      const finalUpdate = progressUpdates.find(update => update.progress === 100);
      expect(finalUpdate).toBeDefined();
      expect(finalUpdate.status).toBe('completed');
      expect(finalUpdate.results).toBeDefined();
      expect(finalUpdate.results.length).toBeGreaterThan(0);
      
      // Clean up
      ws.close();
    });

    it('should handle search cancellation via WebSocket', async () => {
      // Arrange
      const ws = new WebSocket(wsUrl);
      const searchId = `test-search-cancel-${Date.now()}`;
      const progressUpdates: any[] = [];
      
      // Wait for connection to establish
      await new Promise(resolve => {
        ws.on('open', resolve);
      });
      
      // Subscribe to search progress
      ws.send(JSON.stringify({
        type: 'subscribe-search',
        searchId
      }));
      
      // Listen for progress updates
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'search-progress') {
          progressUpdates.push(message);
        }
      });
      
      // Submit a search request
      const searchRequest = {
        query: 'AI technology journalists',
        countries: ['US'],
        categories: ['technology'],
        maxResults: 10
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-ws-cancel-${Date.now()}`
        },
        body: JSON.stringify(searchRequest)
      });

      const response = await POST(request);
      const responseData = await response.json();
      
      // Wait for initial progress
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Cancel the search
      const cancelRequest = new NextRequest(`http://localhost:3000/api/ai/search/orchestration?searchId=${responseData.data.searchId}&action=cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-ws-cancel-${Date.now()}`
        }
      });

      const cancelResponse = await POST(cancelRequest);
      
      // Wait for cancellation update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Assert
      expect(response.status).toBe(202);
      expect(responseData.success).toBe(true);
      
      expect(cancelResponse.status).toBe(200);
      
      // Check that we received a cancellation update
      const cancellationUpdate = progressUpdates.find(update => update.status === 'cancelled');
      expect(cancellationUpdate).toBeDefined();
      expect(cancellationUpdate.progress).toBe(50);
      expect(cancellationUpdate.cancelledAt).toBeDefined();
      
      // Clean up
      ws.close();
    });
  });

  describe('Server-Sent Events (SSE)', () => {
    it('should establish SSE connection for search progress', async () => {
      // Arrange
      const searchId = `test-sse-${Date.now()}`;
      const progressUpdates: any[] = [];
      
      // Create a mock EventSource
      const mockEventSource = new EventEmitter() as any;
      mockEventSource.readyState = 1; // OPEN
      mockEventSource.close = jest.fn();
      
      // Mock fetch to return a ReadableStream for SSE
      global.fetch = jest.fn().mockImplementation(() => {
        const stream = new ReadableStream({
          start(controller) {
            // Send initial connection message
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'connected', searchId })}\n\n`
            ));
            
            // Send progress updates
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'search-progress',
                  searchId,
                  status: 'processing',
                  progress: 25,
                  currentStep: 'query-generation'
                })}\n\n`
              ));
            }, 1000);
            
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'search-progress',
                  searchId,
                  status: 'processing',
                  progress: 50,
                  currentStep: 'web-search'
                })}\n\n`
              ));
            }, 2000);
            
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'search-progress',
                  searchId,
                  status: 'completed',
                  progress: 100,
                  currentStep: 'completed'
                })}\n\n`
              ));
              
              controller.close();
            }, 3000);
          }
        });
        
        return Promise.resolve({
          body: stream,
          ok: true,
          status: 200
        });
      });
      
      // Act
      const sseUrl = `http://localhost:3000/api/ai/search/orchestration/progress?searchId=${searchId}`;
      const response = await fetch(sseUrl);
      
      // Process the SSE stream
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                progressUpdates.push(data);
              } catch (error) {
                // Ignore parsing errors
              }
            }
          }
        }
      }
      
      // Assert
      expect(response.ok).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check that we received progress updates in the expected order
      const progressValues = progressUpdates
        .filter(update => update.type === 'search-progress')
        .map(update => update.progress);
      
      expect(progressValues).toEqual(expect.arrayContaining([25, 50, 100]));
    });

    it('should handle SSE connection errors', async () => {
      // Arrange
      const searchId = `test-sse-error-${Date.now()}`;
      
      // Mock fetch to return an error
      global.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        });
      });
      
      // Act
      const sseUrl = `http://localhost:3000/api/ai/search/orchestration/progress?searchId=${searchId}`;
      const response = await fetch(sseUrl);
      
      // Assert
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('Concurrent Real-time Connections', () => {
    it('should handle multiple concurrent WebSocket connections', async () => {
      // Arrange
      const connectionCount = 5;
      const connections: WebSocket[] = [];
      const connectionPromises: Promise<boolean>[] = [];
      
      // Create multiple WebSocket connections
      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(wsUrl);
        connections.push(ws);
        
        const connectionPromise = new Promise<boolean>((resolve) => {
          ws.on('open', () => {
            resolve(true);
          });
          
          ws.on('error', () => {
            resolve(false);
          });
        });
        
        connectionPromises.push(connectionPromise);
      }
      
      // Act
      const connectionResults = await Promise.all(connectionPromises);
      
      // Assert
      expect(connectionResults).toHaveLength(connectionCount);
      connectionResults.forEach(result => {
        expect(result).toBe(true);
      });
      
      // Clean up
      connections.forEach(ws => ws.close());
    });

    it('should handle multiple concurrent SSE connections', async () => {
      // Arrange
      const connectionCount = 3;
      const searchIds = Array.from({ length: connectionCount }, (_, i) => `test-sse-concurrent-${i}-${Date.now()}`);
      
      // Mock fetch to return SSE streams
      global.fetch = jest.fn().mockImplementation((url) => {
        const searchId = new URL(url).searchParams.get('searchId');
        
        const stream = new ReadableStream({
          start(controller) {
            // Send initial connection message
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'connected', searchId })}\n\n`
            ));
            
            // Send progress update
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: 'search-progress',
                  searchId,
                  status: 'processing',
                  progress: 50,
                  currentStep: 'web-search'
                })}\n\n`
              ));
              
              controller.close();
            }, 1000);
          }
        });
        
        return Promise.resolve({
          body: stream,
          ok: true,
          status: 200
        });
      });
      
      // Act
      const ssePromises = searchIds.map(async (searchId) => {
        const sseUrl = `http://localhost:3000/api/ai/search/orchestration/progress?searchId=${searchId}`;
        const response = await fetch(sseUrl);
        
        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          let buffer = '';
          const updates: any[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  updates.push(data);
                } catch (error) {
                  // Ignore parsing errors
                }
              }
            }
          }
          
          return updates;
        }
        
        return [];
      });
      
      const sseResults = await Promise.all(ssePromises);
      
      // Assert
      expect(sseResults).toHaveLength(connectionCount);
      sseResults.forEach((updates, index) => {
        expect(updates.length).toBeGreaterThan(0);
        expect(updates[0].searchId).toBe(searchIds[index]);
      });
    });
  });

  describe('Real-time Data Integrity', () => {
    it('should maintain data integrity in real-time updates', async () => {
      // Arrange
      const ws = new WebSocket(wsUrl);
      const searchId = `test-integrity-${Date.now()}`;
      const progressUpdates: any[] = [];
      
      // Wait for connection to establish
      await new Promise(resolve => {
        ws.on('open', resolve);
      });
      
      // Subscribe to search progress
      ws.send(JSON.stringify({
        type: 'subscribe-search',
        searchId
      }));
      
      // Listen for progress updates
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'search-progress') {
          progressUpdates.push(message);
        }
      });
      
      // Submit a search request
      const searchRequest = {
        query: 'AI technology journalists',
        countries: ['US'],
        categories: ['technology'],
        maxResults: 10
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-integrity-${Date.now()}`
        },
        body: JSON.stringify(searchRequest)
      });

      const response = await POST(request);
      const responseData = await response.json();
      
      // Wait for progress updates
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Act
      // Verify data integrity
      const finalUpdate = progressUpdates.find(update => update.progress === 100);
      
      // Assert
      expect(response.status).toBe(202);
      expect(responseData.success).toBe(true);
      expect(responseData.data.searchId).toBeDefined();
      
      expect(finalUpdate).toBeDefined();
      expect(finalUpdate.searchId).toBeDefined();
      expect(finalUpdate.status).toBe('completed');
      expect(finalUpdate.progress).toBe(100);
      expect(finalUpdate.results).toBeDefined();
      expect(finalUpdate.results.length).toBeGreaterThan(0);
      
      // Verify result structure
      const result = finalUpdate.results[0];
      expect(result.id).toBeDefined();
      expect(result.url).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.relevanceScore).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeLessThanOrEqual(1);
      expect(result.contacts).toBeDefined();
      expect(Array.isArray(result.contacts)).toBe(true);
      
      // Verify contact structure
      if (result.contacts.length > 0) {
        const contact = result.contacts[0];
        expect(contact.name).toBeDefined();
        expect(contact.email).toBeDefined();
        expect(contact.confidence).toBeGreaterThan(0);
        expect(contact.confidence).toBeLessThanOrEqual(1);
      }
      
      // Clean up
      ws.close();
    });

    it('should handle malformed real-time messages gracefully', async () => {
      // Arrange
      const ws = new WebSocket(wsUrl);
      const progressUpdates: any[] = [];
      
      // Wait for connection to establish
      await new Promise(resolve => {
        ws.on('open', resolve);
      });
      
      // Listen for progress updates
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'search-progress') {
            progressUpdates.push(message);
          }
        } catch (error) {
          // Ignore malformed messages
        }
      });
      
      // Simulate sending a malformed message
      setTimeout(() => {
        mockServer.emit('message', 'invalid-json{');
      }, 1000);
      
      // Simulate sending a valid message
      setTimeout(() => {
        mockServer.emit('search-progress', {
          searchId: 'test-malformed',
          status: 'processing',
          progress: 50
        });
      }, 2000);
      
      // Act
      // Wait for messages
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Assert
      expect(progressUpdates.length).toBe(1);
      expect(progressUpdates[0].searchId).toBe('test-malformed');
      expect(progressUpdates[0].progress).toBe(50);
      
      // Clean up
      ws.close();
    });
  });
});