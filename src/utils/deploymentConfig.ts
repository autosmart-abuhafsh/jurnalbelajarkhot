/**
 * Utilitas Konfigurasi Deployment (GitHub Pages / github.io, Vercel.app, & Google Apps Script Env)
 * Memastikan routing SPA tidak pernah blank putih di sub-path repository github.io
 * serta membaca Environment Variable Vercel dan parameter sinkronisasi lintas perangkat (HP & PC).
 */

export interface DeploymentEnvConfig {
  gasWebAppUrl: string;
  spreadsheetId: string;
  autoSyncEnabled: boolean;
  isEnvInjected: boolean;
}

/**
 * Daftar rute internal aplikasi yang sah.
 */
const INTERNAL_ROUTE_PREFIXES = [
  '/login',
  '/admin',
  '/guru',
  '/print',
];

/**
 * Mendeteksi prefix sub-direktori ketika aplikasi di-deploy pada GitHub Pages
 * seperti https://username.github.io/nama-repo/admin/dashboard -> basePrefix = '/nama-repo'
 */
export function detectBasePathPrefix(pathname: string): string {
  if (!pathname || pathname === '/' || pathname === '/index.html') {
    return '';
  }

  const clean = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
  if (clean === '/') return '';

  // Jika sudah langsung diawali rute internal (/admin, /guru, /login, /print), tidak ada prefix repo
  for (const prefix of INTERNAL_ROUTE_PREFIXES) {
    if (clean === prefix || clean.startsWith(prefix + '/')) {
      return '';
    }
  }

  // Cek apakah segmen pertama diikuti oleh rute internal: misal /nama-repo/admin/dashboard
  const segments = clean.split('/').filter(Boolean);
  if (segments.length >= 1) {
    const firstSegment = '/' + segments[0];
    const rest = '/' + segments.slice(1).join('/');
    for (const prefix of INTERNAL_ROUTE_PREFIXES) {
      if (rest === prefix || rest.startsWith(prefix + '/')) {
        return firstSegment;
      }
    }
    // Jika hanya 1 segmen di github.io (misal /nama-repo atau /nama-repo/), maka segmen itu adalah base repo
    if (segments.length === 1 && !INTERNAL_ROUTE_PREFIXES.includes(firstSegment)) {
      return firstSegment;
    }
  }

  return '';
}

/**
 * Menormalkan lokasi URL browser (pathname, search ?p=..., atau hash #/...)
 * menjadi rute internal aplikasi (seperti '/admin/dashboard' atau '/login')
 * agar tidak pernah blank putih di GitHub Pages (github.io) maupun Vercel (vercel.app).
 */
export function normalizeInternalRoute(
  pathname: string,
  search = '',
  hash = ''
): string {
  // 1. Prioritaskan parameter redirect SPA dari 404.html (?p=/admin/...)
  if (search) {
    const params = new URLSearchParams(search);
    const redirectedPath = params.get('p') || params.get('route');
    if (redirectedPath && redirectedPath.startsWith('/')) {
      return normalizeInternalRoute(redirectedPath, '', '');
    }
  }

  // 2. Dukung hash routing (#/admin/dashboard) untuk GitHub Pages (github.io)
  if (hash && hash.startsWith('#/')) {
    const hashRoute = hash.slice(1).split('?')[0];
    if (hashRoute) {
      return normalizeInternalRoute(hashRoute, '', '');
    }
  }

  if (!pathname || pathname === '/' || pathname === '/index.html') {
    return '/admin/dashboard';
  }

  const withoutIndex = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
  if (withoutIndex === '/') {
    return '/admin/dashboard';
  }

  // Jika cocok langsung dengan rute internal
  for (const prefix of INTERNAL_ROUTE_PREFIXES) {
    if (withoutIndex === prefix || withoutIndex.startsWith(prefix + '/')) {
      return withoutIndex;
    }
  }

  // Jika berada di sub-folder repository GitHub Pages (contoh: /jurnal-khot/admin/santri)
  const segments = withoutIndex.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const candidate = '/' + segments.slice(1).join('/');
    for (const prefix of INTERNAL_ROUTE_PREFIXES) {
      if (candidate === prefix || candidate.startsWith(prefix + '/')) {
        return candidate;
      }
    }
  }

  // Default fallback ke dashboard agar tidak pernah merender layar kosong (blank putih)
  return '/admin/dashboard';
}

