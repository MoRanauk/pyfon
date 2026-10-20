import { z } from 'zod';
import { ACTIONS } from './actions.js';
import { HttpError } from '../errors.js';

ACTIONS.money_delete = {
  schema: z.object({ entryId: z.string().regex(/^\d{1,18}$/), reason: z.string().trim().min(3).max(300) }),
  async check(client, p) {
    const { rows } = await client.query('SELECT * FROM money_entries WHERE id = $1', [p.entryId]);
    const e = rows[0];
    if (!e) throw new HttpError(404, 'entry_not_found', 'Money entry not found');
    if (e.deleted_at) throw new HttpError(409, 'already_deleted', 'This entry is already deleted');
    return e;
  },
  summary(p, e) { return 'Delete money entry #' + p.entryId + ' (' + e.kind + ', ' + e.category + ', KES ' + e.amount_kes + '): ' + p.reason; },
  async execute(client, p) {
    const u = await client.query('UPDATE money_entries SET deleted_at = now(), deleted_reason = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id', [p.entryId, p.reason]);
    return { deleted: u.rowCount === 1, entryId: p.entryId };
  },
};
