DELETE FROM coupon_approvals;
DELETE FROM coupon_redemptions;
UPDATE coupons SET created_by = NULL;
ALTER TABLE coupons ALTER COLUMN created_by TYPE uuid USING NULL;
ALTER TABLE coupon_approvals ALTER COLUMN partner_id TYPE uuid USING NULL;
ALTER TABLE coupon_redemptions ALTER COLUMN user_id TYPE uuid USING NULL;
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'id' AND table_schema = current_schema();
  IF t = 'uuid' THEN
    ALTER TABLE coupon_redemptions ALTER COLUMN order_id TYPE uuid USING NULL;
  END IF;
END $$;
UPDATE coupons SET status = 'pending' WHERE status = 'active';
