-- Add comprehensive cost tracking tables

-- Cost tracking entries for all AI operations
CREATE TABLE IF NOT EXISTS ai_cost_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  session_id TEXT,
  contact_id TEXT,
  request_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost budgets for users and teams
CREATE TABLE IF NOT EXISTS ai_cost_budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  budget_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'total'
  amount DECIMAL(10, 2) NOT NULL,
  spent DECIMAL(10, 2) DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  alert_thresholds JSONB DEFAULT '[50, 75, 90]',
  alerts_sent JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost usage alerts
CREATE TABLE IF NOT EXISTS ai_cost_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'budget_threshold', 'unusual_spending', 'cost_spike', 'quota_exceeded'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  budget_id TEXT,
  current_spend DECIMAL(10, 2) NOT NULL,
  threshold DECIMAL(10, 2),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost optimization recommendations
CREATE TABLE IF NOT EXISTS ai_cost_optimizations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'caching', 'batching', 'provider_switch', 'query_optimization'
  description TEXT NOT NULL,
  potential_savings DECIMAL(10, 2), -- USD per month
  implementation_effort TEXT NOT NULL, -- 'low', 'medium', 'high'
  priority TEXT NOT NULL, -- 'low', 'medium', 'high'
  status TEXT DEFAULT 'recommended', -- 'recommended', 'implemented', 'rejected'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost metrics aggregation for faster reporting
CREATE TABLE IF NOT EXISTS ai_cost_metrics_daily (
  date DATE PRIMARY KEY,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_operations INTEGER DEFAULT 0,
  openai_cost DECIMAL(10, 2) DEFAULT 0,
  openai_tokens INTEGER DEFAULT 0,
  anthropic_cost DECIMAL(10, 2) DEFAULT 0,
  anthropic_tokens INTEGER DEFAULT 0,
  exa_cost DECIMAL(10, 2) DEFAULT 0,
  exa_searches INTEGER DEFAULT 0,
  firecrawl_cost DECIMAL(10, 2) DEFAULT 0,
  firecrawl_crawls INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost metrics by user
CREATE TABLE IF NOT EXISTS ai_cost_metrics_user_daily (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  total_operations INTEGER DEFAULT 0,
  openai_cost DECIMAL(10, 2) DEFAULT 0,
  anthropic_cost DECIMAL(10, 2) DEFAULT 0,
  exa_cost DECIMAL(10, 2) DEFAULT 0,
  firecrawl_cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, user_id)
);

-- Cost forecasting data
CREATE TABLE IF NOT EXISTS ai_cost_forecasts (
  id TEXT PRIMARY KEY,
  forecast_date DATE NOT NULL,
  forecast_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  predicted_cost DECIMAL(10, 2) NOT NULL,
  confidence_level DECIMAL(3, 2), -- 0.00 to 1.00
  model_version TEXT NOT NULL,
  training_data_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_cost_entries_user_id ON ai_cost_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_entries_timestamp ON ai_cost_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_cost_entries_provider ON ai_cost_entries(provider);
CREATE INDEX IF NOT EXISTS idx_ai_cost_entries_operation_type ON ai_cost_entries(operation_type);
CREATE INDEX IF NOT EXISTS idx_ai_cost_entries_created_at ON ai_cost_entries(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_user_id ON ai_cost_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_period ON ai_cost_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_is_active ON ai_cost_budgets(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_cost_alerts_user_id ON ai_cost_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_alerts_severity ON ai_cost_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ai_cost_alerts_created_at ON ai_cost_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_cost_alerts_acknowledged ON ai_cost_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_daily_date ON ai_cost_metrics_daily(date);
CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_user_daily_date ON ai_cost_metrics_user_daily(date);
CREATE INDEX IF NOT EXISTS idx_ai_cost_metrics_user_daily_user_id ON ai_cost_metrics_user_daily(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_cost_forecasts_forecast_date ON ai_cost_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_ai_cost_forecasts_forecast_type ON ai_cost_forecasts(forecast_type);

-- Create trigger to update daily metrics
CREATE OR REPLACE FUNCTION update_daily_cost_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_cost_metrics_daily (
    date,
    total_cost,
    total_tokens,
    total_operations,
    openai_cost,
    openai_tokens,
    anthropic_cost,
    anthropic_tokens,
    exa_cost,
    exa_searches,
    firecrawl_cost,
    firecrawl_crawls,
    unique_users,
    updated_at
  )
  VALUES (
    CURRENT_DATE,
    NEW.cost,
    NEW.tokens_used,
    1,
    CASE WHEN NEW.provider = 'openai' THEN NEW.cost ELSE 0 END,
    CASE WHEN NEW.provider = 'openai' THEN NEW.tokens_used ELSE 0 END,
    CASE WHEN NEW.provider = 'anthropic' THEN NEW.cost ELSE 0 END,
    CASE WHEN NEW.provider = 'anthropic' THEN NEW.tokens_used ELSE 0 END,
    CASE WHEN NEW.provider = 'exa' THEN NEW.cost ELSE 0 END,
    CASE WHEN NEW.operation_type = 'search' AND NEW.provider = 'exa' THEN 1 ELSE 0 END,
    CASE WHEN NEW.provider = 'firecrawl' THEN NEW.cost ELSE 0 END,
    CASE WHEN NEW.operation_type = 'search' AND NEW.provider = 'firecrawl' THEN 1 ELSE 0 END,
    1,
    NOW()
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_cost = ai_cost_metrics_daily.total_cost + EXCLUDED.total_cost,
    total_tokens = ai_cost_metrics_daily.total_tokens + EXCLUDED.total_tokens,
    total_operations = ai_cost_metrics_daily.total_operations + EXCLUDED.total_operations,
    openai_cost = ai_cost_metrics_daily.openai_cost + EXCLUDED.openai_cost,
    openai_tokens = ai_cost_metrics_daily.openai_tokens + EXCLUDED.openai_tokens,
    anthropic_cost = ai_cost_metrics_daily.anthropic_cost + EXCLUDED.anthropic_cost,
    anthropic_tokens = ai_cost_metrics_daily.anthropic_tokens + EXCLUDED.anthropic_tokens,
    exa_cost = ai_cost_metrics_daily.exa_cost + EXCLUDED.exa_cost,
    exa_searches = ai_cost_metrics_daily.exa_searches + EXCLUDED.exa_searches,
    firecrawl_cost = ai_cost_metrics_daily.firecrawl_cost + EXCLUDED.firecrawl_cost,
    firecrawl_crawls = ai_cost_metrics_daily.firecrawl_crawls + EXCLUDED.firecrawl_crawls,
    unique_users = (
      SELECT COUNT(DISTINCT user_id)
      FROM ai_cost_entries
      WHERE DATE(timestamp) = CURRENT_DATE
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_cost_metrics
AFTER INSERT ON ai_cost_entries
FOR EACH ROW
EXECUTE FUNCTION update_daily_cost_metrics();