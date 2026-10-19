SELECT DISTINCT ON (digits) name, phone, email, ref, created_at AS "createdAt"
  FROM (
    SELECT o.contact_name AS name, o.contact_phone AS phone,
           COALESCE(o.contact_email, u.email) AS email, o.ref, o.created_at,
           regexp_replace(o.contact_phone, '[^0-9]', '', 'g') AS digits
      FROM orders o LEFT JOIN users u ON u.id = o.customer_id
    UNION ALL
    SELECT q.contact_name, q.contact_phone, COALESCE(q.contact_email, u.email), q.ref, q.created_at,
           regexp_replace(q.contact_phone, '[^0-9]', '', 'g')
      FROM quote_requests q LEFT JOIN users u ON u.id = q.customer_id
  ) t
 WHERE digits <> ''
 ORDER BY digits, created_at DESC
