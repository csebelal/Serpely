import DOMPurify from 'dompurify';

/**
 * Defence in depth: the server sanitises blog HTML on write and on render, but
 * the client never trusts stored markup either. DOMPurify's default profile
 * drops scripts, event handlers, `javascript:` URLs and other script sinks.
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}

/** For inline SVG fragments (icon markup) injected with innerHTML. */
export function sanitizeSvgFragment(svg: string | undefined | null): string {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
