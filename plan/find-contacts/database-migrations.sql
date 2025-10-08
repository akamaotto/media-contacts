-- Database Migrations for Find Contacts with AI Feature
-- Version: 1.0.0
-- Created: 2025-01-15
-- Description: Adds tables and columns for AI-powered contact discovery

-- Migration: 001_create_ai_searches_table.sql
CREATE TABLE ai_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_config JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_contacts_found INTEGER DEFAULT 0,
    contacts_imported INTEGER DEFAULT 0,
    search_duration_seconds INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT ai_searches_user_status_idx UNIQUE (user_id, status),
    CONSTRAINT ai_searches_duration_check CHECK (search_duration_seconds >= 0),
    CONSTRAINT ai_searches_contacts_check CHECK (total_contacts_found >= 0 AND contacts_imported >= 0)
);

-- Indexes for performance
CREATE INDEX idx_ai_searches_user_id ON ai_searches(user_id);
CREATE INDEX idx_ai_searches_status ON ai_searches(status);
CREATE INDEX idx_ai_searches_created_at ON ai_searches(created_at DESC);
CREATE INDEX idx_ai_searches_user_created ON ai_searches(user_id, created_at DESC);

-- Migration: 002_create_ai_search_sources_table.sql
CREATE TABLE ai_search_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID NOT NULL REFERENCES ai_searches(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    domain_name VARCHAR(255),
    title TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    contacts_extracted INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT ai_search_sources_type_check CHECK (source_type IN ('media_outlet', 'linkedin', 'twitter', 'personal_website', 'company_page', 'other')),
    CONSTRAINT ai_search_sources_processing_time_check CHECK (processing_time_ms >= 0),
    CONSTRAINT ai_search_sources_contacts_check CHECK (contacts_extracted >= 0)
);

-- Indexes for performance
CREATE INDEX idx_ai_search_sources_search_id ON ai_search_sources(search_id);
CREATE INDEX idx_ai_search_sources_domain ON ai_search_sources(domain_name);
CREATE INDEX idx_ai_search_sources_type ON ai_search_sources(source_type);
CREATE INDEX idx_ai_search_sources_confidence ON ai_search_sources(confidence_score);
CREATE INDEX idx_ai_search_sources_created_at ON ai_search_sources(created_at DESC);

-- Migration: 003_alter_media_contacts_add_ai_fields.sql
ALTER TABLE media_contacts 
ADD COLUMN discovery_source VARCHAR(50) DEFAULT NULL,
ADD COLUMN discovery_method VARCHAR(50) DEFAULT NULL,
ADD COLUMN ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
ADD COLUMN discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN ai_search_id UUID REFERENCES ai_searches(id) DEFAULT NULL,
ADD COLUMN discovery_metadata JSONB DEFAULT NULL;

-- Add constraints for new columns
ALTER TABLE media_contacts 
ADD CONSTRAINT media_contacts_discovery_source_check 
    CHECK (discovery_source IN ('manual', 'ai_search', 'csv_import', 'api', 'other'));

ALTER TABLE media_contacts 
ADD CONSTRAINT media_contacts_discovery_method_check 
    CHECK (discovery_method IN ('ai_openai', 'ai_anthropic', 'ai_exa', 'ai_firecrawl', 'ai_combined', 'other'));

-- Add indexes for performance
CREATE INDEX idx_media_contacts_discovery_source ON media_contacts(discovery_source);
CREATE INDEX idx_media_contacts_discovery_method ON media_contacts(discovery_method);
CREATE INDEX idx_media_contacts_ai_confidence ON media_contacts(ai_confidence_score);
CREATE INDEX idx_media_contacts_discovered_at ON media_contacts(discovered_at DESC);
CREATE INDEX idx_media_contacts_ai_search_id ON media_contacts(ai_search_id);
CREATE INDEX idx_media_contacts_discovery_composite ON media_contacts(discovery_source, discovered_at DESC);

-- Migration: 004_create_ai_search_metrics_view.sql
CREATE VIEW ai_search_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_searches,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_searches,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_searches,
    AVG(total_contacts_found) as avg_contacts_found,
    AVG(contacts_imported) as avg_contacts_imported,
    AVG(search_duration_seconds) as avg_duration_seconds,
    SUM(total_contacts_found) as total_contacts_found,
    SUM(contacts_imported) as total_contacts_imported
FROM ai_searches 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Migration: 005_create_ai_performance_logs_table.sql
CREATE TABLE ai_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES ai_searches(id) ON DELETE SET NULL,
    operation VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT ai_performance_logs_duration_check CHECK (duration_ms >= 0)
);

