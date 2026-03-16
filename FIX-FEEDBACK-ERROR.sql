-- =====================================================
-- Fix Feedback Table Error
-- Chạy script này trong Supabase SQL Editor để sửa lỗi feedback
-- =====================================================

-- Kiểm tra cấu trúc table hiện tại
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;

-- Thêm các columns thiếu nếu chưa có
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved'));

-- Cập nhật constraint cho status nếu cần
DO $$ 
BEGIN
    -- Drop constraint cũ nếu có
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'feedback_status_check' 
               AND table_name = 'feedback') THEN
        ALTER TABLE feedback DROP CONSTRAINT feedback_status_check;
    END IF;
    
    -- Thêm constraint mới
    ALTER TABLE feedback ADD CONSTRAINT feedback_status_check 
    CHECK (status IN ('pending', 'reviewed', 'resolved'));
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore error if constraint already exists
        NULL;
END $$;

-- Cập nhật dữ liệu cũ
UPDATE feedback 
SET status = 'pending' 
WHERE status IS NULL;

-- Make rating optional (remove NOT NULL constraint if exists)
ALTER TABLE feedback ALTER COLUMN rating DROP NOT NULL;

-- Kiểm tra lại cấu trúc sau khi sửa
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;

-- Test insert để đảm bảo hoạt động
DO $$
BEGIN
    -- Test insert with new format
    INSERT INTO feedback (user_id, subject, message, status) 
    VALUES (1, 'Test Subject', 'Test Message', 'pending');
    
    -- Delete test record
    DELETE FROM feedback WHERE subject = 'Test Subject' AND message = 'Test Message';
    
    RAISE NOTICE '✅ Feedback table is working correctly!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;