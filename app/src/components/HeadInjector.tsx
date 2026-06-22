import { useEffect, useRef } from 'react';
import { getSettings } from '@/lib/api';

function injectScript(doc: Document, src: string, textContent?: string) {
  const s = doc.createElement('script');
  if (src) s.src = src;
  if (textContent) s.textContent = textContent;
  s.async = true;
  doc.head.appendChild(s);
  return s;
}

function injectElement(doc: Document, el: Element) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'script') {
    const src = el.getAttribute('src');
    const text = el.textContent || '';
    const s = doc.createElement('script');
    for (const attr of el.attributes) s.setAttribute(attr.name, attr.value);
    if (text) s.textContent = text;
    if (!s.hasAttribute('async') && src) s.async = true;
    doc.head.appendChild(s);
    return s;
  }
  if (tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'base' || tag === 'noscript') {
    const e = doc.createElement(tag);
    for (const attr of el.attributes) e.setAttribute(attr.name, attr.value);
    if (el.textContent) e.textContent = el.textContent;
    doc.head.appendChild(e);
    return e;
  }
  return null;
}

function parseAndInject(code: string, doc: Document): Element[] {
  const injected: Element[] = [];
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<head>${code}</head>`, 'text/html');
  const children = Array.from(parsed.head.children);
  for (const el of children) {
    const node = injectElement(doc, el);
    if (node) injected.push(node);
  }
  return injected;
}

export function HeadInjector() {
  const injectedRef = useRef<Element[]>([]);

  useEffect(() => {
    const prev = injectedRef.current;
    injectedRef.current = [];

    getSettings().then(r => {
      const data = r.data;

      // Custom head code
      if (data.customHeadCode) {
        const nodes = parseAndInject(data.customHeadCode, document);
        injectedRef.current.push(...nodes);
      }

      // Google Analytics
      if (data.googleAnalyticsId) {
        const gaId = data.googleAnalyticsId.trim();
        if (gaId) {
          const s1 = injectScript(document, `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
          injectedRef.current.push(s1);

          const s2 = injectScript(document, '', `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`);
          injectedRef.current.push(s2);
        }
      }
    }).catch(() => {});

    return () => {
      for (const el of prev) el.remove();
      for (const el of injectedRef.current) el.remove();
    };
  }, []);

  return null;
}
