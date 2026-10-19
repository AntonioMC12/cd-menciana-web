import { describe, expect, it } from 'vitest';
import { cleanNewsHtml, renderNewsBody, newsBodyText } from '../src/lib/news-body';
import { validateContent } from '../src/lib/cms';

describe('news rich text', () => {
  it('preserves existing plain news and escapes HTML in legacy content', () => {
    expect(renderNewsBody('Primer párrafo\n\n<b>Texto literal</b>')).toBe('<p>Primer párrafo</p><p>&lt;b&gt;Texto literal&lt;/b&gt;</p>');
  });
  it('keeps supported nested formatting and links in saved content', () => {
    const body = '<div><b>Club <i>unido</i></b> <u>siempre</u> <a href="https://cdmenciana.es/">Web</a></div>';
    const draft = validateContent({ title: 'Noticia', excerpt: 'Club', category: 'Club', body, bodyFormat: 'html' }, 'posts');
    expect(draft.bodyFormat).toBe('html');
    expect(renderNewsBody(draft.body, draft.bodyFormat)).toBe('<p><strong>Club <em>unido</em></strong> <u>siempre</u> <a href="https://cdmenciana.es/">Web</a></p>');
    expect(newsBodyText(draft.body)).toBe('Club unido siempre Web');
  });
  it('removes executable HTML, attributes and unsafe link schemes', () => {
    const html = cleanNewsHtml('<p onclick="alert(1)">Hola<script>alert(1)</script><img src=x onerror="alert(1)"><a href="java&#x73;cript:alert(1)" style="color:red">mal</a><a href="//evil.example">relativo</a></p>');
    expect(html).toBe('<p>Hola<a>mal</a><a>relativo</a></p>');
    expect(cleanNewsHtml('<a href="mailto:club@example.com">Correo</a>')).toContain('href="mailto:club@example.com"');
  });
  it('rejects rich bodies with no text or too much markup', () => {
    const base = { title: 'Noticia', excerpt: 'Club', category: 'Club', bodyFormat: 'html' };
    expect(() => validateContent({ ...base, body: '<p><br></p>' }, 'posts')).toThrow();
    expect(() => validateContent({ ...base, body: '<script>alert(1)</script>' }, 'posts')).toThrow();
    expect(() => validateContent({ ...base, body: '<p>' + 'x'.repeat(20000) + '</p>' }, 'posts')).toThrow();
  });
});
