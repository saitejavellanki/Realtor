-- ============================================================
-- Real Estate App - Database Schema + Seed Data
-- Run: psql -U postgres -d realestate -f migrations/001_init.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id             SERIAL PRIMARY KEY,
  plot_id        VARCHAR(20) UNIQUE NOT NULL,
  title          VARCHAR(200) NOT NULL,
  area           VARCHAR(100) NOT NULL,
  location       VARCHAR(200),
  category_type  VARCHAR(20) NOT NULL CHECK (category_type IN ('residential','commercial')),
  property_type  VARCHAR(50),
  room_count     VARCHAR(10),
  status         VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','Sold','Reserved','Draft')),
  price_per_sqft INTEGER NOT NULL DEFAULT 0,
  size           NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit           VARCHAR(10) NOT NULL DEFAULT 'sq.ft',
  zoning         VARCHAR(100),
  description    TEXT,
  beds           INTEGER DEFAULT 0,
  baths          INTEGER DEFAULT 0,
  garage         INTEGER DEFAULT 0,
  year_built     INTEGER,
  demand         VARCHAR(20) DEFAULT 'Medium' CHECK (demand IN ('High','Medium','Low')),
  agent_name     VARCHAR(100),
  agent_role     VARCHAR(100),
  agent_contact  VARCHAR(30),
  approval_status VARCHAR(20) DEFAULT 'Pending' CHECK (approval_status IN ('Pending','Approved','Rejected')),
  is_public      BOOLEAN NOT NULL DEFAULT false,
  notes          TEXT,
  lat            NUMERIC(10,7),
  lng            NUMERIC(10,7),
  current_price  BIGINT DEFAULT 0,
  past_year_gain BIGINT DEFAULT 0,
  price_change   VARCHAR(50),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
  id           SERIAL PRIMARY KEY,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  price        INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: Admin User (password = admin123)
-- ============================================================
INSERT INTO admin_users (email, password_hash) VALUES
  ('admin@realestate.com', crypt('admin123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SEED: Properties (matches mobile app hardcoded data)
-- ============================================================
INSERT INTO properties (
  plot_id, title, area, location, category_type, property_type, room_count,
  status, price_per_sqft, size, unit, zoning, description,
  beds, baths, garage, year_built, demand,
  agent_name, agent_role, agent_contact,
  approval_status, is_public,
  lat, lng, current_price, past_year_gain, price_change
) VALUES
(
  'PLT-001',
  'Sunrise Heights - Block A',
  'Financial District',
  'Plot 12, Sector 4, Financial District',
  'residential', 'Gated Community', '3bhk',
  'Available', 4950, 1200, 'sq.ft',
  'Residential - Gated Community',
  'A premium gated community in the heart of the financial district with world-class amenities.',
  3, 2, 1, 2022, 'High',
  'Rajesh Kumar', 'Senior Property Consultant', '+91 98765 43210',
  'Approved', true,
  17.4123, 78.4234, 59400000, 4200000, '+7.6% vs last year'
),
(
  'PLT-002',
  'Tech Park Commercial Hub',
  'Tech Park',
  'Plot 7, Tech Park Zone, Hyderabad',
  'commercial', NULL, NULL,
  'Available', 7200, 2400, 'sq.ft',
  'Commercial - Tech Park',
  'Premium commercial space in the heart of the technology corridor with excellent connectivity.',
  0, 2, 4, 2021, 'High',
  'Priya Sharma', 'Commercial Property Specialist', '+91 87654 32109',
  'Approved', true,
  17.4456, 78.3812, 172800000, 19200000, '+12.5% vs last year'
),
(
  'PLT-003',
  'Green Valley Villa',
  'North County',
  'Plot 23, Green Valley Layout, North County',
  'residential', 'Villa', '4bhk',
  'Sold', 6800, 3200, 'sq.ft',
  'Residential - Villa',
  'Luxurious villa with private garden and premium fittings in a serene neighbourhood.',
  4, 3, 2, 2020, 'Medium',
  'Amit Patel', 'Luxury Property Advisor', '+91 76543 21098',
  'Approved', true,
  17.5123, 78.5012, 217600000, 13600000, '+6.7% vs last year'
),
(
  'PLT-004',
  'Downtown Business Centre',
  'Downtown',
  'Plot 5, CBD Zone, Downtown',
  'commercial', NULL, NULL,
  'Reserved', 9500, 5000, 'sq.ft',
  'Commercial - CBD',
  'Prime commercial space in the central business district with excellent visibility.',
  0, 4, 10, 2023, 'High',
  'Sunita Rao', 'Commercial Leasing Expert', '+91 65432 10987',
  'Approved', true,
  17.3856, 78.4890, 475000000, 57000000, '+13.6% vs last year'
),
(
  'PLT-005',
  'Westside Apartments',
  'Westside',
  'Plot 18, Westside Township, Hyderabad',
  'residential', 'Apartment', '2bhk',
  'Available', 3800, 850, 'sq.ft',
  'Residential - Apartment',
  'Modern 2BHK apartment with all amenities in a well-connected township.',
  2, 2, 1, 2023, 'Medium',
  'Kiran Mehta', 'Residential Sales Manager', '+91 54321 09876',
  'Approved', true,
  17.4678, 78.3456, 32300000, 1615000, '+5.3% vs last year'
),
(
  'PLT-006',
  'Eastside Retail Space',
  'Eastside',
  'Plot 9, Eastside Commercial Area',
  'commercial', NULL, NULL,
  'Sold', 5600, 1800, 'sq.ft',
  'Commercial - Retail',
  'High-footfall retail space in a bustling commercial corridor.',
  0, 2, 5, 2019, 'Low',
  'Deepak Verma', 'Retail Property Specialist', '+91 43210 98765',
  'Approved', true,
  17.4234, 78.5678, 100800000, 4032000, '+4.2% vs last year'
)
ON CONFLICT (plot_id) DO NOTHING;

-- ============================================================
-- SEED: Price History
-- ============================================================
INSERT INTO price_history (property_id, year, price)
SELECT p.id, h.year, h.price FROM properties p
JOIN (VALUES
  ('PLT-001', 2019, 32000000),
  ('PLT-001', 2020, 38000000),
  ('PLT-001', 2021, 44000000),
  ('PLT-001', 2022, 51000000),
  ('PLT-001', 2023, 55200000),
  ('PLT-001', 2024, 59400000),
  ('PLT-002', 2019, 110000000),
  ('PLT-002', 2020, 128000000),
  ('PLT-002', 2021, 140000000),
  ('PLT-002', 2022, 153600000),
  ('PLT-002', 2023, 172800000),
  ('PLT-003', 2019, 150000000),
  ('PLT-003', 2020, 168000000),
  ('PLT-003', 2021, 185600000),
  ('PLT-003', 2022, 204000000),
  ('PLT-003', 2023, 217600000),
  ('PLT-004', 2020, 325000000),
  ('PLT-004', 2021, 380000000),
  ('PLT-004', 2022, 418000000),
  ('PLT-004', 2023, 475000000),
  ('PLT-005', 2021, 24650000),
  ('PLT-005', 2022, 27200000),
  ('PLT-005', 2023, 30685000),
  ('PLT-005', 2024, 32300000),
  ('PLT-006', 2019, 82000000),
  ('PLT-006', 2020, 88000000),
  ('PLT-006', 2021, 93000000),
  ('PLT-006', 2022, 96768000),
  ('PLT-006', 2023, 100800000)
) AS h(plot_id, year, price) ON p.plot_id = h.plot_id
ON CONFLICT DO NOTHING;
