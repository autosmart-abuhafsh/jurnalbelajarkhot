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
import { upsertAttendanceRecord } from '../utils/academicRules';

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
  isSaving: boolean;
  dbStatus: 'connected' | 'syncing' | 'error';
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
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetUserPassword: (targetUserId: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;

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
  resetDemoDatabase: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_DB = 'bk_academic_db_v1';
const STORAGE_KEY_TOKEN = 'bk_academic_token_v1';
const STORAGE_KEY_USER = 'bk_academic_user_v1';
const STORAGE_KEY_THEME = 'bk_academic_theme_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseState>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_DB);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return INITIAL_DATABASE_STATE;
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return INITIAL_DATABASE_STATE.users[0];
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('connected');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') {
      return '/admin/dashboard';
    }
    return path;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
    setCurrentPath(path);
    try {
      window.history.pushState({}, '', path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore in sandboxed frames
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/admin/dashboard');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load initial state from backend API
  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.success && json.data) {
            setDb(json.data);
            localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
            setDbStatus('connected');
          }
        }
      } catch {
        if (mounted) setDbStatus('error');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchInitial();
    return () => {
      mounted = false;
    };
  }, []);

  const persistStateToServer = useCallback(
    async (nextState: DatabaseState, section?: string): Promise<boolean> => {
      setIsSaving(true);
      setDbStatus('syncing');
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
        const json = await res.json();
        if (!res.ok || !json.success) {
          setDbStatus('error');
          showToast('error', 'Gagal Menyimpan Data', json.error || 'Terjadi gangguan pada server.');
          return false;
        }
        setDb(nextState);
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(nextState));
        setDbStatus('connected');
        return true;
      } catch {
        // Fallback local save if network interrupted, while notifying user
        setDb(nextState);
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(nextState));
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
    async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { success: false, error: json.error || 'Login gagal.' };
        }
        const user: User = json.user;
        const token: string = json.token;
        setCurrentUser(user);
        setAuthToken(token);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_TOKEN, token);

        const targetRoute = user.role === 'ADMIN' ? '/admin/dashboard' : '/guru/dashboard';
        navigate(targetRoute);
        showToast('success', `Assalamu'alaikum, ${user.namaLengkap}`, 'Selamat datang di Jurnal Akademik Belajar Khot.');
        return { success: true };
      } catch {
        return { success: false, error: 'Gagal menghubungi server autentikasi.' };
      }
    },
    [navigate, showToast]
  );

  const logout = useCallback(async () => {
    try {
      if (authToken) {
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
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ targetUserId, newPassword }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          showToast('error', 'Gagal Reset Password', json.error);
          return { success: false, message: json.error };
        }
        showToast('success', 'Password Diperbarui', json.message);
        return { success: true, message: json.message };
      } catch {
        showToast('error', 'Gagal Reset Password', 'Koneksi ke server terputus.');
        return { success: false };
      }
    },
    [authToken, showToast]
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

  // Google Apps Script Web App Sync
  const syncWithGoogleSheets = useCallback(
    async (customUrl?: string): Promise<{ success: boolean; message: string }> => {
      setDbStatus('syncing');
      try {
        const res = await fetch('/api/gas/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ gasUrl: customUrl || db.pengaturan.gasWebAppUrl }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setDbStatus('connected');
          showToast('error', 'Sinkronisasi Google Sheets Gagal', json.error);
          return { success: false, message: json.error || 'Gagal sinkronisasi' };
        }
        const nextPengaturan = {
          ...db.pengaturan,
          lastSyncAt: json.lastSyncAt || new Date().toISOString(),
        };
        setDb((prev) => ({ ...prev, pengaturan: nextPengaturan }));
        setDbStatus('connected');
        showToast('success', 'Sinkronisasi Berhasil', 'Data berhasil disinkronkan ke Google Sheets.');
        return { success: true, message: 'Sinkronisasi ke Google Sheets berhasil.' };
      } catch {
        setDbStatus('error');
        showToast('error', 'Sinkronisasi Gagal', 'Tidak dapat terhubung ke endpoint Google Apps Script.');
        return { success: false, message: 'Koneksi gagal.' };
      }
    },
    [authToken, db.pengaturan, showToast]
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
      const json = await res.json();
      if (res.ok && json.success) {
        setDb(json.data);
        localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(json.data));
        showToast('success', 'Database Demo Direset', 'Seluruh data demonstrasi telah dikembalikan ke kondisi awal.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [authToken, showToast]);

  return (
    <AppContext.Provider
      value={{
        db,
        currentUser,
        authToken,
        isLoading,
        isSaving,
        dbStatus,
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
