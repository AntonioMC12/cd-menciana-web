import sanitizeHtml from 'sanitize-html';

export const escapeNewsText = (text: string) => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function cleanNewsHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: { b: 'strong', i: 'em', div: 'p' },
  });
}

export function renderNewsBody(body: string, format?: string): string {
  return format === 'html' ? cleanNewsHtml(body) : body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${escapeNewsText(p).replace(/\n/g, '<br>')}</p>`).join('');
}

export function newsBodyText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(?:p|div)>|<br\s*\/?>/gi, '\n\n'), { allowedTags: [], allowedAttributes: {} })
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' })[entity]!).trim();
}
