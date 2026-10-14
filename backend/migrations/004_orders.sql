-- 004_orders.sql: orders, quotes, jobs, partner sign-offs, approvals, tickets, attachments

CREATE SEQUENCE order_ref_seq;
CREATE SEQUENCE quote_ref_seq;
CREATE SEQUENCE job_ref_seq;
CREATE SEQUENCE ticket_ref_seq;

CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref text NOT NULL UNIQUE DEFAULT ('ORD-' || lpad(nextval('order_ref_seq')::text, 6, '0')),
  customer_id uuid NOT NULL REFERENCES users(id),
  storefront_code text NOT NULL REFERENCES storefronts(code),
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  delivery_notes text,
  total_kes integer NOT NULL CHECK (total_kes >= 0),
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_idx ON orders (customer_id);

CREATE TABLE order_lines (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id bigint REFERENCES catalog_items(id),
  sku text NOT NULL,
  name text NOT NULL,
  unit_price_kes integer NOT NULL CHECK (unit_price_kes >= 0),
  qty integer NOT NULL CHECK (qty > 0),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  personalization jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX order_lines_order_idx ON order_lines (order_id);

CREATE TABLE quote_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref text NOT NULL UNIQUE DEFAULT ('QR-' || lpad(nextval('quote_ref_seq')::text, 6, '0')),
  customer_id uuid NOT NULL REFERENCES users(id),
  storefront_code text NOT NULL REFERENCES storefronts(code),
  kind text NOT NULL CHECK (kind IN ('service','bulk','corporate','design')),
  item_id bigint REFERENCES catalog_items(id),
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  quantity integer CHECK (quantity IS NULL OR quantity > 0),
  company_name text,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  notes text,
  quoted_price_kes integer CHECK (quoted_price_kes IS NULL OR quoted_price_kes >= 0),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_requests_customer_idx ON quote_requests (customer_id);

CREATE TABLE jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref text NOT NULL UNIQUE DEFAULT ('JOB-' || lpad(nextval('job_ref_seq')::text, 6, '0')),
  order_id bigint UNIQUE REFERENCES orders(id),
  quote_request_id bigint UNIQUE REFERENCES quote_requests(id),
  current_step text NOT NULL DEFAULT 'finance_quote'
    CHECK (current_step IN ('finance_quote','creative','production','finance_delivery','done')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','complete','cancelled')),
  production_mode text CHECK (production_mode IN ('in_house','dealer')),
  vendor_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK ((order_id IS NOT NULL)::int + (quote_request_id IS NOT NULL)::int = 1)
);
CREATE INDEX jobs_status_step_idx ON jobs (status, current_step);

CREATE TABLE job_steps (
  job_id bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step text NOT NULL CHECK (step IN ('finance_quote','creative','production','finance_delivery')),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','active','awaiting_cosign','signed_off')),
  signed_off_at timestamptz,
  PRIMARY KEY (job_id, step)
);

-- One row per signature. role = owner (does the work) or cosigner (second partner).
-- workspace_stage = the stage workspace used; signer_stage = the signer's own home stage.
-- If they differ, the signer was covering for another partner.
CREATE TABLE job_signatures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint NOT NULL,
  step text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','cosigner')),
  partner_id uuid NOT NULL REFERENCES users(id),
  signer_stage text NOT NULL CHECK (signer_stage IN ('creative','production','finance')),
  workspace_stage text NOT NULL CHECK (workspace_stage IN ('creative','production','finance')),
  method text NOT NULL CHECK (method IN ('owner_login','password_reentry','live_approval')),
  signed_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  voided_reason text,
  FOREIGN KEY (job_id, step) REFERENCES job_steps (job_id, step) ON DELETE CASCADE
);
-- The same partner can never sign the same step twice in one round.
CREATE UNIQUE INDEX job_sig_one_per_partner
  ON job_signatures (job_id, step, partner_id) WHERE voided_at IS NULL;
CREATE UNIQUE INDEX job_sig_one_per_role
  ON job_signatures (job_id, step, role) WHERE voided_at IS NULL;

CREATE TABLE job_rejections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  step text NOT NULL CHECK (step IN ('finance_quote','creative','production','finance_delivery')),
  rejected_by uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL CHECK (length(trim(reason)) >= 3),
  send_back_to text NOT NULL CHECK (send_back_to IN ('finance_quote','creative','production','finance_delivery')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Live approval: owner asks another partner to co-sign from their own device.
CREATE TABLE cosign_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id bigint NOT NULL,
  step text NOT NULL,
  requested_by uuid NOT NULL REFERENCES users(id),
  requested_from uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  decided_at timestamptz,
  FOREIGN KEY (job_id, step) REFERENCES job_steps (job_id, step) ON DELETE CASCADE,
  CHECK (requested_by <> requested_from)
);
CREATE INDEX cosign_pending_idx ON cosign_requests (requested_from) WHERE status = 'pending';

-- High-impact actions: need an approve vote from all three partners.
CREATE TABLE approval_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE approval_votes (
  request_id bigint NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES users(id),
  vote text NOT NULL CHECK (vote IN ('approve','reject')),
  reason text,
  voted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, partner_id)
);

CREATE TABLE tickets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref text NOT NULL UNIQUE DEFAULT ('TKT-' || lpad(nextval('ticket_ref_seq')::text, 6, '0')),
  opened_by uuid NOT NULL REFERENCES users(id),
  interface text NOT NULL REFERENCES interfaces(code),
  subject text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  job_id bigint REFERENCES jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tickets_status_idx ON tickets (status);

CREATE TABLE ticket_comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Files stored in Cloudinary; we keep only the reference.
CREATE TABLE attachments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK (purpose IN ('personalization','artwork','mockup','reference')),
  order_line_id bigint REFERENCES order_lines(id) ON DELETE SET NULL,
  quote_request_id bigint REFERENCES quote_requests(id) ON DELETE SET NULL,
  job_id bigint REFERENCES jobs(id) ON DELETE SET NULL,
  public_id text NOT NULL,
  url text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  bytes integer NOT NULL CHECK (bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
