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

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
      return;
    }

    const db = readDb();
    const creds = readCredentials();
    const normalizedUsername = String(username).trim().toLowerCase();
    const user = db.users.find(
      (u: { username: string }) => u.username.toLowerCase() === normalizedUsername
    );

    if (!user) {
      res.status(401).json({ success: false, error: 'Akun pengguna tidak ditemukan.' });
      return;
    }

    if (user.statusAkun !== 'Aktif') {
      res.status(403).json({ success: false, error: 'Akun pengguna sedang dinonaktifkan oleh Administrator.' });
      return;
    }

    let cred = creds.find((c) => c.userId === user.userId || c.username.toLowerCase() === normalizedUsername);
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

  // GET /api/state
  app.get('/api/state', (_req, res) => {
    const db = readDb();
    res.json({ success: true, data: db });
  });

  // PUT /api/state (Protected RBAC state update)
  app.put('/api/state', (req, res) => {
    const auth = getAuthUser(req);
    const { state, section } = req.body || {};
    if (!state) {
      res.status(400).json({ success: false, error: 'Data state tidak ditemukan.' });
      return;
    }

    // Backend RBAC check: Guru cannot modify system settings, users/guru accounts, or rubric criteria
    if (auth && auth.user.role === 'GURU') {
      const restrictedSections = ['pengaturan', 'users', 'rubrik'];
      if (section && restrictedSections.includes(section)) {
        res.status(403).json({
          success: false,
          error: 'Akses ditolak: Guru tidak diizinkan mengubah pengaturan sistem, rubrik, atau hak akses pengguna.',
        });
        return;
      }
    }

    writeDb(state);
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/state/reset-demo (Admin only)
  app.post('/api/state/reset-demo', (req, res) => {
    const auth = getAuthUser(req);
    if (auth && auth.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Hanya Administrator yang dapat mereset data demo.' });
      return;
    }
    writeDb(INITIAL_DATABASE_STATE);
    res.json({ success: true, data: INITIAL_DATABASE_STATE });
  });

  // POST /api/gas/sync — Server-side proxy to Google Apps Script Web App
  app.post('/api/gas/sync', async (req, res) => {
    const { gasUrl, action = 'syncSnapshot' } = req.body || {};
    const db = readDb();
    const targetUrl = gasUrl || db.pengaturan?.gasWebAppUrl;

    if (!targetUrl || !String(targetUrl).startsWith('https://script.google.com/')) {
      res.status(400).json({
        success: false,
        error: 'URL Google Apps Script Web App belum diatur atau tidak valid (harus berawalan https://script.google.com/).',
      });
      return;
    }

    try {
      const response = await fetch(String(targetUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          state: db,
        }),
      });
      const result = await response.json();
      db.pengaturan.lastSyncAt = new Date().toISOString();
      writeDb(db);
      res.json({
        success: true,
        gasResponse: result,
        lastSyncAt: db.pengaturan.lastSyncAt,
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
