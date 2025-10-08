-- Update search statistics automatically
CREATE OR REPLACE FUNCTION update_search_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update search summary when sources are added or updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE ai_searches
        SET
            contacts_found = (
                SELECT COALESCE(SUM(contact_count), 0)
                FROM ai_search_sources
                WHERE search_id = NEW.search_id
            ),
            updated_at = NOW()
        WHERE id = NEW.search_id;
    END IF;

    -- Handle source deletion
    IF TG_OP = 'DELETE' THEN
        UPDATE ai_searches
        SET
            contacts_found = (
                SELECT COALESCE(SUM(contact_count), 0)
                FROM ai_search_sources
                WHERE search_id = OLD.search_id
            ),
            updated_at = NOW()
        WHERE id = OLD.search_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Automated cache cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_search_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Performance reporting function
CREATE OR REPLACE FUNCTION get_search_performance_metrics(
    p_user_id TEXT DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    search_id TEXT,
    user_id TEXT,
    status TEXT,
    duration_seconds INTEGER,
    contacts_found INTEGER,
    contacts_imported INTEGER,
    success_rate DECIMAL(5,2),
    average_processing_time_ms INTEGER,
    completed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s."userId",
        s.status,
        s.duration_seconds,
        s.contacts_found,
        s.contacts_imported,
        CASE
            WHEN s.status = 'COMPLETED' THEN 100.0
            WHEN s.status = 'FAILED' THEN 0.0
            ELSE NULL
        END as success_rate,
        AVG(pl.duration_ms)::INTEGER as average_processing_time_ms,
        s.completed_at
    FROM ai_searches s
    LEFT JOIN ai_performance_logs pl ON s.id = pl.search_id
    WHERE
        (p_user_id IS NULL OR s."userId" = p_user_id)
        AND (p_date_from IS NULL OR DATE(s.created_at) >= p_date_from)
        AND (p_date_to IS NULL OR DATE(s.created_at) <= p_date_to)
    GROUP BY s.id, s."userId", s.status, s.duration_seconds, s.contacts_found, s.contacts_imported, s.completed_at
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Budget monitoring and alerting function
CREATE OR REPLACE FUNCTION check_budget_alerts(p_user_id TEXT)
RETURNS TABLE (
    search_count_today INTEGER,
    search_count_this_month INTEGER,
    contacts_found_today INTEGER,
    contacts_found_this_month INTEGER,
    daily_budget_remaining INTEGER,
    monthly_budget_remaining INTEGER,
    alert_level TEXT
) AS $$
DECLARE
    daily_budget INTEGER := 100; -- Example: 100 searches per day
    monthly_budget INTEGER := 2000; -- Example: 2000 searches per month
    searches_today INTEGER;
    searches_month INTEGER;
    contacts_today INTEGER;
    contacts_month INTEGER;
BEGIN
    -- Count searches today
    SELECT COUNT(*) INTO searches_today
    FROM ai_searches
    WHERE "userId" = p_user_id
    AND DATE(created_at) = CURRENT_DATE;

    -- Count searches this month
    SELECT COUNT(*) INTO searches_month
    FROM ai_searches
    WHERE "userId" = p_user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

    -- Count contacts found today
    SELECT COALESCE(SUM(contacts_found), 0) INTO contacts_today
    FROM ai_searches
    WHERE "userId" = p_user_id
    AND DATE(created_at) = CURRENT_DATE;

    -- Count contacts found this month
    SELECT COALESCE(SUM(contacts_found), 0) INTO contacts_month
    FROM ai_searches
    WHERE "userId" = p_user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

    RETURN QUERY SELECT
        searches_today,
        searches_month,
        contacts_today,
        contacts_month,
        GREATEST(0, daily_budget - searches_today),
        GREATEST(0, monthly_budget - searches_month),
        CASE
            WHEN searches_month >= monthly_budget THEN 'CRITICAL'
            WHEN searches_today >= daily_budget THEN 'WARNING'
            WHEN searches_today >= daily_budget * 0.8 THEN 'INFO'
            ELSE 'OK'
        END as alert_level;
END;
$$ LANGUAGE plpgsql;

-- Event logging for audit trails
CREATE OR REPLACE FUNCTION record_search_event(
    p_search_id TEXT,
    p_event_type TEXT,
    p_event_details JSONB DEFAULT NULL,
    p_user_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    -- Insert into activity logs
    INSERT INTO activity_logs (
        id,
        type,
        entity,
        entity_id,
        entity_name,
        "userId",
        details,
        timestamp
    ) VALUES (
        gen_random_uuid()::TEXT,
        p_event_type,
        'ai_search',
        p_search_id,
        'AI Search ' || SUBSTRING(p_search_id, 1, 8),
        COALESCE(p_user_id, (SELECT "userId" FROM ai_searches WHERE id = p_search_id)),
        p_event_details,
        NOW()
    ) RETURNING id::UUID INTO event_id;

    -- Also log to performance logs if it's a performance-related event
    IF p_event_type IN ('search_started', 'search_completed', 'search_failed', 'source_processed') THEN
        INSERT INTO ai_performance_logs (
            id,
            "searchId",
            operation,
            "startTime",
            "endTime",
            status,
            metadata,
            created_at
        ) VALUES (
            gen_random_uuid()::TEXT,
            p_search_id,
            p_event_type,
            NOW(),
            NOW(),
            'logged',
            p_event_details,
            NOW()
        );
    END IF;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic statistics updates
CREATE TRIGGER trigger_update_search_statistics
    AFTER INSERT OR UPDATE OR DELETE ON ai_search_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_search_statistics();

-- Create scheduled task for cache cleanup (this would need pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-cache', '0 */6 * * *', 'SELECT cleanup_expired_cache();');

-- AI Search Analytics View
CREATE OR REPLACE VIEW ai_search_metrics AS
SELECT
    DATE_TRUNC('day', s.created_at) as search_date,
    COUNT(*) as total_searches,
    COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as completed_searches,
    COUNT(CASE WHEN s.status = 'FAILED' THEN 1 END) as failed_searches,
    COUNT(CASE WHEN s.status = 'CANCELLED' THEN 1 END) as cancelled_searches,
    SUM(s.contacts_found) as total_contacts_found,
    SUM(s.contacts_imported) as total_contacts_imported,
    ROUND(AVG(s.duration_seconds), 2) as average_duration_seconds,
    COUNT(DISTINCT s."userId") as unique_users,
    (SELECT COUNT(DISTINCT DATE(created_at)) FROM ai_searches) as total_days_in_period
FROM ai_searches s
GROUP BY DATE_TRUNC('day', s.created_at)
ORDER BY search_date DESC;

-- User-specific search patterns view
CREATE OR REPLACE VIEW user_search_patterns AS
SELECT
    u.id as user_id,
    u.name as user_name,
    u.email,
    COUNT(s.id) as total_searches,
    COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as successful_searches,
    COUNT(CASE WHEN s.status = 'FAILED' THEN 1 END) as failed_searches,
    SUM(s.contacts_found) as total_contacts_found,
    SUM(s.contacts_imported) as total_contacts_imported,
    ROUND(AVG(s.duration_seconds), 2) as average_duration_seconds,
    MAX(s.created_at) as last_search_date,
    COUNT(CASE WHEN DATE(s.created_at) = CURRENT_DATE THEN 1 END) as searches_today,
    COUNT(CASE WHEN DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as searches_this_month
FROM users u
LEFT JOIN ai_searches s ON u.id = s."userId"
GROUP BY u.id, u.name, u.email
ORDER BY total_searches DESC;

-- Cost tracking and budget monitoring view
CREATE OR REPLACE VIEW cost_tracking AS
SELECT
    DATE_TRUNC('day', s.created_at) as date,
    COUNT(*) as daily_searches,
    SUM(s.contacts_found) as daily_contacts_found,
    -- Example cost calculations (adjust based on actual pricing)
    COUNT(*) * 0.01 as search_cost, -- $0.01 per search
    SUM(s.contacts_found) * 0.001 as contact_cost, -- $0.001 per contact found
    (COUNT(*) * 0.01) + (SUM(s.contacts_found) * 0.001) as total_daily_cost,
    COUNT(DISTINCT s."userId") as active_users,
    ROUND(AVG(s.duration_seconds), 2) as average_duration_seconds
FROM ai_searches s
WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', s.created_at)
ORDER BY date DESC;

-- Duplicate analysis view
CREATE OR REPLACE VIEW duplicate_analysis AS
SELECT
    DATE_TRUNC('day', d.created_at) as analysis_date,
    d."duplicateType",
    COUNT(*) as total_duplicates,
    AVG(d."similarityScore") as average_similarity_score,
    COUNT(CASE WHEN d."verificationStatus" = 'CONFIRMED' THEN 1 END) as confirmed_duplicates,
    COUNT(CASE WHEN d."verificationStatus" = 'REJECTED' THEN 1 END) as rejected_duplicates,
    COUNT(CASE WHEN d."verificationStatus" = 'PENDING' THEN 1 END) as pending_duplicates,
    ROUND(
        COUNT(CASE WHEN d."verificationStatus" = 'CONFIRMED' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as confirmation_rate_percentage
FROM ai_contact_duplicates d
GROUP BY DATE_TRUNC('day', d.created_at), d."duplicateType"
ORDER BY analysis_date DESC, d."duplicateType";

-- Source quality analysis view
CREATE OR REPLACE VIEW source_quality_metrics AS
SELECT
    src."sourceType",
    COUNT(*) as total_sources,
    AVG(src."confidenceScore") as average_confidence_score,
    SUM(src."contactCount") as total_contacts_extracted,
    AVG(src."processingTimeMs") as average_processing_time_ms,
    COUNT(DISTINCT src.domain) as unique_domains,
    COUNT(CASE WHEN src."confidenceScore" >= 0.8 THEN 1 END) as high_quality_sources,
    COUNT(CASE WHEN src."confidenceScore" >= 0.6 AND src."confidenceScore" < 0.8 THEN 1 END) as medium_quality_sources,
    COUNT(CASE WHEN src."confidenceScore" < 0.6 THEN 1 END) as low_quality_sources,
    ROUND(
        COUNT(CASE WHEN src."confidenceScore" >= 0.8 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as high_quality_percentage
FROM ai_search_sources src
GROUP BY src."sourceType"
ORDER BY average_confidence_score DESC;