ALTER TABLE users ADD COLUMN IF NOT EXISTS shop text;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_shop_check;
ALTER TABLE users ADD CONSTRAINT users_shop_check CHECK (shop IS NULL OR shop IN ('mco','prestige','trim'));

UPDATE users u SET shop = x.storefront_code
  FROM (SELECT DISTINCT ON (customer_id) customer_id, storefront_code
          FROM orders
         WHERE customer_id IS NOT NULL AND storefront_code IN ('mco','prestige','trim')
         ORDER BY customer_id, id) x
 WHERE u.id = x.customer_id AND u.role = 'customer' AND u.shop IS NULL;

DROP INDEX IF EXISTS users_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_staff_unique ON users (lower(email)) WHERE role <> 'customer';
CREATE UNIQUE INDEX IF NOT EXISTS users_email_customer_shop_unique ON users (lower(email), COALESCE(shop, '')) WHERE role = 'customer';
