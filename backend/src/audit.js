import { query } from './db/pool.js';

export function audit(req, { action, entityType = null, entityId = null, actorUserId = null, actingForUserId = null, details = {} }) {
  return query(
    'INSERT INTO audit_log (request_id, interface, actor_user_id, acting_for_user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [req?.id ?? null, req?.interfaceCode ?? null, actorUserId, actingForUserId, action, entityType, entityId, JSON.stringify(details)]
  );
}
