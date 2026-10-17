import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { fileTypeFromBuffer } from 'file-type';
import { HttpError } from '../errors.js';

const MB = 1024 * 1024;
const ALLOWED = {
  'image/png': { ext: 'png', max: 5 * MB, raw: false },
  'image/jpeg': { ext: 'jpg', max: 5 * MB, raw: false },
  'image/webp': { ext: 'webp', max: 5 * MB, raw: false },
  'application/pdf': { ext: 'pdf', max: 10 * MB, raw: true },
};

cloudinary.config({ secure: true });

export function uploadsReady() {
  return Boolean(process.env.CLOUDINARY_URL);
}

export function cleanName(name) {
  const n = String(name || 'file').replace(/[\\/]/g, '_').replace(/[^\x20-\x7E]/g, '').trim().slice(0, 120);
  return n || 'file';
}

// Looks at the real bytes of the file, never at its name or the type the browser claims.
export async function checkFile(buffer) {
  const found = await fileTypeFromBuffer(buffer);
  const rule = found && ALLOWED[found.mime];
  if (!rule) throw new HttpError(415, 'file_type_not_allowed', 'Only PNG, JPG, WebP images and PDF files are allowed');
  if (buffer.length > rule.max) {
    throw new HttpError(413, 'file_too_large', 'File is too big (images max 5 MB, PDF max 10 MB)');
  }
  return { mime: found.mime, ...rule };
}

const resourceTypeFor = (mime) => (ALLOWED[mime]?.raw ? 'raw' : 'image');

export async function storeFile(buffer, info, folder) {
  const id = crypto.randomUUID();
  const options = {
    folder: folder || 'pyfon/uploads',
    public_id: info.raw ? id + '.' + info.ext : id,
    resource_type: resourceTypeFor(info.mime),
    overwrite: false,
  };
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, res) => (err ? reject(err) : resolve(res)));
      stream.end(buffer);
    });
    return { publicId: result.public_id, url: result.secure_url, bytes: buffer.length, mime: info.mime };
  } catch (err) {
    console.error('Cloudinary upload failed:', err && err.message);
    throw new HttpError(502, 'storage_failed', 'Could not store the file. Please try again.');
  }
}

export async function removeFile(publicId, mime) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceTypeFor(mime) });
  } catch (err) {
    console.error('Cloudinary cleanup failed:', err && err.message);
  }
}
