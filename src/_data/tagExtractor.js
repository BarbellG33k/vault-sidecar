// src/_data/tagExtractor.js
// 11ty computed data module for tag extraction and normalization.

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'not', 'no', 'nor', 'so', 'yet',
  'both', 'either', 'neither', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'than', 'too', 'very', 'just', 'this', 'that', 'these', 'those',
  'it', 'its', 'as', 'if', 'then', 'than', 'when', 'where', 'which', 'who',
  'whom', 'how', 'what', 'why', 'all', 'any', 'both', 'each', 'every',
  'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

/**
 * Normalize a single raw tag string.
 * - Lowercase
 * - Replace spaces and underscores with hyphens
 * - Strip all characters except [a-z0-9-]
 * @param {string} raw
 * @returns {string}
 */
export function normalizeTag(raw) {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[^a-z]+/, '')  // strip leading non-alpha chars (digits, hyphens)
    .replace(/-+$/g, '');     // strip trailing hyphens
}

/**
 * Normalize an array of raw tag strings and deduplicate.
 * @param {string[]} raw
 * @returns {string[]}
 */
export function normalizeTags(raw) {
  const seen = new Set();
  const result = [];
  for (const tag of raw) {
    const normalized = normalizeTag(tag);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

/**
 * Extract top-3 most frequent meaningful words from content.
 * Only words that start with a letter are included (so they produce valid tags).
 * @param {string} content
 * @returns {string[]}
 */
function extractTopWords(content) {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && /^[a-z]/.test(w) && !STOP_WORDS.has(w));

  const freq = new Map();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}

/**
 * Format a Date as YYYY-MM using UTC to avoid timezone drift.
 * @param {Date} date
 * @returns {string}
 */
function formatYearMonth(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Extract tags from a TagExtractorInput.
 *
 * @param {{ content: string, page: { inputPath: string, date: Date }, tags?: string[] }} data
 * @returns {{ tags: string[] }}
 */
export function extractTags(data) {
  // If front matter tags exist and are non-empty, normalize and return them.
  if (Array.isArray(data.tags) && data.tags.length > 0) {
    const normalized = normalizeTags(data.tags);
    if (normalized.length > 0) {
      return { tags: normalized };
    }
  }

  // Fallback 1: extract top-3 meaningful words from content.
  try {
    const content = data.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      const topWords = extractTopWords(content);
      if (topWords.length > 0) {
        return { tags: normalizeTags(topWords) };
      }
    }
  } catch (err) {
    console.error('[tagExtractor] Error reading content:', err);
  }

  // Fallback 2: use YYYY-MM of the file's date.
  try {
    const date = data.page && data.page.date;
    if (date) {
      return { tags: [formatYearMonth(date)] };
    }
  } catch (err) {
    console.error('[tagExtractor] Error reading date:', err);
  }

  // Fallback 3: assign 'untagged'.
  return { tags: ['untagged'] };
}

/**
 * 11ty computed data default export.
 * Called by 11ty with the data cascade object for each content item.
 */
export default function tagExtractor(data) {
  try {
    return extractTags(data).tags;
  } catch (err) {
    console.error('[tagExtractor] Unhandled error:', err);
    return ['untagged'];
  }
}
