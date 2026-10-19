import sanitizeHtml from 'sanitize-html';

/**
 * Allowlist matched to what the blog editor can actually produce
 * (Tiptap starter-kit + image, table, colour, text-align, link).
 *
 * Everything else is stripped. This runs on write *and* on render, so a stored
 * payload can never execute script in a reader's browser — the previous
 * regex-based version only removed `<script>`/`<iframe>`/`on*=` and was easy to
 * bypass.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
    'code', 'pre', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['colspan', 'rowspan', 'style'],
    td: ['colspan', 'rowspan', 'style'],
    '*': ['style', 'class'],
  },
  // Only the CSS the editor emits; arbitrary declarations are dropped.
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
      'background-color': [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
      'font-weight': [/^(normal|bold|[1-9]00)$/],
      'font-style': [/^(normal|italic)$/],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Inline images may be data: URIs (editor uploads/paste).
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  // Any external link opens safely and carries no referrer/SEO endorsement.
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || '';
      return {
        tagName,
        attribs: /^https?:\/\//i.test(href)
          ? { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' }
          : attribs,
      };
    },
  },
};

export function sanitizeBlogHtml(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(html, OPTIONS);
}
