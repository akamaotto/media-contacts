-- Enable Row Level Security on AI-related tables
ALTER TABLE ai_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_search_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contact_duplicates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_searches table
CREATE POLICY "Users can view own searches" ON ai_searches
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own searches" ON ai_searches
    FOR INSERT WITH CHECK ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own searches" ON ai_searches
    FOR UPDATE USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Admins can view all searches" ON ai_searches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', true)
            AND role = 'ADMIN'
        )
    );

-- RLS Policies for ai_search_sources table
CREATE POLICY "Users can view sources from own searches" ON ai_search_sources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can insert sources for own searches" ON ai_search_sources
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update sources from own searches" ON ai_search_sources
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Admins can view all sources" ON ai_search_sources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', true)
            AND role = 'ADMIN'
        )
    );

-- RLS Policies for ai_performance_logs table
CREATE POLICY "Users can view logs from own searches" ON ai_performance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can insert logs for own searches" ON ai_performance_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Admins can view all logs" ON ai_performance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', true)
            AND role = 'ADMIN'
        )
    );

-- RLS Policies for ai_search_cache table
CREATE POLICY "Users can view own cache entries" ON ai_search_cache
    FOR SELECT USING (
        "searchId" IS NULL OR
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can insert own cache entries" ON ai_search_cache
    FOR INSERT WITH CHECK (
        "searchId" IS NULL OR
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update own cache entries" ON ai_search_cache
    FOR UPDATE USING (
        "searchId" IS NULL OR
        EXISTS (
            SELECT 1 FROM ai_searches
            WHERE id = "searchId"
            AND "userId" = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Admins can view all cache entries" ON ai_search_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', true)
            AND role = 'ADMIN'
        )
    );

-- RLS Policies for ai_contact_duplicates table
CREATE POLICY "Users can view duplicates involving own contacts" ON ai_contact_duplicates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM media_contacts mc1
            WHERE mc1.id = "originalContactId"
            AND mc1."ai_search_id" IN (
                SELECT id FROM ai_searches
                WHERE "userId" = current_setting('app.current_user_id', true)
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM media_contacts mc2
            WHERE mc2.id = "duplicateContactId"
            AND mc2."ai_search_id" IN (
                SELECT id FROM ai_searches
                WHERE "userId" = current_setting('app.current_user_id', true)
            )
        )
    );

CREATE POLICY "Users can insert duplicates for own contacts" ON ai_contact_duplicates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM media_contacts mc1
            WHERE mc1.id = "originalContactId"
            AND mc1."ai_search_id" IN (
                SELECT id FROM ai_searches
                WHERE "userId" = current_setting('app.current_user_id', true)
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM media_contacts mc2
            WHERE mc2.id = "duplicateContactId"
            AND mc2."ai_search_id" IN (
                SELECT id FROM ai_searches
                WHERE "userId" = current_setting('app.current_user_id', true)
            )
        )
    );

CREATE POLICY "Users can update duplicates involving own contacts" ON ai_contact_duplicates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM media_contacts mc1
            WHERE mc1.id = "originalContactId"
            AND mc1."ai_search_id" IN (
                SELECT id FROM ai_searches
                WHERE "userId" = current_setting('app.current_user_id', true)
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM media_contacts mc2
            WHERE mc2.id = "duplicateContactId"
            AND mc2."ai_search_id" IN (
                SELECT id FROM ai_searches
                WHERE "userId" = current_setting('app.current_user_id', true)
            )
        )
    );

CREATE POLICY "Admins can view all duplicates" ON ai_contact_duplicates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = current_setting('app.current_user_id', true)
            AND role = 'ADMIN'
        )
    );

-- Function to set user context for RLS
CREATE OR REPLACE FUNCTION set_rls_user_context(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = current_setting('app.current_user_id', true)
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a search
CREATE OR REPLACE FUNCTION user_owns_search(p_search_id TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ai_searches
        WHERE id = p_search_id
        AND "userId" = COALESCE(p_user_id, current_setting('app.current_user_id', true))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;