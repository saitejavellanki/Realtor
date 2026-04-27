-- ============================================================
-- Migration 002: User Saved Properties + Visit Requests
-- Run: psql -U postgres -d realestate -f migrations/002_saved_and_visits.sql
-- ============================================================

-- User saved/liked properties (per mobile user)
CREATE TABLE IF NOT EXISTS user_saved_properties (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES mobile_users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

-- Visit requests submitted from the mobile app
CREATE TABLE IF NOT EXISTS visit_requests (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES mobile_users(id) ON DELETE SET NULL,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  visit_date    DATE NOT NULL,
  visit_time    VARCHAR(20) NOT NULL,
  visitor_name  VARCHAR(150) NOT NULL,
  message       TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending','Confirmed','Cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_saved_user   ON user_saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visits_date   ON visit_requests(visit_date);
