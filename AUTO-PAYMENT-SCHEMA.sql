-- =====================================================
-- Automatic Payment Support
-- Run this once in Supabase SQL Editor before enabling the webhook.
-- =====================================================

-- Keep the current payments table compatible with automatic bank transfers.
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'cash';

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payer_name TEXT;

-- Store provider transaction IDs so webhook retries do not create duplicate payments.
CREATE TABLE IF NOT EXISTS auto_payment_transactions (
  id SERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'bank-webhook',
  transaction_id TEXT NOT NULL,
  payment_code TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  payer_name TEXT,
  raw_payload JSONB,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
DECLARE
  status_check_name TEXT;
BEGIN
  SELECT conname INTO status_check_name
  FROM pg_constraint
  WHERE conrelid = 'auto_payment_transactions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;

  IF status_check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE auto_payment_transactions DROP CONSTRAINT %I', status_check_name);
  END IF;
END $$;

ALTER TABLE auto_payment_transactions
ADD CONSTRAINT auto_payment_transactions_status_check
CHECK (status IN ('processing', 'completed', 'failed', 'ignored'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_payment_transactions_provider_tx
ON auto_payment_transactions(provider, transaction_id);

CREATE INDEX IF NOT EXISTS idx_auto_payment_transactions_code
ON auto_payment_transactions(payment_code);

CREATE INDEX IF NOT EXISTS idx_auto_payment_transactions_user_month
ON auto_payment_transactions(user_id, month);
