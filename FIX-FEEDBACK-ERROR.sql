-- =====================================================
-- Fix Feedback Table Error - UPDATED VERSION
-- Chạy script này trong Supabase SQL Editor để sửa lỗi feedback
-- =====================================================

-- Xóa table cũ nếu có vấn đề và tạo lại
DROP TABLE IF EXISTS feedback CASCADE;

-- Tạo lại feedback table với schema đúng
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index cho performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Test insert để đảm bảo hoạt động
DO $$
BEGIN
    -- Test insert with new format (without rating)
    INSERT INTO feedback (user_id, subject, message, status) 
    VALUES (1, 'Test Subject', 'Test Message', 'pending');
    
    -- Test insert with rating
    INSERT INTO feedback (user_id, subject, message, rating, status) 
    VALUES (1, 'Test Subject 2', 'Test Message 2', 5, 'pending');
    
    -- Delete test records
    DELETE FROM feedback WHERE subject LIKE 'Test Subject%';
    
    RAISE NOTICE '✅ Feedback table created and tested successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- Kiểm tra cấu trúc table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;