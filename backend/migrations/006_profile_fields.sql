-- Add phone and gender columns to mobile_users
ALTER TABLE mobile_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE mobile_users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
