-- Check the schema of payments table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Also check what data is in the payments table
SELECT * FROM payments LIMIT 5;
