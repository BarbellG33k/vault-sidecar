import path from 'path';

// Accepted MIME types and extensions
export const ACCEPTED_EXTENSIONS = new Set(['.md', '.html', '.txt']);
export const ACCEPTED_MIME_TYPES = new Set([
  'text/markdown',
  'text/html',
  'text/plain',
  'application/octet-stream',
]);

/**
 * Validate an ingest request (pure function, exported for testability).
 *
 * @param {object} req
 * @param {string} req.filename
 * @param {string} req.mimeType
 * @param {boolean} req.overwrite
 * @param {string[]} existingFiles - list of filenames already in contentDir
 * @returns {{ valid: boolean, reason?: string, conflict?: boolean }}
 */
export function validateIngestRequest({ filename, mimeType, overwrite }, existingFiles = []) {
  const ext = path.extname(filename).toLowerCase();

  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      reason: `Unsupported file type: ${ext || '(no extension)'}`,
    };
  }

  if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      reason: `Unsupported MIME type: ${mimeType}`,
    };
  }

  if (existingFiles.includes(filename) && !overwrite) {
    return {
      valid: false,
      conflict: true,
      reason: `A file named "${filename}" already exists`,
    };
  }

  return { valid: true };
}
