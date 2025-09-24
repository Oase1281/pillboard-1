-- Update the position constraint to allow -1 for background images
ALTER TABLE images DROP CONSTRAINT images_position_check;

-- Add new constraint that allows -1 (for background) and 0-99 (for grid positions)
ALTER TABLE images ADD CONSTRAINT images_position_check 
  CHECK (position = -1 OR (position >= 0 AND position < 100));
