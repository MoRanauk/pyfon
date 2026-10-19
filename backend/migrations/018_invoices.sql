-- 018_invoices.sql: digital invoices built from a job's order or quote
CREATE SEQUENCE IF NOT EXISTS invoice_no_seq;
CREATE TABLE IF NOT EXISTS invoices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  number text NOT NULL UNIQUE DEFAULT ('INV-' || lpad(nextval('invoice_no_seq')::text, 6, '0')),
  job_id bigint NOT NULL REFERENCES jobs(id),
  bill_name text NOT NULL,
  bill_phone text,
  bill_email text,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  other_charges_kes integer NOT NULL DEFAULT 0 CHECK (other_charges_kes >= 0),
  total_kes integer NOT NULL CHECK (total_kes >= 0),
  notes text,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','void')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  emailed_at timestamptz,
  voided_at timestamptz,
  void_reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_live ON invoices (job_id) WHERE status = 'issued';
