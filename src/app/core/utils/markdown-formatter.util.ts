import { inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

// Configure marked options for clean GFM and line break preservation
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Parses raw backend assistant content into structured, semantic HTML markdown.
 * Preserves all actual text, monetary values, numbers, and technical terms.
 */
export function parseMarkdownToHtml(content: string): string {
  if (!content) return '';
  try {
    const html = marked.parse(content);
    return typeof html === 'string' ? html : content;
  } catch (e) {
    console.error('Markdown parsing error:', e);
    return content;
  }
}

@Injectable({
  providedIn: 'root',
})
export class MarkdownFormatterService {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, SafeHtml>();

  formatMarkdown(content: string): SafeHtml {
    if (!content) return '';
    if (this.cache.has(content)) {
      return this.cache.get(content)!;
    }
    const html = parseMarkdownToHtml(content);
    const safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);

    // Keep cache size bounded
    if (this.cache.size > 200) {
      this.cache.clear();
    }
    this.cache.set(content, safeHtml);
    return safeHtml;
  }
}
