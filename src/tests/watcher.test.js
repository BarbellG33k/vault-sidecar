// Feature: vault-sidecar, Property 1: Unsupported file type is always rejected
// Feature: vault-sidecar, Property 2: Batch ingestion processes all valid files

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateIngestRequest } from '../../watcher-validation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS = ['.md', '.html', '.txt'];
const ACCEPTED_MIME_TYPES = ['text/markdown', 'text/html', 'text/plain', 'application/octet-stream'];

/** Arbitrary filename with a non-.md/.html extension */
const arbitraryUnsupportedFilename = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
    fc.stringMatching(/^\.[a-zA-Z]{2,5}$/).filter((ext) => !ACCEPTED_EXTENSIONS.includes(ext)),
  )
  .map(([base, ext]) => `${base}${ext}`);

/** Arbitrary valid filename (.md or .html) */
const arbitraryValidFilename = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/),
    fc.constantFrom(...ACCEPTED_EXTENSIONS),
  )
  .map(([base, ext]) => `${base}${ext}`);

/** Arbitrary valid MIME type */
const arbitraryValidMimeType = fc.constantFrom(...ACCEPTED_MIME_TYPES);

// ---------------------------------------------------------------------------
// Property 1: Unsupported file type is always rejected
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------

describe('Property 1: Unsupported file type is always rejected', () => {
  it('rejects any filename whose extension is not .md or .html', () => {
    fc.assert(
      fc.property(arbitraryUnsupportedFilename, arbitraryValidMimeType, (filename, mimeType) => {
        const result = validateIngestRequest({ filename, mimeType, overwrite: false }, []);
        expect(result.valid).toBe(false);
        expect(result.reason).toBeDefined();
        // The error message must identify the unsupported type (lowercased)
        const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        expect(result.reason.toLowerCase()).toContain(ext);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Batch ingestion processes all valid files
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------

describe('Property 2: Batch ingestion processes all valid files', () => {
  it('accepts every file in a non-empty list of valid .md/.html files', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            filename: arbitraryValidFilename,
            mimeType: arbitraryValidMimeType,
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (files) => {
          // Deduplicate filenames so there are no conflicts within the batch
          const seen = new Set();
          const uniqueFiles = files.filter(({ filename }) => {
            if (seen.has(filename)) return false;
            seen.add(filename);
            return true;
          });

          for (const { filename, mimeType } of uniqueFiles) {
            const result = validateIngestRequest(
              { filename, mimeType, overwrite: false },
              [], // no pre-existing files
            );
            expect(result.valid).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for Watcher ingest validation (Task 2.4)
// Requirements: 1.3, 1.4
// ---------------------------------------------------------------------------

describe('validateIngestRequest — MIME type acceptance', () => {
  it('accepts text/markdown with .md extension', () => {
    const result = validateIngestRequest(
      { filename: 'note.md', mimeType: 'text/markdown', overwrite: false },
      [],
    );
    expect(result.valid).toBe(true);
  });

  it('accepts text/html with .html extension', () => {
    const result = validateIngestRequest(
      { filename: 'report.html', mimeType: 'text/html', overwrite: false },
      [],
    );
    expect(result.valid).toBe(true);
  });

  it('accepts application/octet-stream with .md extension', () => {
    const result = validateIngestRequest(
      { filename: 'note.md', mimeType: 'application/octet-stream', overwrite: false },
      [],
    );
    expect(result.valid).toBe(true);
  });

  it('accepts application/octet-stream with .html extension', () => {
    const result = validateIngestRequest(
      { filename: 'page.html', mimeType: 'application/octet-stream', overwrite: false },
      [],
    );
    expect(result.valid).toBe(true);
  });

  it('rejects .pdf extension and identifies the type in the message', () => {
    const result = validateIngestRequest(
      { filename: 'document.pdf', mimeType: 'application/pdf', overwrite: false },
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('.pdf');
  });

  it('accepts .txt extension with text/plain', () => {
    const result = validateIngestRequest(
      { filename: 'notes.txt', mimeType: 'text/plain', overwrite: false },
      [],
    );
    expect(result.valid).toBe(true);
  });

  it('rejects .json extension', () => {
    const result = validateIngestRequest(
      { filename: 'data.json', mimeType: 'application/json', overwrite: false },
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('.json');
  });

  it('rejects a file with no extension', () => {
    const result = validateIngestRequest(
      { filename: 'README', mimeType: 'text/plain', overwrite: false },
      [],
    );
    expect(result.valid).toBe(false);
  });

  it('rejects an unsupported MIME type even with a valid extension', () => {
    const result = validateIngestRequest(
      { filename: 'note.md', mimeType: 'application/json', overwrite: false },
      [],
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('application/json');
  });
});

describe('validateIngestRequest — conflict detection', () => {
  it('returns conflict when filename exists and overwrite is false', () => {
    const result = validateIngestRequest(
      { filename: 'existing.md', mimeType: 'text/markdown', overwrite: false },
      ['existing.md', 'other.md'],
    );
    expect(result.valid).toBe(false);
    expect(result.conflict).toBe(true);
    expect(result.reason).toContain('existing.md');
  });

  it('allows overwrite when overwrite is true', () => {
    const result = validateIngestRequest(
      { filename: 'existing.md', mimeType: 'text/markdown', overwrite: true },
      ['existing.md'],
    );
    expect(result.valid).toBe(true);
  });

  it('does not conflict when filename is not in existing files', () => {
    const result = validateIngestRequest(
      { filename: 'new-note.md', mimeType: 'text/markdown', overwrite: false },
      ['other.md', 'another.html'],
    );
    expect(result.valid).toBe(true);
  });

  it('does not conflict when existing files list is empty', () => {
    const result = validateIngestRequest(
      { filename: 'fresh.md', mimeType: 'text/markdown', overwrite: false },
      [],
    );
    expect(result.valid).toBe(true);
  });
});
