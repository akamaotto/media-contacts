-- Post-Migration SQL Script for AI Search Feature
-- This script contains SQL statements to be executed after database migrations

-- Set statement timeout for safety
SET statement_timeout = '300s';

-- Create indexes for better query performance
-- These indexes optimize the AI search feature queries

-- Index for ai_searches table
CREATE INDEX IF NOT EXISTS idx_ai_searches_user_status_created 
ON ai_searches(userId, status, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_searches_status_created 
ON ai_searches(status, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_searches_configuration_gin 
ON ai_searches USING GIN(configuration);

-- Index for ai_search_sources table
CREATE INDEX IF NOT EXISTS idx_ai_search_sources_search_type 
ON ai_search_sources(searchId, sourceType);

CREATE INDEX IF NOT EXISTS idx_ai_search_sources_confidence_created 
ON ai_search_sources(confidenceScore, created_at);

-- Index for ai_performance_logs table
CREATE INDEX IF NOT EXISTS idx_ai_performance_logs_search_operation 
ON ai_performance_logs(searchId, operation);

CREATE INDEX IF NOT EXISTS idx_ai_performance_logs_status_created 
ON ai_performance_logs(status, created_at);

-- Index for ai_contact_duplicates table
CREATE INDEX IF NOT EXISTS idx_ai_contact_duplicates_similarity 
ON ai_contact_duplicates(similarityScore);

CREATE INDEX IF NOT EXISTS idx_ai_contact_duplicates_status 
ON ai_contact_duplicates(verificationStatus);

-- Index for ai_extracted_contacts table
CREATE INDEX IF NOT EXISTS idx_ai_extracted_contacts_search_confidence 
ON ai_extracted_contacts(searchId, confidenceScore);

CREATE INDEX IF NOT EXISTS idx_ai_extracted_contacts_email_verification 
ON ai_extracted_contacts(email, emailValidation);

-- Create materialized views for reporting
-- These views improve performance of analytics queries

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ai_search_daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_searches,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_searches,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_searches,
    SUM(contacts_found) as total_contacts_found,
    SUM(contacts_imported) as total_contacts_imported,
    AVG(duration_seconds) as avg_duration_seconds,
    COUNT(DISTINCT userId) as unique_users
FROM ai_searches
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ai_search_daily_stats_date 
ON mv_ai_search_daily_stats(date);

-- Create materialized view for AI service performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ai_service_performance AS
SELECT 
    DATE(created_at) as date,
    operation,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_operations,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_operations,
    AVG(durationMs) as avg_duration_ms,
    SUM(COALESCE((metadata->>'tokens_used')::int, 0)) as total_tokens_used,
    AVG(COALESCE((metadata->>'confidence')::decimal, 0)) as avg_confidence
FROM ai_performance_logs
GROUP BY DATE(created_at), operation
ORDER BY date DESC, operation;

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ai_service_performance_date_operation 
ON mv_ai_service_performance(date, operation);

-- Create materialized view for cost tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ai_cost_tracking AS
SELECT 
    DATE(created_at) as date,
    SUM(CASE 
        WHEN operation = 'AI_ENHANCEMENT' AND metadata->>'model_used' = 'gpt-3.5-turbo' 
        THEN COALESCE((metadata->>'tokens_used')::int, 0) * 0.002 / 1000
        WHEN operation = 'AI_ENHANCEMENT' AND metadata->>'model_used' = 'gpt-4'
        THEN COALESCE((metadata->>'tokens_used')::int, 0) * 0.03 / 1000
        WHEN operation = 'AI_ENHANCEMENT' AND metadata->>'model_used' LIKE '%claude%'
        THEN COALESCE((metadata->>'tokens_used')::int, 0) * 0.003 / 1000
        ELSE 0
    END) as openai_cost,
    SUM(CASE 
        WHEN sourceType = 'exa_search' 
        THEN 0.01
        ELSE 0
    END) as exa_cost,
    SUM(CASE 
        WHEN sourceType = 'firecrawl' 
        THEN 0.001
        ELSE 0
    END) as firecrawl_cost
FROM (
    SELECT created_at, operation, metadata, NULL as sourceType
    FROM ai_performance_logs
    WHERE operation = 'AI_ENHANCEMENT'
    
    UNION ALL
    
    SELECT created_at, 'SEARCH' as operation, '{}'::json as metadata, sourceType
    FROM ai_search_sources
) combined_data
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ai_cost_tracking_date 
ON mv_ai_cost_tracking(date);

-- Create functions for refreshing materialized views
CREATE OR REPLACE FUNCTION refresh_ai_search_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_search_daily_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_service_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_cost_tracking;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to refresh views (requires pg_cron extension)
-- This will be created only if pg_cron is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule refresh every hour
        SELECT cron.schedule('refresh-ai-stats', '0 * * * *', 'SELECT refresh_ai_search_stats();');
    END IF;
END
$$;

-- Update statistics for better query planning
ANALYZE ai_searches;
ANALYZE ai_search_sources;
ANALYZE ai_performance_logs;
ANALYZE ai_contact_duplicates;
ANALYZE ai_extracted_contacts;

-- Create database roles for AI feature access (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_search_user') THEN
        CREATE ROLE ai_search_user;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_search_admin') THEN
        CREATE ROLE ai_search_admin;
    END IF;
END
$$;

-- Grant appropriate permissions
GRANT SELECT ON ai_searches TO ai_search_user;
GRANT SELECT ON ai_search_sources TO ai_search_user;
GRANT SELECT ON ai_performance_logs TO ai_search_user;
GRANT SELECT ON ai_contact_duplicates TO ai_search_user;
GRANT SELECT ON ai_extracted_contacts TO ai_search_user;

GRANT SELECT, INSERT, UPDATE ON ai_searches TO ai_search_admin;
GRANT SELECT, INSERT, UPDATE ON ai_search_sources TO ai_search_admin;
GRANT SELECT, INSERT, UPDATE ON ai_performance_logs TO ai_search_admin;
GRANT SELECT, INSERT, UPDATE ON ai_contact_duplicates TO ai_search_admin;
GRANT SELECT, INSERT, UPDATE ON ai_extracted_contacts TO ai_search_admin;

-- Grant usage of materialized views
GRANT SELECT ON mv_ai_search_daily_stats TO ai_search_user;
GRANT SELECT ON mv_ai_service_performance TO ai_search_user;
GRANT SELECT ON mv_ai_cost_tracking TO ai_search_user;

GRANT SELECT ON mv_ai_search_daily_stats TO ai_search_admin;
GRANT SELECT ON mv_ai_service_performance TO ai_search_admin;
GRANT SELECT ON mv_ai_cost_tracking TO ai_search_admin;

-- Create stored procedures for common operations

-- Procedure to get AI search statistics
CREATE OR REPLACE FUNCTION get_ai_search_statistics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    date DATE,
    total_searches BIGINT,
    completed_searches BIGINT,
    failed_searches BIGINT,
    success_rate DECIMAL,
    avg_contacts_found DECIMAL,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date,
        total_searches,
        completed_searches,
        failed_searches,
        CASE 
            WHEN total_searches > 0 THEN ROUND((completed_searches::decimal / total_searches) * 100, 2)
            ELSE 0
        END as success_rate,
        ROUND(avg_contacts_found, 2) as avg_contacts_found,
        unique_users
    FROM mv_ai_search_daily_stats
    WHERE date BETWEEN start_date AND end_date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Procedure to get cost breakdown
CREATE OR REPLACE FUNCTION get_ai_cost_breakdown(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    date DATE,
    openai_cost DECIMAL,
    exa_cost DECIMAL,
    firecrawl_cost DECIMAL,
    total_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date,
        openai_cost,
        exa_cost,
        firecrawl_cost,
        ROUND(openai_cost + exa_cost + firecrawl_cost, 4) as total_cost
    FROM mv_ai_cost_tracking
    WHERE date BETWEEN start_date AND end_date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Procedure to clean up old performance logs
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs(
    days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_performance_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Refresh materialized views after cleanup
    PERFORM refresh_ai_search_stats();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables if they don't already have it
DO $$
BEGIN
    -- Check if trigger already exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ai_searches_updated_at'
    ) THEN
        CREATE TRIGGER update_ai_searches_updated_at
            BEFORE UPDATE ON ai_searches
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_ai_contact_duplicates_updated_at'
    ) THEN
        CREATE TRIGGER update_ai_contact_duplicates_updated_at
            BEFORE UPDATE ON ai_contact_duplicates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Add comments to document the schema additions
COMMENT ON MATERIALIZED VIEW mv_ai_search_daily_stats IS 'Daily statistics for AI searches including counts, success rates, and user metrics';
COMMENT ON MATERIALIZED VIEW mv_ai_service_performance IS 'Performance metrics for AI services including operation times and success rates';
COMMENT ON MATERIALIZED VIEW mv_ai_cost_tracking IS 'Cost tracking for AI services broken down by provider';

COMMENT ON FUNCTION refresh_ai_search_stats() IS 'Refreshes all AI-related materialized views';
COMMENT ON FUNCTION get_ai_search_statistics(DATE, DATE) IS 'Returns AI search statistics for a date range';
COMMENT ON FUNCTION get_ai_cost_breakdown(DATE, DATE) IS 'Returns cost breakdown for AI services for a date range';
COMMENT ON FUNCTION cleanup_old_performance_logs(INTEGER) IS 'Cleans up old performance logs and returns count of deleted records';

-- Log the migration completion
INSERT INTO activity_logs (
    id,
    type,
    entity,
    entityId,
    entityName,
    userId,
    details,
    timestamp
) VALUES (
    gen_random_uuid(),
    'MIGRATION',
    'POST_MIGRATION',
    'ai-search-feature',
    'AI Search Feature Post-Migration',
    'system',
    json_build_object(
        'migration_type', 'post_migration',
        'features_added', 'indexes, views, functions, roles',
        'timestamp', CURRENT_TIMESTAMP
    ),
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;

COMMIT;