-- ──────────────────────────────────────────────
-- SOURCE-SMS — Supabase Table Setup
-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ──────────────────────────────────────────────

-- Table 1: SMS Exchange Log (may already exist)
-- Uses UUID primary key to match Supabase's default auto-generated convention.
CREATE TABLE IF NOT EXISTS sms_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Table 3: Inventory Ledger (Source of truth for supply)
-- Every supply message lands here. `inventory.json` on the
-- server is a runtime cache that gets rehydrated from this
-- table on boot — so Railway's ephemeral filesystem can wipe
-- the cache without losing vendor stock. The ledger is the
-- market's memory: the audit log IS the inventory.
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_phone TEXT NOT NULL,
    raw_update TEXT NOT NULL,
    geo_tag TEXT DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index supports the hot boot query: last N hours of supply.
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_created_at
    ON inventory_ledger (created_at DESC);

-- Enable Row Level Security (good practice)
ALTER TABLE sms_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your SUPABASE_KEY)
CREATE POLICY "Service role access" ON sms_exchanges
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role access" ON user_profiles
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role access" ON inventory_ledger
    FOR ALL USING (true) WITH CHECK (true);
