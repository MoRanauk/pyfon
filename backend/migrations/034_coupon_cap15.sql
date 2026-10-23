ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_check;
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_percent_max15;
ALTER TABLE coupons ADD CONSTRAINT coupons_percent_max15 CHECK (kind <> 'percent' OR value_num <= 15) NOT VALID;
