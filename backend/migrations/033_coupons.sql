CREATE TABLE IF NOT EXISTS coupons (
  id bigserial PRIMARY KEY,
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('percent','fixed')),
  value_num integer NOT NULL CHECK (value_num > 0),
  min_order_kes integer NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  storefronts text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
  created_by bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'percent' OR value_num <= 50)
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_uq ON coupons (upper(code));
CREATE TABLE IF NOT EXISTS coupon_approvals (
  coupon_id bigint NOT NULL,
  partner_id bigint NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, partner_id)
);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id bigserial PRIMARY KEY,
  coupon_id bigint NOT NULL,
  order_id bigint NOT NULL,
  user_id bigint NOT NULL,
  discount_kes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_kes integer NOT NULL DEFAULT 0;
