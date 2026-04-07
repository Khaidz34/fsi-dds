-- Fix banner_settings table - remove problematic constraint and ensure proper setup

-- Drop the problematic constraint if it exists
ALTER TABLE banner_settings DROP CONSTRAINT IF EXISTS only_one_row;

-- Ensure the table has the correct structure
-- The id should always be 1, but we'll use a trigger instead of constraint

-- Update the existing row to ensure it's there
UPDATE banner_settings SET banner_type = 'game' WHERE id = 1;

-- If no rows exist, insert the default
INSERT INTO banner_settings (id, banner_type, updated_at, updated_by)
SELECT 1, 'game', CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM banner_settings WHERE id = 1);

-- Create a trigger to prevent multiple rows
CREATE OR REPLACE FUNCTION prevent_multiple_banner_rows()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM banner_settings) > 1 THEN
    DELETE FROM banner_settings WHERE id != 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS prevent_multiple_rows_trigger ON banner_settings;

-- Create trigger
CREATE TRIGGER prevent_multiple_rows_trigger
AFTER INSERT ON banner_settings
FOR EACH ROW
EXECUTE FUNCTION prevent_multiple_banner_rows();

-- Verify the data
SELECT * FROM banner_settings;
