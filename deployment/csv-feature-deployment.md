# CSV Import/Export Feature Deployment Guide

This document outlines the deployment process for the CSV import/export functionality in the Media Contacts application.

## Pre-Deployment Checklist

- [ ] All unit tests pass (`npm run test:csv`)
- [ ] Integration tests pass (`npm run test:csv:integration`)
- [ ] Performance benchmarks meet targets (`npm run benchmark:csv`)
- [ ] Memory usage stays within acceptable limits during large file imports
- [ ] Environment variables are properly configured
- [ ] Database migrations are applied

## Environment Variables

Ensure the following environment variables are set in your production environment:

```
# File upload settings
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB
NEXT_PUBLIC_UPLOAD_TIMEOUT=300000   # 5 minutes

# CSV processing settings
CSV_BATCH_SIZE=100
CSV_MAX_CONCURRENCY=5
CSV_TEMP_DIR=/tmp/csv-uploads
```

## Database Requirements

The CSV import/export functionality requires the following database schema:

- Media contacts table with all required fields
- Proper indexes on email and id fields for efficient lookups
- Foreign key relationships to related entities (beats, countries, etc.)

Run the latest migrations before deployment:

```bash
npx prisma migrate deploy
```

## Server Requirements

For optimal performance with CSV processing:

- Minimum 2 CPU cores
- At least 2GB RAM
- Disk space: 1GB minimum free space for temporary file storage
- Node.js v16.x or higher
- Network: Low latency connection to database

## Deployment Steps

1. **Staging Deployment**:
   ```bash
   # Deploy to staging
   vercel deploy --env .env.staging
   ```

2. **Run Smoke Tests**:
   ```bash
   # Test basic functionality
   npm run test:smoke:csv
   ```

3. **Production Deployment**:
   ```bash
   # Deploy to production
   vercel deploy --prod --env .env.production
   ```

4. **Post-Deployment Verification**:
   - Verify CSV import with small test file
   - Verify CSV export with various filters
   - Check logs for any errors

## Rollback Procedure

If issues are detected after deployment:

1. Identify the last stable deployment:
   ```bash
   vercel ls
   ```

2. Rollback to previous deployment:
   ```bash
   vercel rollback
   ```

3. Document the issue and fix in development before redeploying.

## Monitoring Setup

### Logging

Configure structured logging for CSV operations:

```javascript
// Example logging configuration
const logger = {
  info: (message, data) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...data
    }));
  },
  error: (message, error, data) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error.message,
      stack: error.stack,
      ...data
    }));
  }
};
```

### Metrics

Track the following metrics:

1. **Import Metrics**:
   - Import request count
   - Average import duration
   - File size distribution
   - Error rate by validation type
   - Memory usage during import

2. **Export Metrics**:
   - Export request count
   - Average export duration
   - Result size distribution
   - Filter usage statistics

### Alerts

Set up alerts for:

- Failed imports exceeding 10% of total imports in a 1-hour window
- Import processing time exceeding 5 minutes
- Memory usage exceeding 80% during CSV processing
- Disk space below 20% on servers handling file uploads
- Database connection failures during import/export operations

## Performance Monitoring

Implement the following monitoring:

1. **Application Performance Monitoring (APM)**:
   - Configure New Relic or Datadog APM
   - Set up transaction tracing for CSV operations
   - Monitor memory usage during file processing

2. **Database Monitoring**:
   - Track query performance during batch operations
   - Monitor connection pool utilization
   - Set up slow query logging

3. **User Experience Monitoring**:
   - Track client-side performance metrics
   - Monitor upload and download speeds
   - Capture client-side errors

## Scaling Considerations

For high-volume scenarios:

1. **Horizontal Scaling**:
   - Deploy behind load balancer
   - Ensure file uploads are properly routed (sticky sessions)

2. **Vertical Scaling**:
   - Increase memory for large file processing
   - Add CPU cores for parallel processing

3. **Database Scaling**:
   - Add read replicas for export operations
   - Optimize indexes for import/export queries

## Maintenance Procedures

### Regular Maintenance

1. **Temporary File Cleanup**:
   ```bash
   # Cron job to clean up old temporary files
   0 2 * * * find /tmp/csv-uploads -type f -mtime +1 -delete
   ```

2. **Database Maintenance**:
   ```sql
   -- Analyze tables regularly
   ANALYZE media_contact;
   ```

### Emergency Procedures

1. **High Load Handling**:
   - Implement rate limiting for CSV operations
   - Add queue system for large imports

2. **Data Recovery**:
   - Regular database backups
   - Point-in-time recovery capability

## Documentation Updates

After deployment, ensure the following documentation is updated:

1. User documentation with any new features or limitations
2. API documentation for any changes to endpoints
3. Internal wiki with deployment notes and lessons learned
