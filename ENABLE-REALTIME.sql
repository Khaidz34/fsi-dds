-- Enable Realtime for all tables
-- Run this in Supabase SQL Editor

-- Enable Realtime for payments table
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable Realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable Realtime for menus table
ALTER PUBLICATION supabase_realtime ADD TABLE menus;

-- Enable Realtime for feedback table
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- Enable Realtime for users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Enable RLS on all tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read all data
CREATE POLICY "Enable read for authenticated users" ON payments
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON orders
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON menus
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON feedback
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for authenticated users" ON users
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow inserts/updates/deletes for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON payments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON payments
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON orders
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON orders
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON orders
FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON feedback
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON feedback
FOR UPDATE USING (auth.role() = 'authenticated');