-- Indexes for performance
CREATE INDEX idx_ai_performance_logs_search_id ON ai_performance_logs(search_id);
CREATE INDEX idx_ai_performance_logs_operation ON ai_performance_logs(operation);
CREATE INDEX idx_ai_performance_logs_start_time ON ai_performance_logs(start_time DESC);
CREATE INDEX idx_ai_performance_logs_success ON ai_performance_logs(success);
CREATE INDEX idx_ai_performance_logs_duration ON ai_performance_logs(duration_ms);

-- Migration: 006_create_ai_search_cache_table.sql
CREATE TABLE ai_search_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    search_config JSONB NOT NULL,
    search_results JSONB NOT NULL,
    contact_count INTEGER NOT NULL,
    average_confidence DECIMAL(3,2),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    
    -- Constraints
    CONSTRAINT ai_search_cache_contact_count_check CHECK (contact_count >= 0),
    CONSTRAINT ai_search_cache_confidence_check CHECK (average_confidence >= 0 AND average_confidence <= 1),
    CONSTRAINT ai_search_cache_access_count_check CHECK (access_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_ai_search_cache_query_hash ON ai_search_cache(query_hash);
CREATE INDEX idx_ai_search_cache_expires_at ON ai_search_cache(expires_at);
CREATE INDEX idx_ai_search_cache_last_accessed ON ai_search_cache(last_accessed DESC);
CREATE INDEX idx_ai_search_cache_contact_count ON ai_search_cache(contact_count DESC);

-- Migration: 007_create_ai_contact_duplicates_table.sql
CREATE TABLE ai_contact_duplicates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_contact_id UUID NOT NULL REFERENCES media_contacts(id) ON DELETE CASCADE,
    duplicate_contact_id UUID REFERENCES media_contacts(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3,2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    duplicate_type VARCHAR(50) NOT NULL CHECK (duplicate_type IN ('email', 'name_outlet', 'social_profile', 'combined')),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'confirmed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT ai_contact_duplicates_unique_pair UNIQUE (original_contact_id, duplicate_contact_id),
    CONSTRAINT ai_contact_duplicates_not_same CHECK (original_contact_id != duplicate_contact_id)
);

-- Indexes for performance
CREATE INDEX idx_ai_contact_duplicates_original ON ai_contact_duplicates(original_contact_id);
CREATE INDEX idx_ai_contact_duplicates_duplicate ON ai_contact_duplicates(duplicate_contact_id);
CREATE INDEX idx_ai_contact_duplicates_similarity ON ai_contact_duplicates(similarity_score DESC);
CREATE INDEX idx_ai_contact_duplicates_status ON ai_contact_duplicates(verification_status);

-- Migration: 008_create_functions_and_triggers.sql

-- Function to update search statistics
CREATE OR REPLACE FUNCTION update_search_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update user's search count
        INSERT INTO user_statistics (user_id, ai_searches_count, last_ai_search_at)
        VALUES (NEW.user_id, 1, NEW.created_at)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            ai_searches_count = user_statistics.ai_searches_count + 1,
            last_ai_search_at = NEW.created_at;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update statistics
CREATE TRIGGER trigger_update_search_statistics
    AFTER INSERT OR UPDATE ON ai_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_search_statistics();

-- Function to clean up expired cache entries
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

-- Function to get search performance metrics
CREATE OR REPLACE FUNCTION get_search_performance_metrics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    date TIMESTAMP WITH TIME ZONE,
    total_searches BIGINT,
    successful_searches BIGINT,
    failed_searches BIGINT,
    avg_duration_seconds DECIMAL,
    avg_contacts_found DECIMAL,
    avg_confidence_score DECIMAL,
    cache_hit_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('day', s.created_at) as date,
        COUNT(*) as total_searches,
        COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as successful_searches,
        COUNT(CASE WHEN s.status = 'failed' THEN 1 END) as failed_searches,
        AVG(s.search_duration_seconds) as avg_duration_seconds,
        AVG(s.total_contacts_found) as avg_contacts_found,
        AVG(
            (SELECT AVG(mc.ai_confidence_score) 
             FROM media_contacts mc 
             WHERE mc.ai_search_id = s.id AND mc.ai_confidence_score IS NOT NULL)
        ) as avg_confidence_score,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (SELECT COUNT(*)::DECIMAL / COUNT(*) 
                 FROM ai_search_cache sc 
                 WHERE sc.last_accessed BETWEEN start_date AND end_date)
            ELSE 0 
        END as cache_hit_rate
    FROM ai_searches s
    WHERE s.created_at BETWEEN start_date AND end_date
    GROUP BY DATE_TRUNC('day', s.created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Migration: 009_add_indexes_for_optimization.sql
-- Composite indexes for common queries
CREATE INDEX idx_ai_searches_user_status_created ON ai_searches(user_id, status, created_at DESC);
CREATE INDEX idx_media_contacts_discovery_confidence ON media_contacts(discovery_source, ai_confidence_score DESC);
CREATE INDEX idx_ai_search_sources_search_type_confidence ON ai_search_sources(search_id, source_type, confidence_score DESC);

-- Partial indexes for better performance
CREATE INDEX idx_ai_searches_active ON ai_searches(created_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_media_contacts_ai_discovered ON media_contacts(discovered_at DESC) WHERE discovery_source = 'ai_search';
CREATE INDEX idx_ai_performance_logs_slow_operations ON ai_performance_logs(duration_ms DESC) WHERE duration_ms > 5000;

-- Migration: 010_create_initial_data.sql
-- Insert default AI search configuration templates
INSERT INTO ai_search_cache (
    query_hash,
    search_config,
    search_results,
    contact_count,
    average_confidence,
    expires_at
) VALUES (
    'default_tech_us_template',
    '{"countries": ["US"], "categories": ["Technology"], "maxResults": 25}',
    '{"contacts": [], "sources": [], "statistics": {"averageConfidence": 0.75}}',
    0,
    0.75,
    NOW() + INTERVAL '30 days'
) ON CONFLICT (query_hash) DO NOTHING;

-- Create default user statistics records for existing users
INSERT INTO user_statistics (user_id, ai_searches_count, last_ai_search_at)
SELECT id, 0, NULL
FROM users
WHERE id NOT IN (SELECT user_id FROM user_statistics)
ON CONFLICT (user_id) DO NOTHING;

-- Migration: 011_add_row_level_security.sql
-- Enable RLS on AI tables
ALTER TABLE ai_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_search_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contact_duplicates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY ai_searches_user_policy ON ai_searches
    FOR ALL
    TO authenticated_users
    USING (user_id = current_user_id());

CREATE POLICY ai_search_sources_user_policy ON ai_search_sources
    FOR ALL
    TO authenticated_users
    USING (
        search_id IN (
            SELECT id FROM ai_searches 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY ai_performance_logs_user_policy ON ai_performance_logs
    FOR ALL
    TO authenticated_users
    USING (
        search_id IN (
            SELECT id FROM ai_searches 
            WHERE user_id = current_user_id()
        )
    );

CREATE POLICY ai_contact_duplicates_user_policy ON ai_contact_duplicates
    FOR ALL
    TO authenticated_users
    USING (
        original_contact_id IN (
            SELECT id FROM media_contacts 
            WHERE user_id = current_user_id()
        )
    );

-- Migration: 012_add_audit_triggers.sql
-- Audit trail for important operations
CREATE TABLE ai_search_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Indexes for audit table
CREATE INDEX idx_ai_search_audit_table_record ON ai_search_audit(table_name, record_id);
CREATE INDEX idx_ai_search_audit_timestamp ON ai_search_audit(timestamp DESC);
CREATE INDEX idx_ai_search_audit_user ON ai_search_audit(user_id);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_ai_search_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO ai_search_audit (table_name, record_id, operation, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), OLD.user_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO ai_search_audit (table_name, record_id, operation, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), NEW.user_id);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO ai_search_audit (table_name, record_id, operation, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), NEW.user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_ai_searches
    AFTER INSERT OR UPDATE OR DELETE ON ai_searches
    FOR EACH ROW
    EXECUTE FUNCTION audit_ai_search_changes();

-- Migration complete notice
DO $$
BEGIN
    RAISE NOTICE 'AI Search Feature Database Migration Complete';
    RAISE NOTICE 'Version: 1.0.0';
    RAISE NOTICE 'Tables created: ai_searches, ai_search_sources, ai_performance_logs, ai_search_cache, ai_contact_duplicates, ai_search_audit';
    RAISE NOTICE 'Views created: ai_search_metrics';
    RAISE NOTICE 'Indexes created: 15+ performance indexes';
    RAISE NOTICE 'Functions created: get_search_performance_metrics, cleanup_expired_cache, update_search_statistics';
    RAISE NOTICE 'Security: Row-level security enabled';
    RAISE NOTICE 'Audit trail: Automatic audit logging enabled';
END $$;