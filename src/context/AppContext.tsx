import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Absensi,
  ActivityLog,
  CatatanPerkembangan,
  DatabaseState,
  JurnalPembelajaran,
  Kelas,
  PengaturanAkademik,
  Penilaian,
  RiwayatRapor,
  RubrikPenilaian,
  Santri,
  User,
} from '../types';
import { INITIAL_DATABASE_STATE } from '../data/seedData';
import {
  findUserByLoginIdentifier,
  upsertAttendanceRecord,
  validatePortalRoleAccess,
} from '../utils/academicRules';
import { syncDocumentFavicon } from '../utils/faviconSync';
import {
  normalizeInternalRoute,
  buildBrowserHistoryUrl,
  resolveGasEnvironmentConfig,
  detectBasePathPrefix,
  extractGasUrlFromSearch,
} from '../utils/deploymentConfig';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface AppContextType {
  db: DatabaseState;
  currentUser: User | null;
  authToken: string | null;
  isLoading: boolean;
  isTransitioning: boolean;
  transitionMessage: { title: string; subtitle: string };
  isSaving: boolean;
  dbStatus: 'connected' | 'syncing' | 'error';
  isEnvGasConfigured: boolean;
  effectiveGasUrl: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentPath: string;
  navigate: (path: string) => void;
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  confirmDialog: ConfirmDialogState;
  askConfirm: (opts: Omit<ConfirmDialogState, 'isOpen'>) => void;
  closeConfirm: () => void;

  // Auth actions
  login: (
    username: string,
    password: string,
    portalMode?: 'GURU' | 'ADMIN'
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetUserPassword: (targetUserId: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  changeOwnPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;

  // Scoped getters for current user (Admin sees all, Guru sees assigned classes)
  visibleKelas: Kelas[];
  visibleSantri: Santri[];
  visibleJurnal: JurnalPembelajaran[];

  // CRUD Mutations
  saveSantri: (santri: Santri, isNew: boolean) => Promise<boolean>;
  deleteSantri: (santriId: string) => Promise<boolean>;
  importSantriBatch: (items: Santri[]) => Promise<boolean>;

  saveKelas: (kelas: Kelas, isNew: boolean) => Promise<boolean>;
  deleteKelas: (kelasId: string) => Promise<boolean>;

  saveGuru: (guru: User, isNew: boolean, initialPassword?: string) => Promise<boolean>;
  deleteGuru: (userId: string) => Promise<boolean>;

  saveJurnal: (jurnal: JurnalPembelajaran, isNew: boolean) => Promise<boolean>;
  deleteJurnal: (jurnalId: string) => Promise<boolean>;

  saveAbsensiBatch: (jurnalId: string, records: Absensi[]) => Promise<boolean>;

  savePenilaianBatch: (
    jurnalId: string,
    records: Penilaian[],
    alasanKoreksi?: string
  ) => Promise<boolean>;

  saveCatatanPerkembangan: (catatan: CatatanPerkembangan, isNew: boolean) => Promise<boolean>;
  deleteCatatanPerkembangan: (catatanId: string) => Promise<boolean>;

  saveRubrikList: (rubriks: RubrikPenilaian[], logNote: string) => Promise<boolean>;

  saveRapor: (rapor: RiwayatRapor, isNew: boolean) => Promise<boolean>;
  deleteRapor: (raporId: string) => Promise<boolean>;

  savePengaturan: (pengaturan: PengaturanAkademik) => Promise<boolean>;
  syncWithGoogleSheets: (customUrl?: string) => Promise<{ success: boolean; message: string }>;
  pullFromGoogleSheets: (customUrl?: string, silent?: boolean) => Promise<{ success: boolean; message: string }>;
  resetDemoDatabase: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_DB = 'bk_academic_db_v1';
const STORAGE_KEY_TOKEN = 'bk_academic_token_v1';
const STORAGE_KEY_USER = 'bk_academic_user_v1';
const STORAGE_KEY_THEME = 'bk_academic_theme_v1';
const STORAGE_KEY_LOCAL_PASSWORDS = 'bk_academic_local_passwords_v1';

function readLocalPasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_PASSWORDS);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    admin: 'admin123',
    syamsu: 'guru123',
    hasan: 'guru123',
  };
}

function saveLocalPassword(username: string, password: string) {
  try {
    const current = readLocalPasswords();
    current[username.toLowerCase()] = password;
    localStorage.setItem(STORAGE_KEY_LOCAL_PASSWORDS, JSON.stringify(current));
  } catch {
    // ignore
  }
}

