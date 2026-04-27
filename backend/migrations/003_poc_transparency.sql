-- ============================================================
-- POC Transparency Features
-- Adds: dual rates, verification, RERA, site status, fraud, insights, developer
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS circle_rate          INTEGER DEFAULT 0,        -- govt guideline value (₹/sqft)
  ADD COLUMN IF NOT EXISTS market_rate          INTEGER DEFAULT 0,        -- actual transaction rate (₹/sqft)
  ADD COLUMN IF NOT EXISTS rate_source          VARCHAR(120),             -- e.g. "Telangana Dharani portal"
  ADD COLUMN IF NOT EXISTS rate_last_updated    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by          VARCHAR(120),
  ADD COLUMN IF NOT EXISTS verification_notes   TEXT,
  ADD COLUMN IF NOT EXISTS rera_number          VARCHAR(60),
  ADD COLUMN IF NOT EXISTS site_status          VARCHAR(20) DEFAULT 'developed'
       CHECK (site_status IN ('vacant','under_construction','developed')),
  ADD COLUMN IF NOT EXISTS developer_name       VARCHAR(150),
  ADD COLUMN IF NOT EXISTS developer_id         INTEGER,
  ADD COLUMN IF NOT EXISTS flood_risk           VARCHAR(10) DEFAULT 'low'
       CHECK (flood_risk IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS pollution_index      INTEGER,                  -- 0-500 AQI scale
  ADD COLUMN IF NOT EXISTS safety_index         INTEGER,                  -- 0-100
  ADD COLUMN IF NOT EXISTS nearby_infra         JSONB DEFAULT '[]'::jsonb,-- [{type,name,distance_km}]
  ADD COLUMN IF NOT EXISTS local_updates        JSONB DEFAULT '[]'::jsonb,-- [{date,headline}]
  ADD COLUMN IF NOT EXISTS site_photos          JSONB DEFAULT '[]'::jsonb,-- [{url,taken_at,lat,lng}]
  ADD COLUMN IF NOT EXISTS source_attribution   TEXT;

-- ─── Developers (project grouping) ──────────────────────────────
CREATE TABLE IF NOT EXISTS developers (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(150) UNIQUE NOT NULL,
  rera_id      VARCHAR(60),
  established  INTEGER,
  is_verified  BOOLEAN DEFAULT false,
  website      VARCHAR(255),
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Site verification reports (audit trail) ────────────────────
CREATE TABLE IF NOT EXISTS verification_reports (
  id            SERIAL PRIMARY KEY,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  verified_by   VARCHAR(120),
  visited_at    TIMESTAMPTZ DEFAULT NOW(),
  site_status   VARCHAR(20),
  photos        JSONB DEFAULT '[]'::jsonb,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Fraud-detection helper: index on (lat,lng) for duplicate scan ─
CREATE INDEX IF NOT EXISTS idx_properties_geo ON properties(lat, lng);
CREATE INDEX IF NOT EXISTS idx_properties_verified ON properties(is_verified);
CREATE INDEX IF NOT EXISTS idx_properties_developer ON properties(developer_id);

-- ============================================================
-- SEED demo data so dual-rate / transparency UI has values
-- ============================================================

INSERT INTO developers (name, rera_id, established, is_verified, website, description) VALUES
  ('Sunrise Builders', 'TS-RERA-DEV-00121', 2008, true, 'https://sunrise.example', 'Premium gated communities across Hyderabad.'),
  ('TechPark Realty', 'TS-RERA-DEV-00214', 2012, true, 'https://techpark.example', 'Commercial-grade tech park developments.'),
  ('Green Valley Estates', 'TS-RERA-DEV-00098', 2005, true, 'https://greenvalley.example', 'Luxury villas and serene townships.'),
  ('Downtown Holdings', 'TS-RERA-DEV-00177', 2010, true, 'https://downtown.example', 'CBD commercial real estate.'),
  ('Westside Group', 'TS-RERA-DEV-00302', 2015, false, NULL, 'Affordable township builder.'),
  ('Eastside Retail Co', 'TS-RERA-DEV-00251', 2009, true, NULL, 'Retail and commercial corridors.')
ON CONFLICT (name) DO NOTHING;

-- Backfill existing properties with realistic POC values
UPDATE properties SET
  circle_rate        = ROUND(price_per_sqft * 0.78),                      -- circle rate ~22% lower than market
  market_rate        = price_per_sqft,
  rate_source        = 'Telangana Dharani Portal',
  rate_last_updated  = NOW() - INTERVAL '14 days',
  is_verified        = true,
  verified_at        = NOW() - INTERVAL '7 days',
  verified_by        = 'POC Verifier Team',
  verification_notes = 'Site visited, documents cross-checked with sub-registrar office.',
  site_status        = 'developed',
  flood_risk         = 'low',
  pollution_index    = 92,
  safety_index       = 78,
  source_attribution = 'Govt rate: Dharani | Market rate: aggregated registrations Q4 2025'
WHERE circle_rate = 0 OR circle_rate IS NULL;

-- Per-property tweaks
UPDATE properties SET rera_number = 'P02400001234', developer_name = 'Sunrise Builders',
  developer_id = (SELECT id FROM developers WHERE name='Sunrise Builders'),
  nearby_infra = '[{"type":"Metro","name":"Financial District Metro","distance_km":0.8},{"type":"School","name":"Oakridge International","distance_km":1.5},{"type":"Hospital","name":"Continental Hospitals","distance_km":2.1}]'::jsonb,
  local_updates = '[{"date":"2026-02-10","headline":"New ORR exit ramp opens"},{"date":"2026-01-22","headline":"Outer Ring road widening approved"}]'::jsonb
  WHERE plot_id = 'PLT-001';

UPDATE properties SET rera_number = 'P02400002345', developer_name = 'TechPark Realty',
  developer_id = (SELECT id FROM developers WHERE name='TechPark Realty'),
  site_status = 'developed',
  pollution_index = 110,
  nearby_infra = '[{"type":"Metro","name":"HITEC City Metro","distance_km":0.4},{"type":"IT Park","name":"Mindspace","distance_km":0.6}]'::jsonb
  WHERE plot_id = 'PLT-002';

UPDATE properties SET rera_number = 'P02400003456', developer_name = 'Green Valley Estates',
  developer_id = (SELECT id FROM developers WHERE name='Green Valley Estates'),
  flood_risk = 'medium',
  safety_index = 84,
  nearby_infra = '[{"type":"School","name":"Glendale Academy","distance_km":2.3},{"type":"Park","name":"KBR Park","distance_km":4.0}]'::jsonb
  WHERE plot_id = 'PLT-003';

UPDATE properties SET rera_number = 'P02400004567', developer_name = 'Downtown Holdings',
  developer_id = (SELECT id FROM developers WHERE name='Downtown Holdings'),
  pollution_index = 138,
  safety_index = 72
  WHERE plot_id = 'PLT-004';

UPDATE properties SET rera_number = NULL,                                  -- unverified RERA → flagged
  developer_name = 'Westside Group',
  developer_id = (SELECT id FROM developers WHERE name='Westside Group'),
  is_verified = false, verified_by = NULL, verified_at = NULL,
  site_status = 'under_construction',
  verification_notes = 'Awaiting site visit. RERA filing not located.'
  WHERE plot_id = 'PLT-005';

UPDATE properties SET rera_number = 'P02400006789', developer_name = 'Eastside Retail Co',
  developer_id = (SELECT id FROM developers WHERE name='Eastside Retail Co'),
  pollution_index = 125
  WHERE plot_id = 'PLT-006';
