import { pool, query } from '../db/pool.js';
import { removeVideo } from '../uploads/storage.js';

// Removes test videos (title starts with "ZZ TEST ") and their Cloudinary files. From backend:
//   node --env-file=.env src/scripts/remove-test-videos.js
try {
  const { rows } = await query("DELETE FROM site_videos WHERE title LIKE 'ZZ TEST %' RETURNING title, public_id");
  for (const r of rows) {
    if (r.public_id) await removeVideo(r.public_id);
    console.log('Removed ' + r.title);
  }
  if (!rows.length) console.log('No test videos found.');
} catch (e) {
  console.error('Error: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
