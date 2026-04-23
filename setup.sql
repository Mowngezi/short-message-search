-- ──────────────────────────────────────────────
-- SOURCE-SMS — Supabase Table Setup
-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ──────────────────────────────────────────────

-- Table 1: SMS Exchange Log (may already exist)
CREATE TABLE IF NOT EXISTS sms_exchanges (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL,
    inbound_query TEXT NOT NULL,
    outbound_response TEXT,
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: User Profiles (Home Node — Semantic GPS)
-- Stores each user's location anchor so future queries
-- are automatically location-aware without GPS hardware.
CREATE TABLE IF NOT EXISTS user_profiles (
    phone_number TEXT PRIMARY KEY,
    geo_tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (good practice)
ALTER TABLE sms_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your SUPABASE_KEY)
CREATE POLICY "Service role access" ON sms_exchanges
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role access" ON user_profiles
    FOR ALL USING (true) WITH CHECK (true);
