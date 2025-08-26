import { htmlToText } from 'html-to-text';
export function toPlain(html: string) {
  if (!html) return '';
  try { return htmlToText(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] }); }
  catch { return html; }
}
