# Database Management Guide

## Neon PostgreSQL Connection Management

This document provides guidance on managing the Neon PostgreSQL database connection for the Media Contacts application, particularly focusing on preventing connection issues with Vercel deployments.

### Understanding Neon's Auto-suspend Feature

Neon PostgreSQL uses an auto-suspend feature that puts compute resources into an idle state when not in use. This is great for cost savings but can cause connection issues when your application tries to connect to a suspended database.

Key points:
- Default suspend timeout is set to 0 seconds (immediate suspend)
- When suspended, connection attempts will fail with Prisma error P1001
- Vercel deployments may fail if the database is suspended during build/deployment

### Implemented Solutions

We've implemented the following solutions to ensure stable database connectivity:

#### 1. Health Check API Endpoint

A dedicated API endpoint at `/api/health` connects to the database to keep it active:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Simple query to wake up the database
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check database connection failed:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
```

#### 2. Database Keep-Alive Mechanism

A client-side mechanism that periodically pings the health endpoint to keep the database active:

```typescript
// src/lib/db-keepalive.ts
export function startDbKeepAlive(interval = 5 * 60 * 1000): void {
  // Pings the health endpoint every 5 minutes
}
```

#### 3. Integration with Root Layout

The keep-alive mechanism is integrated into the application's root layout:

```tsx
// src/app/layout.tsx
import { DbKeepAliveClient } from "@/components/db-keepalive-client";

// Inside the layout component
<DbKeepAliveClient />
```

### Manual Configuration in Neon Dashboard

For optimal production stability, we recommend the following manual configurations in the Neon dashboard:

1. **Increase Suspend Timeout**:
   - Log in to the Neon dashboard
   - Navigate to your project
   - Go to the "Branches" tab
   - Click on your production branch
   - Under "Settings", increase the suspend timeout to at least 300 seconds (5 minutes)

2. **Enable Connection Pooling**:
   - In your branch settings, enable connection pooling
   - Use the pooler endpoint in your DATABASE_URL
   - Format: `postgresql://user:password@ep-name-pooler.region.aws.neon.tech/database`

### Monitoring and Troubleshooting

#### Regular Monitoring

1. **Neon Dashboard**:
   - Regularly check the compute state in the Neon dashboard
   - Monitor compute hours usage to stay within your plan limits

2. **Vercel Logs**:
   - Check Vercel deployment and function logs for database connection errors
   - Look for Prisma error P1001 which indicates connection issues

3. **Application Logs**:
   - Monitor the console for database keep-alive ping logs
   - Check for any failed health check requests

#### Troubleshooting Connection Issues

If you encounter database connection issues:

1. **Check Database State**:
   - Verify that the compute endpoint is active in the Neon dashboard
   - If suspended, manually activate it or wait for the keep-alive mechanism

2. **Verify Environment Variables**:
   - Ensure DATABASE_URL is correctly set in Vercel environment variables
   - Confirm SSL parameters are included: `sslmode=require&channel_binding=require`

3. **Test Connection Locally**:
   - Use the Prisma CLI to test the connection: `npx prisma db pull`
   - Check for any SSL or network-related errors

4. **Restart Vercel Functions**:
   - Sometimes redeploying or restarting Vercel functions can resolve connection issues

### Advanced Setup (Optional)

For more robust production environments, consider:

1. **External Monitoring**:
   - Set up an external service (e.g., UptimeRobot) to ping your health endpoint
   - Configure alerts for failed health checks

2. **Dedicated Wake-up Function**:
   - Create a scheduled function that runs every few minutes to wake up the database
   - Use Vercel Cron Jobs or a service like GitHub Actions

3. **Connection Pooling Optimization**:
   - Fine-tune Prisma connection pooling settings
   - Consider using PgBouncer for high-traffic applications

### Conclusion

By implementing these solutions and following the monitoring guidelines, your application should maintain a stable connection to the Neon PostgreSQL database, even with the auto-suspend feature enabled.
