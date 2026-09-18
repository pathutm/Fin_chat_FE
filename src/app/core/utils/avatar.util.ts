import { inject, Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Hash a string (e.g. Supabase User ID) into a 32-bit integer deterministically.
 */
function hashString(str: string): number {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a clean, deterministic geometric SVG avatar string based on a user ID seed.
 */
export function generateUserAvatarSvg(userId: string): string {
  const seed = userId || 'default-user-id';
  const hash = hashString(seed);

  // Deterministic palette generation matching dark/green enterprise aesthetics
  const primaryHues = [160, 168, 175, 142, 190, 205, 260, 280, 320, 350, 30, 45];
  const hueIndex = hash % primaryHues.length;
  const hue1 = primaryHues[hueIndex];
  const hue2 = (hue1 + 45 + (hash % 60)) % 360;
  const angle = (hash * 37) % 360;

  // Geometry shape selection based on hash
  const shapeType = hash % 5;
  let shapeSvg = '';

  if (shapeType === 0) {
    // Concentric rings & core circle
    shapeSvg = `
      <circle cx="16" cy="16" r="10" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" fill="none" />
      <circle cx="16" cy="16" r="5" fill="rgba(255,255,255,0.9)" />
    `;
  } else if (shapeType === 1) {
    // Diamond with center dot
    shapeSvg = `
      <rect x="9.5" y="9.5" width="13" height="13" rx="3.5" transform="rotate(45 16 16)" fill="rgba(255,255,255,0.25)" />
      <circle cx="16" cy="16" r="4" fill="#ffffff" />
    `;
  } else if (shapeType === 2) {
    // Triangle star / geometric delta
    shapeSvg = `
      <polygon points="16,6 25,23 7,23" fill="rgba(255,255,255,0.22)" />
      <circle cx="16" cy="17" r="3.5" fill="#ffffff" />
    `;
  } else if (shapeType === 3) {
    // Overlapping rounded squares
    shapeSvg = `
      <rect x="7" y="7" width="18" height="18" rx="5" fill="rgba(255,255,255,0.18)" />
      <rect x="11" y="11" width="10" height="10" rx="3" fill="rgba(255,255,255,0.85)" />
    `;
  } else {
    // Octagon / hexagon abstract geometry
    shapeSvg = `
      <polygon points="11,6 21,6 26,11 26,21 21,26 11,26 6,21 6,11" fill="rgba(255,255,255,0.22)" />
      <circle cx="16" cy="16" r="4.5" fill="#ffffff" />
    `;
  }

  const gradId = `user-avatar-grad-${hash}`;

  return `<svg viewBox="0 0 32 32" width="32" height="32" style="border-radius: 50%; display: block; flex-shrink: 0; box-shadow: 0 0 10px rgba(0,0,0,0.25);">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="hsl(${hue1}, 70%, 45%)" />
        <stop offset="100%" stop-color="hsl(${hue2}, 75%, 35%)" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="16" fill="url(#${gradId})" />
    ${shapeSvg}
  </svg>`;
}

@Injectable({
  providedIn: 'root',
})
export class AvatarService {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, SafeHtml>();

  getSanitizedAvatar(userId?: string | null): SafeHtml {
    const key = userId || 'default-user';
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const rawSvg = generateUserAvatarSvg(key);
    const safeHtml = this.sanitizer.bypassSecurityTrustHtml(rawSvg);
    this.cache.set(key, safeHtml);
    return safeHtml;
  }
}
