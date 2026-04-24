export class HtmlIsolator extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['src', 'fallback-iframe'];
  }

  connectedCallback(): void {
    const src = this.getAttribute('src');
    if (!src) return;

    if (this.hasAttribute('fallback-iframe')) {
      this.renderIframe(src);
    } else {
      fetch(src)
        .then((res) => res.text())
        .then((html) => this.renderShadow(html))
        .catch((err) => {
          console.error(`HtmlIsolator: failed to fetch ${src}`, err);
        });
    }
  }

  renderShadow(html: string): void {
    const shadow = this.attachShadow({ mode: 'open' });
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Inject <style> and <link rel="stylesheet"> from <head>
    const headNodes = Array.from(doc.head.childNodes);
    for (const node of headNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      if (
        el.tagName === 'STYLE' ||
        (el.tagName === 'LINK' && el.getAttribute('rel') === 'stylesheet')
      ) {
        shadow.appendChild(el.cloneNode(true));
      }
    }

    // Inject <body> children (non-script first, then re-create scripts)
    const bodyNodes = Array.from(doc.body.childNodes);
    for (const node of bodyNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
        // Re-create script so it executes
        const original = node as HTMLScriptElement;
        const script = document.createElement('script');
        if (original.src) {
          script.src = original.src;
        } else {
          script.textContent = original.textContent;
        }
        Array.from(original.attributes).forEach((attr) => {
          if (attr.name !== 'src') script.setAttribute(attr.name, attr.value);
        });
        shadow.appendChild(script);
      } else {
        shadow.appendChild(node.cloneNode(true));
      }
    }

    // Handle external resource load failures
    const externalEls = Array.from(shadow.querySelectorAll<HTMLElement>('img, link, script[src]'));
    for (const el of externalEls) {
      const url =
        (el as HTMLImageElement).src ||
        (el as HTMLLinkElement).href ||
        (el as HTMLScriptElement).src;
      el.addEventListener('error', () => {
        console.error(`HtmlIsolator: failed to load external resource ${url}`);
      });
    }
  }

  renderIframe(src: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.src = src;
    this.appendChild(iframe);
  }
}

customElements.define('html-isolator', HtmlIsolator);
