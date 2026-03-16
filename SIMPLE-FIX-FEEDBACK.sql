-- =====================================================
-- SIMPLE FIX FEEDBACK TABLE
-- Chạy từng bước một trong Supabase SQL Editor
-- =====================================================

-- BƯỚC 1: Xóa table cũ (nếu có)
DROP TABLE IF EXISTS feedback CASCADE;

-- BƯỚC 2: Tạo table mới với schema đơn giản
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BƯỚC 3: Tạo index
CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- BƯỚC 4: Test
INSERT INTO feedback (user_id, subject, message) 
VALUES (1, 'Test', 'Test message');

SELECT * FROM feedback;

DELETE FROM feedback WHERE subject = 'Test';

-- HOÀN THÀNH!