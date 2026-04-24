import path from 'path';

/**
 * Derive a display title from front matter or filename.
 * @param {string|undefined} frontMatterTitle
 * @param {string} inputPath
 * @returns {string}
 */
export function deriveTitle(frontMatterTitle, inputPath) {
  if (typeof frontMatterTitle === 'string' && frontMatterTitle.trim().length > 0) {
    return frontMatterTitle;
  }

  // Derive from filename: basename without extension
  const basename = path.basename(inputPath || '', path.extname(inputPath || ''));
  const spaced = basename.replace(/[-_]/g, ' ').trim();

  if (!spaced) {
    return 'Untitled';
  }

  // Apply title case: capitalize first letter of each word
  return spaced
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// 11ty computed data export
export default function (data) {
  return deriveTitle(data.title, data.page.inputPath);
}