async function directPullFromGas(gasUrl: string): Promise<DatabaseState | null> {
  if (!gasUrl || !gasUrl.startsWith('https://script.google.com/')) return null;
  try {
    const sep = gasUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${gasUrl}${sep}action=getState`, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.success && json.state && json.state.santri) {
      return json.state as DatabaseState;
    }
  } catch {
    // ignore network/CORS fallback
  }
  return null;
}

async function directPushToGas(gasUrl: string, state: DatabaseState, action = 'syncSnapshot'): Promise<boolean> {
  if (!gasUrl || !gasUrl.startsWith('https://script.google.com/')) return false;
  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      redirect: 'follow',
      // Gunakan text/plain agar Google Apps Script tidak memblokir preflight CORS dari browser (github.io / vercel.app)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const urlPairedGas = typeof window !== 'undefined' ? extractGasUrlFromSearch(window.location.search) : '';

  const initialEnvConfig = resolveGasEnvironmentConfig(
    urlPairedGas || INITIAL_DATABASE_STATE.pengaturan.gasWebAppUrl,
    INITIAL_DATABASE_STATE.pengaturan.spreadsheetId
  );

  const [db, setDb] = useState<DatabaseState>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DB);
      if (cached) {
        const parsed = JSON.parse(cached) as DatabaseState;
        const storedGasUrl =
          !parsed.pengaturan?.gasWebAppUrl ||
          parsed.pengaturan.gasWebAppUrl.includes('YOUR_DEPLOYMENT_ID')
            ? INITIAL_DATABASE_STATE.pengaturan.gasWebAppUrl
            : parsed.pengaturan.gasWebAppUrl;
        const resolved = resolveGasEnvironmentConfig(
          urlPairedGas || storedGasUrl,
          parsed.pengaturan?.spreadsheetId
        );
        if (resolved.gasWebAppUrl && parsed.pengaturan) {
          parsed.pengaturan.gasWebAppUrl = resolved.gasWebAppUrl;
        }
        if (resolved.spreadsheetId && parsed.pengaturan) {
          parsed.pengaturan.spreadsheetId = resolved.spreadsheetId;
        }
        return parsed;
      }
    } catch {
      // ignore
    }
    const clone = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE)) as DatabaseState;
    if (initialEnvConfig.gasWebAppUrl) {
      clone.pengaturan.gasWebAppUrl = initialEnvConfig.gasWebAppUrl;
    }
    if (initialEnvConfig.spreadsheetId) {
      clone.pengaturan.spreadsheetId = initialEnvConfig.spreadsheetId;
    }
    return clone;
  });

  const [isEnvGasConfigured, setIsEnvGasConfigured] = useState<boolean>(
    initialEnvConfig.isEnvInjected
  );

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionMessage, setTransitionMessage] = useState<{ title: string; subtitle: string }>({
    title: 'Memverifikasi Akses Portal...',
    subtitle: 'Menyiapkan ruang kerja jurnal dan data santri',
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('connected');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => {
    return normalizeInternalRoute(
      window.location.pathname,
      window.location.search,
      window.location.hash
    );
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const effectiveGasUrl = React.useMemo(() => {
    const resolved = resolveGasEnvironmentConfig(
      db.pengaturan?.gasWebAppUrl,
      db.pengaturan?.spreadsheetId
    );
    return resolved.gasWebAppUrl;
  }, [db.pengaturan?.gasWebAppUrl, db.pengaturan?.spreadsheetId]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  // Sync browser tab & search favicon dynamically with active app logo & theme
  useEffect(() => {
    syncDocumentFavicon(db.pengaturan?.logoConfig, db.pengaturan?.temaConfig);
  }, [db.pengaturan?.logoConfig, db.pengaturan?.temaConfig]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const showToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = 'TST-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const askConfirm = useCallback((opts: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({
      ...opts,
      isOpen: true,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const navigate = useCallback((path: string) => {
    const normalized = normalizeInternalRoute(path, '', '');
    setCurrentPath(normalized);
    try {
      const isSubpathOrGithubIo =
        window.location.hostname.includes('github.io') ||
        Boolean(detectBasePathPrefix(window.location.pathname));
      const browserUrl = buildBrowserHistoryUrl(
        normalized,
        window.location.pathname,
        window.location.search,
        isSubpathOrGithubIo
      );
      window.history.pushState({}, '', browserUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore in sandboxed frames
    }
  }, []);

  useEffect(() => {
    const onUrlChange = () => {
      setCurrentPath(
        normalizeInternalRoute(
          window.location.pathname,
          window.location.search,
          window.location.hash
        )
      );
    };
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
    return () => {
      window.removeEventListener('popstate', onUrlChange);
      window.removeEventListener('hashchange', onUrlChange);
    };
  }, []);

  // Load initial state from backend API (Vercel / Express) + Direct Google Apps Script Auto-Sync (HP & PC)
  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      const startedAt = Date.now();
      setIsLoading(true);
      try {
        // Validate existing server token if present
        const existingToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        if (existingToken && !existingToken.startsWith('STATIC-TOKEN-')) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${existingToken}` },
            });
            const meType = meRes.headers.get('content-type') || '';
            if (meType.includes('application/json')) {
              const meJson = await meRes.json();
              if (!meRes.ok || !meJson.success) {
                if (mounted) {
                  setCurrentUser(null);
                  setAuthToken(null);
                  localStorage.removeItem(STORAGE_KEY_USER);
                  localStorage.removeItem(STORAGE_KEY_TOKEN);
                }
              } else if (mounted && meJson.user) {
                setCurrentUser(meJson.user);
                localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(meJson.user));
              }
            }
          } catch {
            // Static host fallback
          }
        }

        const localGas = urlPairedGas || db.pengaturan?.gasWebAppUrl || '';
        let serverHandled = false;
        try {
          const queryParam = localGas ? `?gasUrl=${encodeURIComponent(localGas)}` : '';
          const res = await fetch(`/api/state${queryParam}`);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json = await res.json();
            if (mounted && json.success && json.data) {
              const resolved = resolveGasEnvironmentConfig(
                localGas || json.data.pengaturan?.gasWebAppUrl,
                json.data.pengaturan?.spreadsheetId
              );
              if (resolved.gasWebAppUrl && json.data.pengaturan) {
                json.data.pengaturan.gasWebAppUrl = resolved.gasWebAppUrl;
              }
              if (resolved.spreadsheetId && json.data.pengaturan) {
                json.data.pengaturan.spreadsheetId = resolved.spreadsheetId;
              }
              if (json.envGasConfigured || resolved.isEnvInjected) {
                setIsEnvGasConfigured(true);
              }
              setDb(json.data);
              localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
              setDbStatus('connected');
              serverHandled = true;
            }
          }
        } catch {
          // Static hosting (github.io) does not have /api/state
        }

        // Jika di-deploy di GitHub Pages (static) atau memiliki URL GAS di client, tarik langsung dari GAS
        if (mounted) {
          const resolved = resolveGasEnvironmentConfig(
            localGas || db.pengaturan?.gasWebAppUrl,
            db.pengaturan?.spreadsheetId
          );
          if (resolved.gasWebAppUrl && (!serverHandled || urlPairedGas)) {
            const gasState = await directPullFromGas(resolved.gasWebAppUrl);
            if (mounted && gasState && gasState.santri) {
              gasState.pengaturan = {
                ...db.pengaturan,
                ...(gasState.pengaturan || {}),
                gasWebAppUrl: resolved.gasWebAppUrl,
                ...(resolved.spreadsheetId ? { spreadsheetId: resolved.spreadsheetId } : {}),
              };
              setDb(gasState);
              localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(gasState));
            }
          }
          setDbStatus('connected');
        }
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, 480 - elapsed);
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining));
        }
        if (mounted) setIsLoading(false);
      }
    }
    fetchInitial();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-Sync Lintas Perangkat (HP <-> PC): Ketika tab kembali aktif atau setiap 20 detik
  useEffect(() => {
    let isChecking = false;
    const checkRemoteUpdates = async () => {
      if (isChecking || isSaving || document.hidden) return;
      isChecking = true;
      try {
        const gasUrl = effectiveGasUrl;
        const queryParam = gasUrl ? `?gasUrl=${encodeURIComponent(gasUrl)}` : '';
        let updatedFromServer = false;

        try {
          const res = await fetch(`/api/state${queryParam}`);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const json = await res.json();
            if (json.success && json.data && json.data.santri) {
              const remoteSync = json.data.pengaturan?.lastSyncAt || '';
              const localSync = db.pengaturan?.lastSyncAt || '';
              if (remoteSync && remoteSync !== localSync && remoteSync > localSync) {
                if (gasUrl && json.data.pengaturan) {
                  json.data.pengaturan.gasWebAppUrl = gasUrl;
                }
                setDb(json.data);
                localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
              }
              updatedFromServer = true;
            }
          }
        } catch {
          // Static host fallback (github.io)
        }

        if (!updatedFromServer && gasUrl) {
          const remoteState = await directPullFromGas(gasUrl);
          if (remoteState && remoteState.santri) {
            const remoteSync = remoteState.pengaturan?.lastSyncAt || '';
            const localSync = db.pengaturan?.lastSyncAt || '';
            if (remoteSync && remoteSync !== localSync && remoteSync > localSync) {
              remoteState.pengaturan = {
                ...db.pengaturan,
                ...(remoteState.pengaturan || {}),
                gasWebAppUrl: gasUrl,
              };
              setDb(remoteState);
              localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(remoteState));
            }
          }
        }
      } finally {
        isChecking = false;
      }
    };

    const intervalId = window.setInterval(checkRemoteUpdates, 20000);
    const onFocusOrVisible = () => {
      if (!document.hidden) {
        checkRemoteUpdates();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [db.pengaturan, effectiveGasUrl, isSaving]);

  const persistStateToServer = useCallback(
    async (nextState: DatabaseState, section?: string): Promise<boolean> => {
      setIsSaving(true);
      setDbStatus('syncing');

      const now = new Date().toISOString();
      const resolved = resolveGasEnvironmentConfig(
        nextState.pengaturan?.gasWebAppUrl,
        nextState.pengaturan?.spreadsheetId
      );
      if (nextState.pengaturan) {
        nextState.pengaturan.lastSyncAt = now;
        if (resolved.gasWebAppUrl) {
          nextState.pengaturan.gasWebAppUrl = resolved.gasWebAppUrl;
        }
      }

      // Simpan langsung di state & localStorage agar UI responsif di HP maupun PC
      setDb(nextState);
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(nextState));

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }
        const res = await fetch('/api/state', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ state: nextState, section }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok || !json.success) {
            setDbStatus('error');
            showToast('error', 'Gagal Menyimpan Data', json.error || 'Terjadi gangguan pada server.');
            return false;
          }
          // Jika server belum menyinkronkan ke GAS namun ada URL GAS di client, sinkronkan di background
          if (!json.gasSynced && resolved.gasWebAppUrl) {
            void directPushToGas(resolved.gasWebAppUrl, nextState, 'syncSnapshot');
          }
          setDbStatus('connected');
          return true;
        }

        // Static host fallback (github.io): langsung sinkron ke Google Apps Script
        if (resolved.gasWebAppUrl) {
          await directPushToGas(resolved.gasWebAppUrl, nextState, 'syncSnapshot');
        }
        setDbStatus('connected');
        return true;
      } catch {
        // Fallback static / offline: tetap coba kirim langsung ke Google Apps Script jika tersedia
        if (resolved.gasWebAppUrl) {
          await directPushToGas(resolved.gasWebAppUrl, nextState, 'syncSnapshot');
        }
        setDbStatus('connected');
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [authToken, showToast]
  );

  const createLogEntry = useCallback(
    (
      jenisData: string,
      aksi: ActivityLog['aksi'],
      entitasId: string,
      nilaiSebelumnya: string,
      nilaiTerbaru: string,
      keterangan: string
    ): ActivityLog => {
      return {
        logId: 'LOG-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        userId: currentUser?.userId || 'USR-SYSTEM',
        namaPengguna: currentUser?.namaLengkap || 'Administrator',
        role: currentUser?.role || 'ADMIN',
        jenisData,
        aksi,
        entitasId,
        nilaiSebelumnya,
        nilaiTerbaru,
        keterangan,
        timestamp: new Date().toISOString(),
      };
    },
    [currentUser]
  );

  const login = useCallback(
    async (
      username: string,
      password: string,
      portalMode?: 'GURU' | 'ADMIN'
    ): Promise<{ success: boolean; error?: string }> => {
      const normalizedIdentifier = username.trim().toLowerCase();
      setTransitionMessage({
        title: 'Memverifikasi ID & Kredensial...',
        subtitle:
          portalMode === 'GURU'
            ? 'Mengautentikasi akun pengajar & kelas binaan Anda'
            : 'Mengautentikasi akses sistem akademik Belajar Khot',
      });
      setIsTransitioning(true);

      const completeLoginTransition = async (user: User, token: string) => {
        setTransitionMessage({
          title: `Selamat Datang, ${user.namaLengkap}`,
          subtitle:
            user.role === 'GURU'
              ? 'Membuka ruang manajemen jurnal, absensi, dan penilaian santri...'
              : 'Membuka dashboard administrasi akademik Belajar Khot...',
        });
        await new Promise((r) => setTimeout(r, 700));
        setCurrentUser(user);
        setAuthToken(token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_TOKEN, token);

        const targetRoute = user.role === 'ADMIN' ? '/admin/dashboard' : '/guru/dashboard';
        navigate(targetRoute);
        setIsTransitioning(false);
        showToast(
          'success',
          `Assalamu'alaikum, ${user.namaLengkap}`,
          'Selamat datang di Jurnal Akademik Belajar Khot.'
        );
      };

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, portalMode }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok || !json.success) {
            setIsTransitioning(false);
            return { success: false, error: json.error || 'Login gagal.' };
          }
          await completeLoginTransition(json.user as User, json.token as string);
          return { success: true };
        }
      } catch {
        // Lanjut ke autentikasi lokal/statis (untuk GitHub Pages github.io)
      }

      // Fallback Autentikasi Statis (GitHub Pages / github.io)
      const user = findUserByLoginIdentifier(db.users, normalizedIdentifier);
      if (!user) {
        setIsTransitioning(false);
        return { success: false, error: 'ID Login atau Username tidak ditemukan.' };
      }
      if (user.statusAkun !== 'Aktif') {
        setIsTransitioning(false);
        return { success: false, error: 'Akun pengguna sedang dinonaktifkan oleh Administrator.' };
      }
      const portalCheck = validatePortalRoleAccess(user.role, portalMode);
      if (!portalCheck.allowed) {
        setIsTransitioning(false);
        return { success: false, error: portalCheck.error };
      }
      const localPasswords = readLocalPasswords();
      const expectedPassword =
        localPasswords[user.username.toLowerCase()] || (user.role === 'ADMIN' ? 'admin123' : 'guru123');
      if (password !== expectedPassword) {
        setIsTransitioning(false);
        return { success: false, error: 'Password yang Anda masukkan tidak sesuai.' };
      }

      const token = 'STATIC-TOKEN-' + Date.now();
      await completeLoginTransition(user, token);
      return { success: true };
    },
    [db.users, navigate, showToast]
  );

  const logout = useCallback(async () => {
    try {
      if (authToken && !authToken.startsWith('STATIC-TOKEN-')) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    navigate('/login');
    showToast('info', 'Anda telah keluar', 'Sesi login telah diakhiri dengan aman.');
  }, [authToken, navigate, showToast]);

  const resetUserPassword = useCallback(
    async (targetUserId: string, newPassword: string) => {
      const targetUser = db.users.find((u) => u.userId === targetUserId);
      if (targetUser) {
        saveLocalPassword(targetUser.username, newPassword);
      }
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ targetUserId, newPassword }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast('error', 'Gagal Reset Password', json.error);
            return { success: false, message: json.error };
          }
          showToast('success', 'Password Diperbarui', json.message);
          return { success: true, message: json.message };
        }
      } catch {
        // Fallback static mode
      }
      const msg = `Password untuk ${targetUser?.namaLengkap || 'pengguna'} berhasil diperbarui.`;
      showToast('success', 'Password Diperbarui', msg);
      return { success: true, message: msg };
    },
    [authToken, db.users, showToast]
  );

  const changeOwnPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!currentUser) {
        return { success: false, message: 'Sesi login tidak ditemukan.' };
      }
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok || !json.success) {
            showToast('error', 'Gagal Mengubah Password', json.error);
            return { success: false, message: json.error };
          }
          saveLocalPassword(currentUser.username, newPassword);
          showToast('success', 'Password Diperbarui', json.message);
          return { success: true, message: json.message };
        }
      } catch {
        // Static mode fallback
      }
      const localPasswords = readLocalPasswords();
      const expected =
        localPasswords[currentUser.username.toLowerCase()] ||
        (currentUser.role === 'ADMIN' ? 'admin123' : 'guru123');
      if (currentPassword !== expected) {
        showToast('error', 'Gagal Mengubah Password', 'Password saat ini tidak sesuai.');
        return { success: false, message: 'Password saat ini tidak sesuai.' };
      }
      saveLocalPassword(currentUser.username, newPassword);
      showToast('success', 'Password Diperbarui', 'Password akun Anda berhasil diperbarui.');
      return { success: true, message: 'Password akun Anda berhasil diperbarui.' };
    },
    [authToken, currentUser, showToast]
  );

  // Filter Demo Data if tampilkanDataDemo is false
  const baseKelas = db.pengaturan.tampilkanDataDemo
    ? db.kelas
    : db.kelas.filter((k) => !k.isDemo);
  const baseSantri = db.pengaturan.tampilkanDataDemo
    ? db.santri
    : db.santri.filter((s) => !s.isDemo);
  const baseJurnal = db.pengaturan.tampilkanDataDemo
    ? db.jurnal
    : db.jurnal.filter((j) => !j.isDemo);

  // Scoped visibility for Guru vs Admin
  const visibleKelas = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return baseKelas;
    return baseKelas.filter(
      (k) =>
        currentUser.kelasDiampu.includes(k.kelasId) ||
        (currentUser.guruId && k.guruId === currentUser.guruId)
    );
  }, [baseKelas, currentUser]);

  const visibleKelasIds = React.useMemo(
    () => new Set(visibleKelas.map((k) => k.kelasId)),
    [visibleKelas]
  );

  const visibleSantri = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return baseSantri;
    return baseSantri.filter((s) => visibleKelasIds.has(s.kelasId));
  }, [baseSantri, currentUser, visibleKelasIds]);

  const visibleJurnal = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return baseJurnal;
    return baseJurnal.filter((j) => visibleKelasIds.has(j.kelasId));
  }, [baseJurnal, currentUser, visibleKelasIds]);

  // CRUD: Santri
  const saveSantri = useCallback(
    async (santri: Santri, isNew: boolean): Promise<boolean> => {
      const prev = db.santri.find((s) => s.santriId === santri.santriId);
      const nextSantri = isNew
        ? [santri, ...db.santri]
        : db.santri.map((s) => (s.santriId === santri.santriId ? santri : s));

      const log = createLogEntry(
        'Data Santri',
        isNew ? 'TAMBAH' : 'EDIT',
        santri.memberId,
        prev ? `${prev.namaLengkap} (${prev.namaKelas})` : '-',
        `${santri.namaLengkap} (${santri.namaKelas})`,
        isNew ? `Menambahkan santri baru ${santri.namaLengkap}` : `Memperbarui data santri ${santri.namaLengkap}`
      );

      const nextState: DatabaseState = {
        ...db,
        santri: nextSantri,
        activityLogs: [log, ...db.activityLogs],
      };

      const ok = await persistStateToServer(nextState, 'santri');
      if (ok) {
        showToast(
          'success',
          isNew ? 'Santri Ditambahkan' : 'Data Santri Diperbarui',
          `${santri.memberId} — ${santri.namaLengkap} berhasil disimpan.`
        );
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  const deleteSantri = useCallback(
    async (santriId: string): Promise<boolean> => {
      const target = db.santri.find((s) => s.santriId === santriId);
      if (!target) return false;
      const log = createLogEntry(
        'Data Santri',
        'HAPUS',
        target.memberId,
        `${target.namaLengkap} (${target.namaKelas})`,
        'Dihapus',
        `Menghapus data santri ${target.namaLengkap}`
      );
      const nextState: DatabaseState = {
        ...db,
        santri: db.santri.filter((s) => s.santriId !== santriId),
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'santri');
      if (ok) {
        showToast('success', 'Santri Dihapus', `Data ${target.namaLengkap} telah dihapus.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  const importSantriBatch = useCallback(
    async (items: Santri[]): Promise<boolean> => {
      const existingMemberIds = new Set(db.santri.map((s) => s.memberId));
      const newItems = items.filter((item) => !existingMemberIds.has(item.memberId));
      const updatedExisting = db.santri.map((s) => {
        const match = items.find((i) => i.memberId === s.memberId);
        return match ? { ...s, ...match, santriId: s.santriId } : s;
      });
      const log = createLogEntry(
        'Data Santri',
        'TAMBAH',
        'IMPORT-BATCH',
        `${db.santri.length} Santri`,
        `${updatedExisting.length + newItems.length} Santri`,
        `Import massal ${items.length} data santri (tanpa duplikasi ID Member)`
      );
      const nextState: DatabaseState = {
        ...db,
        santri: [...newItems, ...updatedExisting],
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'santri');
      if (ok) {
        showToast('success', 'Import Santri Berhasil', `${newItems.length} santri baru ditambahkan dan data disinkronkan.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // CRUD: Kelas
  const saveKelas = useCallback(
    async (kelas: Kelas, isNew: boolean): Promise<boolean> => {
      const prev = db.kelas.find((k) => k.kelasId === kelas.kelasId);
      const nextKelas = isNew
        ? [...db.kelas, kelas]
        : db.kelas.map((k) => (k.kelasId === kelas.kelasId ? kelas : k));

      // Also sync namaKelas & guru on santri assigned to this class
      const nextSantri = db.santri.map((s) =>
        s.kelasId === kelas.kelasId
          ? {
              ...s,
              namaKelas: kelas.namaKelas,
              programKhot: kelas.programKhot,
              metodePembelajaran: kelas.metodePembelajaran,
              guruId: kelas.guruId,
              namaGuru: kelas.namaGuru,
            }
          : s
      );

      const log = createLogEntry(
        'Kelas & Kelompok',
        isNew ? 'TAMBAH' : 'EDIT',
        kelas.kelasId,
        prev ? `${prev.namaKelas} (${prev.programKhot})` : '-',
        `${kelas.namaKelas} (${kelas.programKhot})`,
        isNew ? `Membuat kelas baru ${kelas.namaKelas}` : `Memperbarui kelas ${kelas.namaKelas}`
      );

      const nextState: DatabaseState = {
        ...db,
        kelas: nextKelas,
        santri: nextSantri,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'kelas');
      if (ok) {
        showToast('success', isNew ? 'Kelas Ditambahkan' : 'Kelas Diperbarui', `${kelas.namaKelas} berhasil disimpan.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  const deleteKelas = useCallback(
    async (kelasId: string): Promise<boolean> => {
      const target = db.kelas.find((k) => k.kelasId === kelasId);
      if (!target) return false;
      const log = createLogEntry(
        'Kelas & Kelompok',
        'HAPUS',
        kelasId,
        target.namaKelas,
        'Dihapus',
        `Menghapus kelas ${target.namaKelas}`
      );
      const nextState: DatabaseState = {
        ...db,
        kelas: db.kelas.filter((k) => k.kelasId !== kelasId),
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'kelas');
      if (ok) {
        showToast('success', 'Kelas Dihapus', `${target.namaKelas} telah dihapus.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // CRUD: Guru / Users
  const saveGuru = useCallback(
    async (guru: User, isNew: boolean, initialPassword?: string): Promise<boolean> => {
      const prev = db.users.find((u) => u.userId === guru.userId);
      const nextUsers = isNew
        ? [...db.users, guru]
        : db.users.map((u) => (u.userId === guru.userId ? guru : u));

      const log = createLogEntry(
        'Data Guru',
        isNew ? 'TAMBAH' : 'EDIT',
        guru.userId,
        prev ? `${prev.namaLengkap} (${prev.statusAkun})` : '-',
        `${guru.namaLengkap} (${guru.statusAkun})`,
        isNew ? `Menambahkan pengajar ${guru.namaLengkap}` : `Memperbarui data pengajar ${guru.namaLengkap}`
      );

      const nextState: DatabaseState = {
        ...db,
        users: nextUsers,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'users');
      if (ok && isNew && initialPassword) {
        await resetUserPassword(guru.userId, initialPassword);
      } else if (ok) {
        showToast('success', isNew ? 'Guru Ditambahkan' : 'Data Guru Diperbarui', `${guru.namaLengkap} berhasil disimpan.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, resetUserPassword, showToast]
  );

  const deleteGuru = useCallback(
    async (userId: string): Promise<boolean> => {
      const target = db.users.find((u) => u.userId === userId);
      if (!target) return false;
      const log = createLogEntry(
        'Data Guru',
        'HAPUS',
        userId,
        target.namaLengkap,
        'Dihapus',
        `Menghapus akun guru ${target.namaLengkap}`
      );
      const nextState: DatabaseState = {
        ...db,
        users: db.users.filter((u) => u.userId !== userId),
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'users');
      if (ok) {
        showToast('success', 'Data Guru Dihapus', `${target.namaLengkap} telah dihapus.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // CRUD: Jurnal Pembelajaran
  const saveJurnal = useCallback(
    async (jurnal: JurnalPembelajaran, isNew: boolean): Promise<boolean> => {
      const prev = db.jurnal.find((j) => j.jurnalId === jurnal.jurnalId);
      const nextJurnal = isNew
        ? [jurnal, ...db.jurnal]
        : db.jurnal.map((j) => (j.jurnalId === jurnal.jurnalId ? jurnal : j));

      const log = createLogEntry(
        'Jurnal Pembelajaran',
        isNew ? 'TAMBAH' : 'EDIT',
        jurnal.nomorJurnal,
        prev ? `${prev.materiPembelajaran} (${prev.tanggal})` : '-',
        `${jurnal.materiPembelajaran} (${jurnal.tanggal})`,
        `${isNew ? 'Membuat' : 'Memperbarui'} jurnal ${jurnal.nomorJurnal} — ${jurnal.namaKelas}`
      );

      const nextState: DatabaseState = {
        ...db,
        jurnal: nextJurnal,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'jurnal');
      if (ok) {
        showToast(
          'success',
          isNew ? 'Jurnal Pembelajaran Dibuat' : 'Jurnal Diperbarui',
          `${jurnal.nomorJurnal} (${jurnal.namaKelas}) berhasil disimpan.`
        );
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  const deleteJurnal = useCallback(
    async (jurnalId: string): Promise<boolean> => {
      const target = db.jurnal.find((j) => j.jurnalId === jurnalId);
      if (!target) return false;
      const log = createLogEntry(
        'Jurnal Pembelajaran',
        'HAPUS',
        target.nomorJurnal,
        `${target.nomorJurnal} — ${target.materiPembelajaran}`,
        'Dihapus',
        `Menghapus jurnal ${target.nomorJurnal} beserta data absensi & penilaian terkait`
      );
      const nextState: DatabaseState = {
        ...db,
        jurnal: db.jurnal.filter((j) => j.jurnalId !== jurnalId),
        absensi: db.absensi.filter((a) => a.jurnalId !== jurnalId),
        penilaian: db.penilaian.filter((p) => p.jurnalId !== jurnalId),
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'jurnal');
      if (ok) {
        showToast('success', 'Jurnal Dihapus', `${target.nomorJurnal} telah dihapus.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // Save Absensi Batch (prevent duplicates via upsertAttendanceRecord)
  const saveAbsensiBatch = useCallback(
    async (jurnalId: string, records: Absensi[]): Promise<boolean> => {
      const targetJurnal = db.jurnal.find((j) => j.jurnalId === jurnalId);
      let nextAbsensi = [...db.absensi];
      for (const rec of records) {
        nextAbsensi = upsertAttendanceRecord(nextAbsensi, rec);
      }

      const hadirCount = records.filter((r) => r.statusKehadiran === 'Hadir').length;
      const log = createLogEntry(
        'Absensi Santri',
        'EDIT',
        targetJurnal?.nomorJurnal || jurnalId,
        `${records.length} Santri`,
        `Hadir: ${hadirCount}/${records.length} Santri`,
        `Menyimpan absensi pertemuan ${targetJurnal?.nomorJurnal || jurnalId} (${targetJurnal?.namaKelas || ''})`
      );

      const nextState: DatabaseState = {
        ...db,
        absensi: nextAbsensi,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'absensi');
      if (ok) {
        showToast(
          'success',
          'Absensi Tersimpan',
          `Daftar hadir ${records.length} santri berhasil disimpan ke database.`
        );
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // Save Penilaian Batch (preserves historical edit records)
  const savePenilaianBatch = useCallback(
    async (
      jurnalId: string,
      records: Penilaian[],
      alasanKoreksi?: string
    ): Promise<boolean> => {
      const targetJurnal = db.jurnal.find((j) => j.jurnalId === jurnalId);
      const nextPenilaian = [...db.penilaian];
      let changedCount = 0;
      let oldSummary = '';
      let newSummary = '';

      for (const incoming of records) {
        const idx = nextPenilaian.findIndex(
          (p) =>
            p.jurnalId === incoming.jurnalId &&
            p.santriId === incoming.santriId &&
            p.aspekId === incoming.aspekId
        );
        if (idx >= 0) {
          const existing = nextPenilaian[idx];
          if (
            existing.nilai !== incoming.nilai ||
            existing.catatanPenilaian !== incoming.catatanPenilaian
          ) {
            changedCount++;
            if (!oldSummary) {
              oldSummary = `${existing.namaAspek}: ${existing.nilai ?? 'Belum Dinilai'}`;
              newSummary = `${incoming.namaAspek}: ${incoming.nilai ?? 'Belum Dinilai'}`;
            }
            const editHistory = [...(existing.riwayatEdit || [])];
            if (existing.nilai !== incoming.nilai) {
              editHistory.push({
                editedAt: new Date().toISOString(),
                editedBy: currentUser?.namaLengkap || 'Administrator',
                nilaiLama: existing.nilai,
                nilaiBaru: incoming.nilai,
                alasanKoreksi: alasanKoreksi || 'Pembaruan nilai akademik',
              });
            }
            nextPenilaian[idx] = {
              ...incoming,
              bobot: existing.bobot || incoming.bobot, // preserve historical weight!
              riwayatEdit: editHistory,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.namaLengkap || 'Administrator',
            };
          }
        } else {
          changedCount++;
          nextPenilaian.push({
            ...incoming,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.namaLengkap || 'Administrator',
          });
        }
      }

      const log = createLogEntry(
        'Penilaian Santri',
        'EDIT',
        targetJurnal?.nomorJurnal || jurnalId,
        oldSummary || 'Data Penilaian Sebelumnya',
        newSummary || `${changedCount} aspek penilaian diperbarui`,
        alasanKoreksi
          ? `Koreksi nilai (${alasanKoreksi}) pada ${targetJurnal?.nomorJurnal || jurnalId}`
          : `Input/pembaruan nilai pada ${targetJurnal?.nomorJurnal || jurnalId}`
      );

      const nextState: DatabaseState = {
        ...db,
        penilaian: nextPenilaian,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'penilaian');
      if (ok) {
        showToast(
          'success',
          'Penilaian Tersimpan',
          `Nilai santri pada jurnal ${targetJurnal?.nomorJurnal || ''} telah disimpan.`
        );
      }
      return ok;
    },
    [createLogEntry, currentUser?.namaLengkap, db, persistStateToServer, showToast]
  );

  // Catatan Perkembangan
  const saveCatatanPerkembangan = useCallback(
    async (catatan: CatatanPerkembangan, isNew: boolean): Promise<boolean> => {
      const nextList = isNew
        ? [catatan, ...db.catatanPerkembangan]
        : db.catatanPerkembangan.map((c) => (c.catatanId === catatan.catatanId ? catatan : c));

      const santriObj = db.santri.find((s) => s.santriId === catatan.santriId);
      const log = createLogEntry(
        'Catatan Perkembangan',
        isNew ? 'TAMBAH' : 'EDIT',
        catatan.catatanId,
        '-',
        `${santriObj?.namaLengkap || catatan.santriId}: ${catatan.isiCatatan.slice(0, 50)}`,
        `Menyimpan catatan perkembangan untuk ${santriObj?.namaLengkap || ''}`
      );

      const nextState: DatabaseState = {
        ...db,
        catatanPerkembangan: nextList,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'catatanPerkembangan');
      if (ok) {
        showToast('success', 'Catatan Guru Tersimpan', 'Catatan perkembangan santri berhasil disimpan.');
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  const deleteCatatanPerkembangan = useCallback(
    async (catatanId: string): Promise<boolean> => {
      const nextState: DatabaseState = {
        ...db,
        catatanPerkembangan: db.catatanPerkembangan.filter((c) => c.catatanId !== catatanId),
      };
      const ok = await persistStateToServer(nextState, 'catatanPerkembangan');
      if (ok) {
        showToast('success', 'Catatan Dihapus', 'Catatan perkembangan telah dihapus.');
      }
      return ok;
    },
    [db, persistStateToServer, showToast]
  );

  // Rubrik Penilaian
  const saveRubrikList = useCallback(
    async (rubriks: RubrikPenilaian[], logNote: string): Promise<boolean> => {
      const log = createLogEntry(
        'Rubrik Penilaian',
        'EDIT',
        'RUBRIK-CONFIG',
        `${db.rubrik.length} Kriteria`,
        `${rubriks.length} Kriteria`,
        logNote
      );
      const nextState: DatabaseState = {
        ...db,
        rubrik: rubriks,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'rubrik');
      if (ok) {
        showToast('success', 'Rubrik Penilaian Disimpan', logNote);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // Riwayat Rapor
  const saveRapor = useCallback(
    async (rapor: RiwayatRapor, isNew: boolean): Promise<boolean> => {
      const prev = db.riwayatRapor.find((r) => r.raporId === rapor.raporId);
      const nextRapor = isNew
        ? [rapor, ...db.riwayatRapor]
        : db.riwayatRapor.map((r) =>
            r.raporId === rapor.raporId
              ? { ...rapor, versiRapor: (prev?.versiRapor || 1) + (prev ? 1 : 0) }
              : r
          );

      const log = createLogEntry(
        rapor.jenisRapor === 'HARIAN' ? 'Rapor Harian' : 'Rapor Bulanan',
        isNew ? 'TAMBAH' : 'EDIT',
        rapor.nomorRapor,
        prev ? `Versi ${prev.versiRapor} (${prev.nilaiAkhir ?? '-'})` : 'Draft Baru',
        `Versi ${isNew ? 1 : (prev?.versiRapor || 1) + 1} — ${rapor.namaSantri} (Nilai: ${rapor.nilaiAkhir ?? '-'})`,
        `${isNew ? 'Menerbitkan' : 'Memperbarui'} rapor ${rapor.jenisRapor} untuk ${rapor.namaSantri}`
      );

      const nextState: DatabaseState = {
        ...db,
        riwayatRapor: nextRapor,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'riwayatRapor');
      if (ok) {
        showToast(
          'success',
          isNew ? 'Rapor Berhasil Disimpan' : 'Versi Rapor Diperbarui',
          `Arsip rapor ${rapor.namaSantri} (${rapor.periodeLabel}) telah disimpan.`
        );
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  const deleteRapor = useCallback(
    async (raporId: string): Promise<boolean> => {
      const target = db.riwayatRapor.find((r) => r.raporId === raporId);
      if (!target) return false;
      const log = createLogEntry(
        'Riwayat Rapor',
        'HAPUS',
        target.nomorRapor,
        `${target.namaSantri} (${target.periodeLabel})`,
        'Dihapus',
        `Menghapus arsip rapor ${target.nomorRapor}`
      );
      const nextState: DatabaseState = {
        ...db,
        riwayatRapor: db.riwayatRapor.filter((r) => r.raporId !== raporId),
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'riwayatRapor');
      if (ok) {
        showToast('success', 'Arsip Rapor Dihapus', `Rapor ${target.nomorRapor} telah dihapus.`);
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // Pengaturan Akademik
  const savePengaturan = useCallback(
    async (pengaturan: PengaturanAkademik): Promise<boolean> => {
      const log = createLogEntry(
        'Pengaturan Akademik',
        'EDIT',
        'SETTINGS',
        `Batas Predikat A:${db.pengaturan.batasPredikat.A} B:${db.pengaturan.batasPredikat.B} C:${db.pengaturan.batasPredikat.C}`,
        `Batas Predikat A:${pengaturan.batasPredikat.A} B:${pengaturan.batasPredikat.B} C:${pengaturan.batasPredikat.C}`,
        'Memperbarui pengaturan identitas lembaga & parameter akademik'
      );
      const nextState: DatabaseState = {
        ...db,
        pengaturan,
        activityLogs: [log, ...db.activityLogs],
      };
      const ok = await persistStateToServer(nextState, 'pengaturan');
      if (ok) {
        showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem akademik berhasil diperbarui.');
      }
      return ok;
    },
    [createLogEntry, db, persistStateToServer, showToast]
  );

  // Google Apps Script Web App Sync (Vercel Serverless Proxy + Direct Browser Sync Fallback)
  const syncWithGoogleSheets = useCallback(
    async (customUrl?: string): Promise<{ success: boolean; message: string }> => {
      const targetUrl = (customUrl || effectiveGasUrl || db.pengaturan.gasWebAppUrl || '').trim();
      if (!targetUrl || !targetUrl.startsWith('https://script.google.com/')) {
        showToast(
          'error',
          'URL Google Apps Script Belum Valid',
          'Masukkan URL Web App Google Apps Script (berawalan https://script.google.com/macros/s/.../exec) atau pasang pada Environment Variable Vercel.'
        );
        return { success: false, message: 'URL belum diatur' };
      }

      setDbStatus('syncing');
      try {
        const res = await fetch('/api/gas/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            gasUrl: targetUrl,
            state: db,
          }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          if (!res.ok || !json.success) {
            setDbStatus('connected');
            showToast('error', 'Sinkronisasi Google Sheets Gagal', json.error);
            return { success: false, message: json.error || 'Gagal sinkronisasi' };
          }
          const nextPengaturan = {
            ...db.pengaturan,
            gasWebAppUrl: targetUrl,
            lastSyncAt: json.lastSyncAt || new Date().toISOString(),
          };
          const nextDb = { ...db, pengaturan: nextPengaturan };
          setDb(nextDb);
          localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(nextDb));
          setDbStatus('connected');
          showToast('success', 'Sinkronisasi Berhasil', 'Data berhasil disinkronkan ke Google Sheets.');
          return { success: true, message: 'Sinkronisasi ke Google Sheets berhasil.' };
        }
      } catch {
        // Fallback direct browser sync for GitHub Pages (github.io)
      }

      // Direct browser sync fallback (CORS-safe text/plain POST to GAS)
      const ok = await directPushToGas(targetUrl, db, 'syncSnapshot');
      if (ok) {
        const nextPengaturan = {
          ...db.pengaturan,
          gasWebAppUrl: targetUrl,
          lastSyncAt: new Date().toISOString(),
        };
        const nextDb = { ...db, pengaturan: nextPengaturan };
        setDb(nextDb);
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(nextDb));
        setDbStatus('connected');
        showToast('success', 'Sinkronisasi Langsung Berhasil', 'Data berhasil dikirim langsung ke Google Apps Script.');
        return { success: true, message: 'Sinkronisasi langsung berhasil.' };
      }

      setDbStatus('error');
      showToast('error', 'Sinkronisasi Gagal', 'Tidak dapat terhubung ke endpoint Google Apps Script.');
      return { success: false, message: 'Koneksi gagal.' };
    },
    [authToken, db, effectiveGasUrl, showToast]
  );

  // Tarik Data Terbaru dari Google Sheets (2-Way Sync HP & PC)
  const pullFromGoogleSheets = useCallback(
    async (customUrl?: string, silent = false): Promise<{ success: boolean; message: string }> => {
      const targetUrl = (customUrl || effectiveGasUrl || db.pengaturan.gasWebAppUrl || '').trim();

      if (!silent) setDbStatus('syncing');

      // 1. Jika ada URL GAS, coba tarik melalui endpoint /api/gas/pull atau langsung dari browser
      if (targetUrl && targetUrl.startsWith('https://script.google.com/')) {
        try {
          const res = await fetch('/api/gas/pull', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ gasUrl: targetUrl }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            if (res.ok && json.success && json.data) {
              setDb(json.data);
              localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
              setDbStatus('connected');
              if (!silent) {
                showToast(
                  'success',
                  'Data HP & PC Tersinkron',
                  json.initializedEmptySheet
                    ? '12 Sheet Google Sheets telah dibuat & diisi otomatis.'
                    : 'Data terbaru dari Google Sheets berhasil dimuat.'
                );
              }
              return { success: true, message: 'Data berhasil ditarik dari Google Sheets.' };
            }
          }
        } catch {
          // Fallback ke directPullFromGas untuk GitHub Pages (github.io)
        }

        const remoteState = await directPullFromGas(targetUrl);
        if (remoteState && remoteState.santri) {
          remoteState.pengaturan = {
            ...db.pengaturan,
            ...(remoteState.pengaturan || {}),
            gasWebAppUrl: targetUrl,
            lastSyncAt: remoteState.pengaturan?.lastSyncAt || new Date().toISOString(),
          };
          setDb(remoteState);
          localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(remoteState));
          setDbStatus('connected');
          if (!silent) {
            showToast('success', 'Data HP & PC Tersinkron', 'Data terbaru dari Google Sheets berhasil dimuat.');
          }
          return { success: true, message: 'Data berhasil ditarik langsung dari Google Sheets.' };
        }

        // Jika sheet baru pertama kali dihubungkan di github.io, dorong snapshot awal
        const pushed = await directPushToGas(targetUrl, db, 'syncSnapshot');
        if (pushed) {
          const nextDb = {
            ...db,
            pengaturan: {
              ...db.pengaturan,
              gasWebAppUrl: targetUrl,
              lastSyncAt: new Date().toISOString(),
            },
          };
          setDb(nextDb);
          localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(nextDb));
          setDbStatus('connected');
          if (!silent) {
            showToast('success', '12 Sheet Google Sheets Diinisialisasi', 'Database awal berhasil dikirim ke Google Sheets.');
          }
          return { success: true, message: 'Database diinisialisasi ke Google Sheets.' };
        }
      }

      // 2. Jika belum mengisi URL GAS namun berjalan di server/Vercel, tarik dari /api/state
      try {
        const res = await fetch('/api/state');
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (json.success && json.data) {
            setDb(json.data);
            localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
            setDbStatus('connected');
            if (!silent) {
              showToast('success', 'Data Diperbarui', 'Data terbaru dari server berhasil disinkronkan.');
            }
            return { success: true, message: 'Data server berhasil dimuat.' };
          }
        }
      } catch {
        // ignore
      }

      setDbStatus('connected');
      if (!silent) {
        showToast(
          'warning',
          'URL Google Apps Script Belum Diisi',
          'Masukkan URL Web App Google Apps Script di menu Pengaturan agar HP dan PC tersinkron ke Google Sheets.'
        );
      }
      return { success: false, message: 'URL GAS belum diatur.' };
    },
    [authToken, db, effectiveGasUrl, showToast]
  );

  const resetDemoDatabase = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/state/reset-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        if (json.success && json.data) {
          setDb(json.data);
          localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
          showToast('success', 'Database Demo Direset', 'Seluruh data demonstrasi telah dikembalikan ke kondisi awal.');
          return true;
        }
      }
    } catch {
      // Static fallback
    }
    const clone = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE)) as DatabaseState;
    if (effectiveGasUrl) clone.pengaturan.gasWebAppUrl = effectiveGasUrl;
    setDb(clone);
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(clone));
    showToast('success', 'Database Demo Direset', 'Seluruh data demonstrasi telah dikembalikan ke kondisi awal.');
    return true;
  }, [authToken, effectiveGasUrl, showToast]);

  return (
    <AppContext.Provider
      value={{
        db,
        currentUser,
        authToken,
        isLoading,
        isTransitioning,
        transitionMessage,
        isSaving,
        dbStatus,
        isEnvGasConfigured,
        effectiveGasUrl,
        theme,
        toggleTheme,
        currentPath,
        navigate,
        toasts,
        showToast,
        dismissToast,
        confirmDialog,
        askConfirm,
        closeConfirm,
        login,
        logout,
        resetUserPassword,
        changeOwnPassword,
        visibleKelas,
        visibleSantri,
        visibleJurnal,
        saveSantri,
        deleteSantri,
        importSantriBatch,
        saveKelas,
        deleteKelas,
        saveGuru,
        deleteGuru,
        saveJurnal,
        deleteJurnal,
        saveAbsensiBatch,
        savePenilaianBatch,
        saveCatatanPerkembangan,
        deleteCatatanPerkembangan,
        saveRubrikList,
        saveRapor,
        deleteRapor,
        savePengaturan,
        syncWithGoogleSheets,
        pullFromGoogleSheets,
        resetDemoDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp harus digunakan di dalam AppProvider');
  }
  return ctx;
};
