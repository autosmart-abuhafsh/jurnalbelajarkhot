import type { LogoConfig, TemaConfig } from '../types';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildFaviconDataUri(
  logoConfig?: LogoConfig,
  temaConfig?: TemaConfig
): string {
  if (logoConfig?.mode === 'image' && logoConfig.imageUrl) {
    const trimmed = logoConfig.imageUrl.trim();
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
      return trimmed;
    }
  }

  const primary = temaConfig?.warnaUtama || '#19432D';
  const secondary = temaConfig?.warnaGradasi || '#315B43';
  const accent = temaConfig?.warnaAksen || '#A3D1B3';
  const nibColor = logoConfig?.nibColor || '#E5B84B';
  const showOrnament = logoConfig?.showStarAndBook !== false;
  const symbol = (logoConfig?.arabicSymbol || 'خ').trim() || 'خ';
  const rx =
    logoConfig?.frameShape === 'circle'
      ? 30
      : logoConfig?.frameShape === 'square'
      ? 8
      : 16;

  const centerGlyph =
    symbol === 'خ'
      ? `<polygon points="32,25.2 34.4,27.5 32,29.8 29.6,27.5" fill="#FFFFFF" />
         <path d="M25.5 33.2C27.5 31.4 31.2 31.2 36.8 32.2C37.6 32.3 37.8 33.3 37 33.7C33.4 35.1 28.2 37.2 28.2 41.2C28.2 44.3 31.8 45.8 36.8 44.3" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />`
      : `<text x="32" y="39" text-anchor="middle" fill="#FFFFFF" font-size="20" font-weight="700" font-family="serif">${escapeXml(symbol)}</text>`;

  const ornament = showOrnament
    ? `<g opacity="0.22">
         <rect x="15" y="13" width="34" height="34" rx="4" stroke="#FFFFFF" stroke-width="1.4" />
         <rect x="15" y="13" width="34" height="34" rx="4" transform="rotate(45 32 30)" stroke="#FFFFFF" stroke-width="1.4" />
       </g>`
    : '';

  const book = showOrnament
    ? `<path d="M15.5 49C21 46.2 26.8 46.5 32 49.2C37.2 46.5 43 46.2 48.5 49" stroke="${escapeXml(accent)}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
       <path d="M21 53C25 50.8 28.8 51 32 53C35.2 51 39 50.8 43 53" stroke="${escapeXml(nibColor)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${escapeXml(primary)}" />
        <stop offset="100%" stop-color="${escapeXml(secondary)}" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="${rx}" fill="url(#g)" />
    <rect x="4.5" y="4.5" width="55" height="55" rx="${Math.max(4, rx - 2.5)}" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.2" />
    ${ornament}
    <path d="M32 8.5L43.5 25L39.5 44.5H24.5L20.5 25L32 8.5Z" fill="#FFFFFF" fill-opacity="0.08" stroke="${escapeXml(nibColor)}" stroke-width="2.2" stroke-linejoin="round" />
    <line x1="32" y1="9.5" x2="32" y2="20.5" stroke="${escapeXml(nibColor)}" stroke-width="1.8" stroke-linecap="round" />
    <circle cx="32" cy="22" r="2" fill="${escapeXml(nibColor)}" />
    ${centerGlyph}
    ${book}
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function syncDocumentFavicon(
  logoConfig?: LogoConfig,
  temaConfig?: TemaConfig
): void {
  if (typeof document === 'undefined') return;
  const href = buildFaviconDataUri(logoConfig, temaConfig);
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
  for (const rel of rels) {
    let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (href.startsWith('data:image/svg+xml')) {
      link.type = 'image/svg+xml';
    } else {
      link.removeAttribute('type');
    }
    link.href = href;
  }
}
