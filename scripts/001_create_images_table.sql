-- Create images table for the collaborative image board
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE CHECK (position >= 0 AND position < 100),
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on images" ON images
  FOR ALL USING (true);

-- Create index for faster position lookups
CREATE INDEX IF NOT EXISTS idx_images_position ON images(position);
