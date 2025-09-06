/**
 * Database Keep-Alive Utility
 * 
 * This utility helps keep the Neon database active by periodically pinging
 * the health check endpoint. This is especially useful for Neon databases
 * with short suspend timeouts.
 * 
 * Usage:
 * Import and call startDbKeepAlive() in your app's main layout or root component.
 */

// Interval in milliseconds between health check pings (5 minutes)
const PING_INTERVAL = 5 * 60 * 1000;

// Track if the keep-alive is already running
let keepAliveInterval: NodeJS.Timeout | null = null;

/**
 * Start the database keep-alive mechanism
 * @param interval Optional custom interval in milliseconds
 */
export function startDbKeepAlive(interval = PING_INTERVAL): void {
  // Only start if running in browser and not already started
  if (typeof window === 'undefined' || keepAliveInterval) {
    return;
  }

  console.log('Starting database keep-alive mechanism');
  
  // Immediately ping once
  pingHealthEndpoint();
  
  // Set up recurring ping
  keepAliveInterval = setInterval(pingHealthEndpoint, interval);
}

/**
 * Stop the database keep-alive mechanism
 */
export function stopDbKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('Database keep-alive mechanism stopped');
  }
}

/**
 * Ping the health check endpoint
 */
async function pingHealthEndpoint(): Promise<void> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.debug('Database keep-alive ping successful:', data.timestamp);
    } else {
      console.warn('Database keep-alive ping failed with status:', response.status);
    }
  } catch (error) {
    console.error('Database keep-alive ping error:', error);
  }
}