/**
 * Membentuk URL browser untuk history.pushState.
 * - Jika aplikasi berjalan di sub-path repository GitHub Pages (basePrefix !== '') atau menggunakan hash routing,
 *   kita menjaga pathname tetap di root repository (`${basePrefix}/`) dan menaruh rute di hash (`#${normalizedTarget}`)
 *   agar path relatif `./assets/...` tidak pernah rusak dan refresh di HP/PC tidak pernah 404 / blank putih.
 * - Jika berjalan di root domain (Vercel.app / localhost), gunakan clean path `${normalizedTarget}`.
 */
export function buildBrowserHistoryUrl(
  internalPath: string,
  currentPathname: string,
  currentSearch = '',
  useHashForSubpath = false
): string {
  const basePrefix = detectBasePathPrefix(currentPathname);
  const normalizedTarget = internalPath.startsWith('/') ? internalPath : '/' + internalPath;

  // Pertahankan query autostart=1 atau gas=... jika ada, hapus parameter redirect sementara p / route
  const params = new URLSearchParams(currentSearch);
  params.delete('p');
  params.delete('route');
  const queryString = params.toString();

  if (useHashForSubpath && basePrefix) {
    const rootRepoPath = `${basePrefix}/`;
    const queryPart = queryString ? `?${queryString}` : '';
    return `${rootRepoPath}${queryPart}#${normalizedTarget}`;
  }

  const fullPath = `${basePrefix}${normalizedTarget}` || '/';
  return queryString ? `${fullPath}?${queryString}` : fullPath;
}

/**
 * Mengekstrak URL Google Apps Script dari query parameter (?gas=https://script.google.com/...)
 * untuk memudahkan pairing sinkronisasi instan antara PC dan HP.
 */
export function extractGasUrlFromSearch(search: string): string {
  if (!search) return '';
  try {
    const params = new URLSearchParams(search);
    const candidate = (params.get('gas') || params.get('gasUrl') || '').trim();
    if (candidate.startsWith('https://script.google.com/')) {
      return candidate;
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Membaca konfigurasi URL Google Apps Script & Spreadsheet ID dari Environment Variables
 * (Vercel / Vite build-time env) dengan fallback ke pengaturan database.
 */
export function resolveGasEnvironmentConfig(
  savedGasUrl?: string,
  savedSpreadsheetId?: string,
  envOverrides?: Record<string, string | undefined>
): DeploymentEnvConfig {
  let metaEnv: Record<string, string | undefined> = {};
  try {
    if (
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ) {
      metaEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
    }
  } catch {
    // ignore in Node test environment
  }

  const source = envOverrides || metaEnv;

  const envGasUrl = (
    source.VITE_GAS_WEB_APP_URL ||
    source.VITE_GOOGLE_APPS_SCRIPT_URL ||
    source.GAS_WEB_APP_URL ||
    source.GOOGLE_APPS_SCRIPT_URL ||
    source.NEXT_PUBLIC_GAS_WEB_APP_URL ||
    source.NEXT_PUBLIC_GAS_URL ||
    ''
  ).trim();

  const envSheetId = (
    source.VITE_GAS_SPREADSHEET_ID ||
    source.VITE_SPREADSHEET_ID ||
    source.GAS_SPREADSHEET_ID ||
    source.SPREADSHEET_ID ||
    ''
  ).trim();

  const finalGasUrl = envGasUrl || (savedGasUrl || '').trim();
  const finalSpreadsheetId = envSheetId || (savedSpreadsheetId || '').trim();

  return {
    gasWebAppUrl: finalGasUrl,
    spreadsheetId: finalSpreadsheetId,
    autoSyncEnabled: Boolean(finalGasUrl && finalGasUrl.startsWith('https://script.google.com/')),
    isEnvInjected: Boolean(envGasUrl),
  };
}
