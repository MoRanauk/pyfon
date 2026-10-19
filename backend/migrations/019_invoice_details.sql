-- 019_invoice_details.sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_kes integer NOT NULL DEFAULT 0 CHECK (discount_kes >= 0);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS handover_date date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS handover_mode text CHECK (handover_mode IS NULL OR handover_mode IN ('pickup','delivery'));
