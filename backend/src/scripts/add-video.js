import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { pool, query } from '../db/pool.js';
import { audit } from '../audit.js';
import { uploadsReady, checkVideo, storeVideo } from '../uploads/storage.js';

// Add, list or archive a shop's home-page videos from the command line (until the Videos screen exists in Phase 7).
//   node --env-file=.env src/scripts/add-video.js --list --shop mco
//   node --env-file=.env src/scripts/add-video.js --shop mco --title "Our story" --file "C:\path\ad.mp4"
//   node --env-file=.env src/scripts/add-video.js --shop mco --title "Offer" --url https://example.com/ad.mp4
//   node --env-file=.env src/scripts/add-video.js --archive 3
const { values: v } = parseArgs({ options: { shop: { type: 'string' }, title: { type: 'string' }, file: { type: 'string' }, url: { type: 'string' }, list: { type: 'boolean' }, archive: { type: 'string' } } });

try {
  if (v.archive) {
    const r = await query("UPDATE site_videos SET status = 'archived', archived_at = now(), archived_by = 'script', archive_reason = 'Removed' WHERE id = $1 AND status = 'active' RETURNING id, title", [v.archive]);
    if (!r.rows[0]) throw new Error('no active video with that id. Run --list to see the ids.');
    await audit(null, { action: 'video.archived', entityType: 'site_video', entityId: String(r.rows[0].id), details: { by: 'script' } });
    console.log('Archived: ' + r.rows[0].title);
  } else if (v.list) {
    if (!v.shop) throw new Error('give --shop');
    const { rows } = await query('SELECT id, position, title, status, url FROM site_videos WHERE storefront_code = $1 ORDER BY status, position', [v.shop]);
    if (!rows.length) console.log('No videos for ' + v.shop + ' yet.');
    for (const r of rows) console.log([r.id, r.status, r.position, r.title, r.url].join(' | '));
  } else {
    if (!v.shop || !v.title || (!v.file && !v.url)) throw new Error('give --shop, --title and either --file or --url');
    if (v.title.trim().length < 2) throw new Error('the title is too short');
    const shop = await query('SELECT code FROM storefronts WHERE code = $1', [v.shop]);
    if (!shop.rows[0]) throw new Error('unknown shop. Use mco, prestige or trim');
    const n = await query("SELECT coalesce(max(position), 0)::int AS p, count(*)::int AS n FROM site_videos WHERE storefront_code = $1 AND status = 'active'", [v.shop]);
    if (n.rows[0].n >= 5) throw new Error('this shop already has 5 videos. Archive one first with --archive ID.');
    let url = v.url;
    let publicId = null;
    if (v.file) {
      if (!uploadsReady()) throw new Error('Cloudinary is not configured (CLOUDINARY_URL in .env)');
      const buf = fs.readFileSync(v.file);
      const info = await checkVideo(buf);
      const stored = await storeVideo(buf, info, 'pyfon/videos');
      url = stored.url;
      publicId = stored.publicId;
    } else if (!/^https:\/\/.+\.(mp4|webm)(\?.*)?$/i.test(url)) {
      throw new Error('the link must start with https:// and end in .mp4 or .webm');
    }
    const poster = url.includes('res.cloudinary.com') && /\.(mp4|webm)$/i.test(url) ? url.replace(/\.(mp4|webm)$/i, '.jpg') : null;
    const ins = await query(
      'INSERT INTO site_videos (storefront_code, position, title, url, poster_url, public_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [v.shop, n.rows[0].p + 1, v.title.trim(), url, poster, publicId, 'script']
    );
    await audit(null, { action: 'video.added', entityType: 'site_video', entityId: String(ins.rows[0].id), details: { storefront: v.shop, by: 'script' } });
    console.log('Added video #' + ins.rows[0].id + ' to ' + v.shop + ': ' + v.title);
  }
} catch (e) {
  console.error('Error: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
