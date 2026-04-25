import type { ContentItem } from './index-pane.js';

/**
 * Apply a CSS opacity fade transition to an element.
 * Sets the transition property so subsequent opacity changes animate.
 */
export function applyFadeTransition(el: HTMLElement, durationMs: number): void {
  el.style.transition = `opacity ${durationMs}ms`;
}

/**
 * Load a ContentItem into the stage element with a 200ms fade transition.
 *
 * - Markdown items: fetch the pre-rendered 11ty page URL, extract the <article>
 *   element from the response HTML, swap stageEl.innerHTML with its innerHTML.
 * - HTML items: clear stageEl, create <html-isolator src="..."> and append it.
 * - On fetch failure: display an inline error message without crashing.
 */
export async function loadItem(item: ContentItem, stageEl: HTMLElement): Promise<void> {
  // Apply fade transition
  applyFadeTransition(stageEl, 200);

  // Fade out
  stageEl.style.opacity = '0';

  // Wait for fade-out to complete
  await new Promise<void>((resolve) => setTimeout(resolve, 200));

  try {
    if (item.type === 'markdown' || item.type === 'text') {
      const response = await fetch(item.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const article = doc.querySelector('article');
      if (article) {
        stageEl.innerHTML = article.innerHTML;
      } else {
        // Fallback: use body content if no <article> found
        stageEl.innerHTML = doc.body.innerHTML;
      }
    } else {
      // HTML item: fetch the rendered page, extract raw HTML from <script type="text/html">
      const response = await fetch(item.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const scriptEl = doc.querySelector('script[type="text/html"]');
      const rawHtml = scriptEl ? scriptEl.textContent || '' : html;

      stageEl.innerHTML = '';
      const isolator = document.createElement('html-isolator');
      isolator.renderShadow(rawHtml);
      stageEl.appendChild(isolator);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stageEl.innerHTML = `<p class="stage-error">Failed to load content: ${message}</p>`;
  }

  // Fade in
  stageEl.style.opacity = '1';
}
