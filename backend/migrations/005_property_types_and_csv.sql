-- Expand category_type to support more property types
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_category_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_category_type_check
  CHECK (category_type IN ('residential', 'commercial', 'land', 'apartment', 'villa', 'plot', 'office', 'retail', 'warehouse', 'farmland'));
