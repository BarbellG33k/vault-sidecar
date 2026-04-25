// Feature: vault-sidecar, Property 8: HTML_Isolator provides bidirectional CSS encapsulation
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { HtmlIsolator } from '../assets/js/html-isolator.js';

// Helper: create a real HtmlIsolator instance attached to the document
function makeIsolator(): HtmlIsolator {
  const el = new HtmlIsolator();
  document.body.appendChild(el);
  return el;
}

function cleanup(el: Element): void {
  el.parentNode?.removeChild(el);
}

// ---------------------------------------------------------------------------
// Property 8: CSS isolation (bidirectional)
// Validates: Requirements 5.2, 5.3
// ---------------------------------------------------------------------------
describe('Property 8: HTML_Isolator CSS encapsulation', () => {
  it('shadow root is attached after renderShadow and content is encapsulated', () => {
    fc.assert(
      fc.property(
        fc.record({
          property: fc.constantFrom('color', 'background-color', 'font-size', 'margin', 'padding'),
          value: fc.constantFrom('red', 'blue', 'green', '10px', '20px', '1em'),
          className: fc.stringMatching(/^[a-z][a-z0-9]{3,8}$/),
          innerText: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        ({ property: cssProp, value: cssVal, className, innerText }) => {
          const html = `<html><head>
            <style>.${className} { ${cssProp}: ${cssVal}; }</style>
          </head><body>
            <div class="${className}">${innerText}</div>
          </body></html>`;

          const el = makeIsolator();
          el.renderShadow(html);

          // 1. Shadow root must be attached
          expect(el.shadowRoot).not.toBeNull();

          // 2. Inner element is NOT accessible from outer document.querySelector
          //    (shadow DOM encapsulates it)
          const outerQuery = document.querySelector(`.${className}`);
          if (outerQuery !== null) {
            // Any match found outside must not be inside the shadow root
            expect(el.shadowRoot!.contains(outerQuery)).toBe(false);
          }

          // 3. Content IS rendered inside the shadow root
          const innerEl = el.shadowRoot!.querySelector(`.${className}`);
          expect(innerEl).not.toBeNull();

          cleanup(el);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('outer document CSS rules do not affect shadow root elements', () => {
    fc.assert(
      fc.property(
        fc.record({
          className: fc.stringMatching(/^[a-z][a-z0-9]{3,8}$/),
          innerText: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        ({ className, innerText }) => {
          // Inject a style into the outer document
          const outerStyle = document.createElement('style');
          outerStyle.textContent = `.${className}-outer { color: red; font-weight: bold; }`;
          document.head.appendChild(outerStyle);

          const html = `<html><body><div class="${className}-outer">${innerText}</div></body></html>`;

          const el = makeIsolator();
          el.renderShadow(html);

          expect(el.shadowRoot).not.toBeNull();

          // The element inside shadow root exists
          const innerEl = el.shadowRoot!.querySelector(`.${className}-outer`);
          expect(innerEl).not.toBeNull();

          // The outer style tag is NOT inside the shadow root
          const shadowStyles = el.shadowRoot!.querySelectorAll('style');
          const outerStyleInShadow = Array.from(shadowStyles).some(
            (s) => s.textContent === outerStyle.textContent
          );
          expect(outerStyleInShadow).toBe(false);

          // Cleanup
          document.head.removeChild(outerStyle);
          cleanup(el);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 7.3: Unit tests for HTML_Isolator
// Validates: Requirements 5.4, 5.5
// ---------------------------------------------------------------------------
describe('HtmlIsolator unit tests', () => {
  let el: HtmlIsolator;

  beforeEach(() => {
    el = makeIsolator();
  });

  afterEach(() => {
    cleanup(el);
    vi.restoreAllMocks();
  });

  it('attaches a shadow root after renderShadow is called', () => {
    el.renderShadow('<html><body><p>Hello</p></body></html>');
    expect(el.shadowRoot).not.toBeNull();
  });

  it('renders body content inside the shadow root', () => {
    el.renderShadow('<html><body><p id="test-para">Shadow content</p></body></html>');
    const para = el.shadowRoot!.querySelector('#test-para');
    expect(para).not.toBeNull();
    expect(para!.textContent).toBe('Shadow content');
  });

  it('injects head styles into the shadow root', () => {
    el.renderShadow('<html><head><style>p { color: red; }</style></head><body><p>Styled</p></body></html>');
    const styles = el.shadowRoot!.querySelectorAll('style');
    expect(styles.length).toBeGreaterThan(0);
    expect(styles[0].textContent).toContain('color: red');
  });

  it('renders an iframe when fallback-iframe attribute is set', () => {
    el.setAttribute('src', '/test.html');
    el.setAttribute('fallback-iframe', '');
    el.connectedCallback();
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
    expect(iframe!.src).toContain('/test.html');
  });

  it('logs failed external resource URL and continues rendering remaining content', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const html = `<html><body>
      <img id="bad-img" src="http://nonexistent.example.com/image.png" />
      <p id="good-para">Remaining content</p>
    </body></html>`;

    el.renderShadow(html);

    // Remaining content is rendered
    const para = el.shadowRoot!.querySelector('#good-para');
    expect(para).not.toBeNull();
    expect(para!.textContent?.trim()).toBe('Remaining content');

    // The img element is present (error handler attached)
    const img = el.shadowRoot!.querySelector('#bad-img') as HTMLImageElement;
    expect(img).not.toBeNull();

    // Simulate the error event on the image
    img.dispatchEvent(new Event('error'));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('HtmlIsolator: failed to load external resource')
    );
  });

  it('fetches HTML and calls renderShadow when connectedCallback is called without fallback-iframe', async () => {
    const mockHtml = '<html><body><p id="fetched">Fetched content</p></body></html>';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      text: () => Promise.resolve(mockHtml),
    } as Response);

    el.setAttribute('src', '/some-page.html');
    el.connectedCallback();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchSpy).toHaveBeenCalledWith('/some-page.html');
    expect(el.shadowRoot).not.toBeNull();
    const para = el.shadowRoot!.querySelector('#fetched');
    expect(para).not.toBeNull();
  });

  it('logs error when fetch fails in connectedCallback', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    el.setAttribute('src', '/missing.html');
    el.connectedCallback();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('HtmlIsolator: failed to fetch /missing.html'),
      expect.any(Error)
    );
  });

  it('reads inline HTML from a script element when src starts with #', () => {
    const script = document.createElement('script');
    script.type = 'text/html';
    script.id = 'inline-html';
    script.textContent = '<html><head><style>p { color: blue; }</style></head><body><p id="inline-para">Inline content</p></body></html>';
    document.body.appendChild(script);

    el.setAttribute('src', '#inline-html');
    el.connectedCallback();

    expect(el.shadowRoot).not.toBeNull();
    const para = el.shadowRoot!.querySelector('#inline-para');
    expect(para).not.toBeNull();
    expect(para!.textContent).toBe('Inline content');

    document.body.removeChild(script);
  });
});
