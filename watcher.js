import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { validateIngestRequest } from './watcher-validation.js';

export { validateIngestRequest };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  contentDir: path.join(__dirname, 'src', 'content'),
  port: 3001,
  debounceMs: 300,
};

// ---------------------------------------------------------------------------
// Multipart parser (minimal boundary-based, no external library)
// ---------------------------------------------------------------------------

/**
 * Parse a multipart/form-data body buffer.
 * Returns an object with fields and files.
 *
 * @param {Buffer} body
 * @param {string} boundary
 * @returns {{ fields: Record<string, string>, files: Array<{ fieldname: string, filename: string, mimeType: string, data: Buffer }> }}
 */
function parseMultipart(body, boundary) {
  const fields = {};
  const files = [];

  const delimiter = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(body, delimiter);

  for (const part of parts) {
    // Skip preamble and epilogue
    const str = part.toString('binary');
    if (str.trim() === '' || str.trim() === '--') continue;

    // Split headers from body at \r\n\r\n
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headerSection = part.slice(0, headerEnd).toString('utf8');
    const bodySection = part.slice(headerEnd + 4);

    // Strip trailing \r\n
    const bodyData = bodySection.slice(
      0,
      bodySection.length - (bodySection[bodySection.length - 2] === 0x0d ? 2 : 0),
    );

    const headers = parseHeaders(headerSection);
    const disposition = headers['content-disposition'] || '';
    const contentType = headers['content-type'] || 'application/octet-stream';

    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);

    if (!nameMatch) continue;
    const fieldname = nameMatch[1];

    if (filenameMatch) {
      files.push({
        fieldname,
        filename: filenameMatch[1],
        mimeType: contentType.split(';')[0].trim(),
        data: bodyData,
      });
    } else {
      fields[fieldname] = bodyData.toString('utf8');
    }
  }

  return { fields, files };
}

function parseHeaders(headerStr) {
  const headers = {};
  for (const line of headerStr.split('\r\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    headers[line.slice(0, idx).toLowerCase().trim()] = line.slice(idx + 1).trim();
  }
  return headers;
}

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let pos = 0;

  while (pos <= buf.length - delimiter.length) {
    let match = true;
    for (let i = 0; i < delimiter.length; i++) {
      if (buf[pos + i] !== delimiter[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      parts.push(buf.slice(start, pos));
      start = pos + delimiter.length;
      pos = start;
    } else {
      pos++;
    }
  }
  parts.push(buf.slice(start));
  return parts;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, body) {
  const json = JSON.stringify(body);
  setCorsHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

async function handleIngest(req, res) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);

  if (!boundaryMatch) {
    return sendJson(res, 400, { status: 'error', message: 'Missing multipart boundary' });
  }

  const boundary = boundaryMatch[1];
  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return sendJson(res, 500, { status: 'error', message: 'Failed to read request body' });
  }

  let parsed;
  try {
    parsed = parseMultipart(body, boundary);
  } catch (err) {
    return sendJson(res, 400, { status: 'error', message: 'Failed to parse multipart body' });
  }

  if (parsed.files.length === 0) {
    return sendJson(res, 400, { status: 'error', message: 'No file found in request' });
  }

  const uploadedFile = parsed.files[0];
  const overwrite = parsed.fields['overwrite'] === 'true';

  // List existing files in contentDir
  let existingFiles = [];
  try {
    existingFiles = fs.readdirSync(CONFIG.contentDir);
  } catch {
    // contentDir may not exist yet; that's fine
  }

  const validation = validateIngestRequest(
    { filename: uploadedFile.filename, mimeType: uploadedFile.mimeType, overwrite },
    existingFiles,
  );

  if (!validation.valid) {
    if (validation.conflict) {
      return sendJson(res, 409, { status: 'conflict', message: validation.reason });
    }
    return sendJson(res, 422, { status: 'error', message: validation.reason });
  }

  const safeFilename = path.basename(uploadedFile.filename);
  const destPath = path.join(CONFIG.contentDir, safeFilename);
  try {
    fs.mkdirSync(CONFIG.contentDir, { recursive: true });
    fs.writeFileSync(destPath, uploadedFile.data);
  } catch (err) {
    return sendJson(res, 500, { status: 'error', message: `Failed to write file: ${err.message}` });
  }

  return sendJson(res, 200, { status: 'ok', filename: safeFilename });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === 'POST' && req.url === '/ingest') {
    await handleIngest(req, res);
  } else {
    sendJson(res, 404, { status: 'error', message: 'Not found' });
  }
});

server.listen(CONFIG.port, () => {
  console.log(`[watcher] HTTP server listening on port ${CONFIG.port}`);
});

// ---------------------------------------------------------------------------
// chokidar watcher with 300 ms debounce
// ---------------------------------------------------------------------------

let debounceTimer = null;

function onContentChange(eventType, filePath) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`[watcher] Detected ${eventType}: ${filePath} — 11ty will rebuild via its own watch mode`);
    debounceTimer = null;
  }, CONFIG.debounceMs);
}

const watcher = chokidar.watch(CONFIG.contentDir, {
  ignoreInitial: true,
  persistent: true,
});

watcher
  .on('add', (p) => onContentChange('add', p))
  .on('change', (p) => onContentChange('change', p))
  .on('unlink', (p) => onContentChange('unlink', p))
  .on('error', (err) => console.error('[watcher] chokidar error:', err));

console.log(`[watcher] Watching ${CONFIG.contentDir}`);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

process.on('SIGINT', () => {
  console.log('\n[watcher] Shutting down...');
  watcher.close();
  server.close(() => process.exit(0));
});
