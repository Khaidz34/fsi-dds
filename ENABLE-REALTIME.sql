-- Enable Realtime for all tables
-- Run this in Supabase SQL Editor

-- Enable Realtime for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable Realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable Realtime for menus table (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE menus;

-- Enable Realtime for feedback table (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- NOTE: RLS (Row Level Security) is NOT enabled
-- Your app uses JWT authentication from backend, not Supabase Auth
-- Backend already handles all authorization
-- RLS with auth.role() would block all access since users aren't authenticated via Supabase Auth

-- To verify Realtime is enabled, run:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
