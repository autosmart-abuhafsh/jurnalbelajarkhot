import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { INITIAL_DATABASE_STATE } from './src/data/seedData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'academic_db.json');
const CREDENTIALS_FILE = path.resolve(DATA_DIR, 'auth_credentials.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

interface StoredCredential {
  userId: string;
  username: string;
  salt: string;
  passwordHash: string;
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATABASE_STATE, null, 2), 'utf-8');
  }
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    const defaultCreds: StoredCredential[] = [
      {
        userId: 'USR-ADMIN-01',
        username: 'admin',
        salt: 'bk_salt_admin_2026',
        passwordHash: hashPassword('admin123', 'bk_salt_admin_2026'),
      },
      {
        userId: 'USR-GURU-01',
        username: 'syamsu',
        salt: 'bk_salt_syamsu_2026',
        passwordHash: hashPassword('guru123', 'bk_salt_syamsu_2026'),
      },
      {
        userId: 'USR-GURU-02',
        username: 'hasan',
        salt: 'bk_salt_hasan_2026',
        passwordHash: hashPassword('guru123', 'bk_salt_hasan_2026'),
      },
    ];
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(defaultCreds, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_DATABASE_STATE;
  }
}

function writeDb(state: unknown) {
  ensureDataFiles();
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function readCredentials(): StoredCredential[] {
  ensureDataFiles();
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCredentials(creds: StoredCredential[]) {
  ensureDataFiles();
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
}

// Active session store in memory + persisted file so restarts don't log out users
const SESSIONS_FILE = path.resolve(DATA_DIR, 'sessions.json');
function readSessions(): Record<string, { userId: string; role: string; createdAt: string }> {
  ensureDataFiles();
  if (!fs.existsSync(SESSIONS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, { userId: string; role: string; createdAt: string }>) {
  ensureDataFiles();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

async function startServer() {
  ensureDataFiles();
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Auth helper middleware
  const getAuthUser = (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    const sessions = readSessions();
    const session = sessions[token];
    if (!session) return null;
    const db = readDb();
    const user = db.users.find((u: { userId: string }) => u.userId === session.userId);
    if (!user || user.statusAkun !== 'Aktif') return null;
    return { user, token };
  };

  // POST /api/auth/login (supports username or ID Guru)
  app.post('/api/auth/login', (req, res) => {
    const { username, password, portalMode } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'ID Login / Username dan password wajib diisi.' });
      return;
    }

    const db = readDb();
    const creds = readCredentials();
    const normalizedIdentifier = String(username).trim().toLowerCase();
    const user = db.users.find(
      (u: { username: string; guruId?: string }) =>
        u.username.toLowerCase() === normalizedIdentifier ||
        (Boolean(u.guruId) && u.guruId!.trim().toLowerCase() === normalizedIdentifier)
    );

    if (!user) {
      res.status(401).json({ success: false, error: 'ID Login atau Username tidak ditemukan.' });
      return;
    }

    if (user.statusAkun !== 'Aktif') {
      res.status(403).json({ success: false, error: 'Akun pengguna sedang dinonaktifkan oleh Administrator.' });
      return;
    }

    if (portalMode === 'GURU' && user.role !== 'GURU') {
      res.status(403).json({
        success: false,
        error: 'Akun Administrator harus masuk melalui tab Administrator.',
      });
      return;
    }
    if (portalMode === 'ADMIN' && user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Akun Guru silakan masuk melalui tab Portal Guru menggunakan ID Guru atau Username.',
      });
      return;
    }

    let cred = creds.find((c) => c.userId === user.userId || c.username.toLowerCase() === user.username.toLowerCase());
    if (!cred) {
      // Create default credential for newly added teacher
      const salt = 'bk_salt_' + user.userId;
      cred = {
        userId: user.userId,
        username: user.username,
        salt,
        passwordHash: hashPassword('guru123', salt),
      };
      creds.push(cred);
      writeCredentials(creds);
    }

    const computedHash = hashPassword(String(password), cred.salt);
    if (computedHash !== cred.passwordHash) {
      res.status(401).json({ success: false, error: 'Password yang Anda masukkan tidak sesuai.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const sessions = readSessions();
    sessions[token] = {
      userId: user.userId,
      role: user.role,
      createdAt: new Date().toISOString(),
    };
    writeSessions(sessions);

    res.json({
      success: true,
      token,
      user,
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const auth = getAuthUser(req);
    if (auth) {
      const sessions = readSessions();
      delete sessions[auth.token];
      writeSessions(sessions);
    }
    res.json({ success: true });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', (req, res) => {
    const auth = getAuthUser(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Sesi tidak valid atau telah berakhir.' });
      return;
    }
    res.json({ success: true, user: auth.user });
  });

  // POST /api/auth/reset-password (Admin only)
  app.post('/api/auth/reset-password', (req, res) => {
    const auth = getAuthUser(req);
    if (!auth || auth.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Hanya Administrator yang berhak mereset password.' });
      return;
    }
    const { targetUserId, newPassword } = req.body || {};
    if (!targetUserId || !newPassword || String(newPassword).length < 5) {
      res.status(400).json({ success: false, error: 'Password baru minimal 5 karakter.' });
      return;
    }
    const db = readDb();
    const targetUser = db.users.find((u: { userId: string }) => u.userId === targetUserId);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
      return;
    }
    const creds = readCredentials();
    const salt = 'bk_salt_' + crypto.randomBytes(8).toString('hex');
    const passwordHash = hashPassword(String(newPassword), salt);
    const idx = creds.findIndex((c) => c.userId === targetUserId);
    if (idx >= 0) {
      creds[idx] = { userId: targetUserId, username: targetUser.username, salt, passwordHash };
    } else {
      creds.push({ userId: targetUserId, username: targetUser.username, salt, passwordHash });
    }
    writeCredentials(creds);
    res.json({ success: true, message: `Password untuk ${targetUser.namaLengkap} berhasil diperbarui.` });
  });

  // POST /api/auth/change-password (Authenticated self-service)
  app.post('/api/auth/change-password', (req, res) => {
    const auth = getAuthUser(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Sesi login tidak valid.' });
      return;
    }
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 5) {
      res.status(400).json({ success: false, error: 'Password baru minimal 5 karakter.' });
      return;
    }
    const creds = readCredentials();
    const credIdx = creds.findIndex((c) => c.userId === auth.user.userId);
    const existingCred = credIdx >= 0 ? creds[credIdx] : null;
    if (existingCred) {
      const currentHash = hashPassword(String(currentPassword), existingCred.salt);
      if (currentHash !== existingCred.passwordHash) {
        res.status(401).json({ success: false, error: 'Password saat ini tidak sesuai.' });
        return;
      }
    }
    const salt = 'bk_salt_' + crypto.randomBytes(8).toString('hex');
    const passwordHash = hashPassword(String(newPassword), salt);
    const nextCred = { userId: auth.user.userId, username: auth.user.username, salt, passwordHash };
    if (credIdx >= 0) {
      creds[credIdx] = nextCred;
    } else {
      creds.push(nextCred);
    }
    writeCredentials(creds);
    res.json({ success: true, message: 'Password akun Anda berhasil diperbarui.' });
  });

  const getEnvGasUrl = () =>
    (
      process.env.GAS_WEB_APP_URL ||
      process.env.VITE_GAS_WEB_APP_URL ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
      process.env.NEXT_PUBLIC_GAS_WEB_APP_URL ||
      process.env.NEXT_PUBLIC_GAS_URL ||
      ''
    ).trim();

  const getEnvSpreadsheetId = () =>
    (
      process.env.GAS_SPREADSHEET_ID ||
      process.env.VITE_GAS_SPREADSHEET_ID ||
      process.env.SPREADSHEET_ID ||
      process.env.VITE_SPREADSHEET_ID ||
      ''
    ).trim();

  const pushToGasWebApp = async (targetUrl: string, state: unknown, action = 'syncSnapshot') => {
    const response = await fetch(String(targetUrl), {
      method: 'POST',
      redirect: 'follow',
      signal: AbortSignal.timeout(2500),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        state,
      }),
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: response.ok, raw: text };
    }
  };

  const pullFromGasWebApp = async (targetUrl: string) => {
    const sep = targetUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${targetUrl}${sep}action=getState`, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (json && json.success && json.state && json.state.santri) {
      return json.state;
    }
    return null;
  };

  // GET /api/config — Informasi Environment Variable Vercel & GAS
  app.get('/api/config', (_req, res) => {
    const envGasUrl = getEnvGasUrl();
    const envSpreadsheetId = getEnvSpreadsheetId();
    res.json({
      success: true,
      gasWebAppUrl: envGasUrl,
      spreadsheetId: envSpreadsheetId,
      isEnvConfigured: Boolean(envGasUrl),
      platform: process.env.VERCEL ? 'vercel' : 'server',
    });
  });

  // GET /api/state
  app.get('/api/state', async (req, res) => {
    let db = readDb();
    const envGasUrl = getEnvGasUrl();
    const envSheetId = getEnvSpreadsheetId();
    const queryGasUrl = typeof req.query.gasUrl === 'string' ? req.query.gasUrl.trim() : '';

    if (envGasUrl && db.pengaturan) db.pengaturan.gasWebAppUrl = envGasUrl;
    if (envSheetId && db.pengaturan) db.pengaturan.spreadsheetId = envSheetId;
    if (!db.pengaturan?.gasWebAppUrl && queryGasUrl && queryGasUrl.startsWith('https://script.google.com/')) {
      db.pengaturan.gasWebAppUrl = queryGasUrl;
    }

    const targetGasUrl = envGasUrl || queryGasUrl || db.pengaturan?.gasWebAppUrl;
    if (targetGasUrl && String(targetGasUrl).startsWith('https://script.google.com/')) {
      try {
        const remoteState = await pullFromGasWebApp(String(targetGasUrl));
        if (remoteState && remoteState.santri) {
          remoteState.pengaturan = {
            ...db.pengaturan,
            ...(remoteState.pengaturan || {}),
            gasWebAppUrl: envGasUrl || String(targetGasUrl),
            ...(envSheetId ? { spreadsheetId: envSheetId } : {}),
          };
          writeDb(remoteState);
          db = remoteState;
        }
      } catch {
        // Fallback ke database lokal jika GAS belum siap
      }
    }

    res.json({
      success: true,
      data: db,
      envGasConfigured: Boolean(envGasUrl),
      timestamp: new Date().toISOString(),
    });
  });

  // PUT /api/state (Protected RBAC state update + Auto-Sync GAS)
  app.put('/api/state', async (req, res) => {
    const auth = getAuthUser(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Sesi login diperlukan untuk menyimpan perubahan data.' });
      return;
    }
    const { state, section } = req.body || {};
    if (!state) {
      res.status(400).json({ success: false, error: 'Data state tidak ditemukan.' });
      return;
    }

    // Backend RBAC check: Guru cannot modify system settings, users/guru accounts, or rubric criteria
    if (auth.user.role === 'GURU') {
      const restrictedSections = ['pengaturan', 'users', 'rubrik'];
      if (section && restrictedSections.includes(section)) {
        res.status(403).json({
          success: false,
          error: 'Akses ditolak: Guru tidak diizinkan mengubah pengaturan sistem, rubrik, atau hak akses pengguna.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    const envGasUrl = getEnvGasUrl();
    const envSheetId = getEnvSpreadsheetId();
    if (state.pengaturan) {
      state.pengaturan.lastSyncAt = now;
      if (envGasUrl) state.pengaturan.gasWebAppUrl = envGasUrl;
      if (envSheetId) state.pengaturan.spreadsheetId = envSheetId;
    }

    writeDb(state);

    const targetGasUrl = envGasUrl || state.pengaturan?.gasWebAppUrl;
    let gasSynced = false;

    if (targetGasUrl && String(targetGasUrl).startsWith('https://script.google.com/')) {
      try {
        await pushToGasWebApp(String(targetGasUrl), state, 'syncSnapshot');
        gasSynced = true;
      } catch {
        // Tetap simpan lokal meskipun koneksi GAS tertunda atau timeout
      }
    }

    res.json({
      success: true,
      gasSynced,
      lastSyncAt: now,
      timestamp: now,
    });
  });

  // POST /api/state/reset-demo (Admin only)
  app.post('/api/state/reset-demo', (req, res) => {
    const auth = getAuthUser(req);
    if (!auth || auth.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Hanya Administrator yang dapat mereset data demo.' });
      return;
    }
    const initialClone = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
    if (getEnvGasUrl()) initialClone.pengaturan.gasWebAppUrl = getEnvGasUrl();
    if (getEnvSpreadsheetId()) initialClone.pengaturan.spreadsheetId = getEnvSpreadsheetId();
    writeDb(initialClone);
    res.json({ success: true, data: initialClone });
  });

  // POST /api/gas/pull — Tarik data terbaru dari Google Sheets untuk sinkronisasi HP & PC
  app.post('/api/gas/pull', async (req, res) => {
    const { gasUrl } = req.body || {};
    const db = readDb();
    const targetUrl = getEnvGasUrl() || gasUrl || db.pengaturan?.gasWebAppUrl;

    if (!targetUrl || !String(targetUrl).startsWith('https://script.google.com/')) {
      res.status(400).json({
        success: false,
        error: 'URL Google Apps Script Web App belum diatur.',
      });
      return;
    }

    try {
      const remoteState = await pullFromGasWebApp(String(targetUrl));
      if (remoteState && remoteState.santri) {
        remoteState.pengaturan = {
          ...db.pengaturan,
          ...(remoteState.pengaturan || {}),
          gasWebAppUrl: String(targetUrl),
          lastSyncAt: remoteState.pengaturan?.lastSyncAt || new Date().toISOString(),
        };
        writeDb(remoteState);
        res.json({
          success: true,
          data: remoteState,
          lastSyncAt: remoteState.pengaturan.lastSyncAt,
        });
        return;
      }
      // Jika sheet di Google Sheets masih baru/kosong, dorong state saat ini untuk menginisialisasi 12 sheet
      const initRes = await pushToGasWebApp(String(targetUrl), db, 'syncSnapshot');
      if (db.pengaturan) {
        db.pengaturan.gasWebAppUrl = String(targetUrl);
        db.pengaturan.lastSyncAt = new Date().toISOString();
      }
      writeDb(db);
      res.json({
        success: true,
        data: db,
        initializedEmptySheet: true,
        gasResponse: initRes,
        lastSyncAt: db.pengaturan?.lastSyncAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({
        success: false,
        error: `Gagal menarik data dari Google Sheets: ${msg}`,
      });
    }
  });

  // POST /api/gas/sync — Server-side proxy to Google Apps Script Web App
  app.post('/api/gas/sync', async (req, res) => {
    const { gasUrl, action = 'syncSnapshot', state: clientState } = req.body || {};
    const db = clientState || readDb();
    const targetUrl = getEnvGasUrl() || gasUrl || db.pengaturan?.gasWebAppUrl;

    if (!targetUrl || !String(targetUrl).startsWith('https://script.google.com/')) {
      res.status(400).json({
        success: false,
        error: 'URL Google Apps Script Web App belum diatur di Environment Variable Vercel maupun Pengaturan (harus berawalan https://script.google.com/).',
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      if (db.pengaturan) {
        db.pengaturan.gasWebAppUrl = String(targetUrl);
        db.pengaturan.lastSyncAt = now;
      }
      const result = await pushToGasWebApp(String(targetUrl), db, action);
      writeDb(db);
      res.json({
        success: true,
        gasResponse: result,
        lastSyncAt: db.pengaturan?.lastSyncAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({
        success: false,
        error: `Gagal menghubungi Google Apps Script Web App: ${msg}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jurnal Akademik Belajar Khot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
