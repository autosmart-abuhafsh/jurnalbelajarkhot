import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { INITIAL_DATABASE_STATE } from '../src/data/seedData';

// Pada Vercel Serverless Function, gunakan direktori /tmp yang writable
const DATA_DIR = path.join(os.tmpdir(), 'jurnal-belajar-khot-data');
const DB_FILE = path.join(DATA_DIR, 'academic_db.json');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'auth_credentials.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function getEnvGasUrl(): string {
  return (
    process.env.GAS_WEB_APP_URL ||
    process.env.VITE_GAS_WEB_APP_URL ||
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_GAS_WEB_APP_URL ||
    process.env.NEXT_PUBLIC_GAS_URL ||
    ''
  ).trim();
}

function getEnvSpreadsheetId(): string {
  return (
    process.env.GAS_SPREADSHEET_ID ||
    process.env.VITE_GAS_SPREADSHEET_ID ||
    process.env.SPREADSHEET_ID ||
    process.env.VITE_SPREADSHEET_ID ||
    ''
  ).trim();
}

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
    const initialClone = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
    const envGasUrl = getEnvGasUrl();
    const envSheetId = getEnvSpreadsheetId();
    if (envGasUrl) initialClone.pengaturan.gasWebAppUrl = envGasUrl;
    if (envSheetId) initialClone.pengaturan.spreadsheetId = envSheetId;
    fs.writeFileSync(DB_FILE, JSON.stringify(initialClone, null, 2), 'utf-8');
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
    const parsed = JSON.parse(raw);
    const envGasUrl = getEnvGasUrl();
    const envSheetId = getEnvSpreadsheetId();
    if (envGasUrl && parsed.pengaturan) {
      parsed.pengaturan.gasWebAppUrl = envGasUrl;
    }
    if (envSheetId && parsed.pengaturan) {
      parsed.pengaturan.spreadsheetId = envSheetId;
    }
    return parsed;
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

async function pushToGasWebApp(targetUrl: string, state: unknown, action = 'syncSnapshot') {
  const response = await fetch(String(targetUrl), {
    method: 'POST',
    redirect: 'follow',
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
}

async function pullFromGasWebApp(targetUrl: string) {
  const sep = targetUrl.includes('?') ? '&' : '?';
  const response = await fetch(`${targetUrl}${sep}action=getState`, {
    method: 'GET',
    redirect: 'follow',
  });
  if (!response.ok) return null;
  const json = await response.json();
  if (json && json.success && json.state && json.state.santri) {
    return json.state;
  }
  return null;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

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

app.post('/api/auth/logout', (req, res) => {
  const auth = getAuthUser(req);
  if (auth) {
    const sessions = readSessions();
    delete sessions[auth.token];
    writeSessions(sessions);
  }
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    res.status(401).json({ success: false, error: 'Sesi tidak valid atau telah berakhir.' });
    return;
  }
  res.json({ success: true, user: auth.user });
});

app.post('/api/auth/reset-password', (req, res) => {
  const auth = getAuthUser(req);
  if (auth && auth.user.role !== 'ADMIN') {
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

app.get('/api/state', async (_req, res) => {
  let db = readDb();
  const targetGasUrl = getEnvGasUrl() || db.pengaturan?.gasWebAppUrl;

  if (targetGasUrl && String(targetGasUrl).startsWith('https://script.google.com/')) {
    try {
      const remoteState = await pullFromGasWebApp(String(targetGasUrl));
      if (remoteState) {
        if (getEnvGasUrl()) remoteState.pengaturan.gasWebAppUrl = getEnvGasUrl();
        if (getEnvSpreadsheetId()) remoteState.pengaturan.spreadsheetId = getEnvSpreadsheetId();
        writeDb(remoteState);
        db = remoteState;
      }
    } catch {
      // Gunakan cache lokal jika GAS sedang tidak merespons
    }
  }

  res.json({
    success: true,
    data: db,
    envGasConfigured: Boolean(getEnvGasUrl()),
  });
});

app.put('/api/state', async (req, res) => {
  const auth = getAuthUser(req);
  const { state, section } = req.body || {};
  if (!state) {
    res.status(400).json({ success: false, error: 'Data state tidak ditemukan.' });
    return;
  }

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

  const envGasUrl = getEnvGasUrl();
  const envSheetId = getEnvSpreadsheetId();
  if (envGasUrl && state.pengaturan) {
    state.pengaturan.gasWebAppUrl = envGasUrl;
  }
  if (envSheetId && state.pengaturan) {
    state.pengaturan.spreadsheetId = envSheetId;
  }

  const targetGasUrl = envGasUrl || state.pengaturan?.gasWebAppUrl;
  let gasSynced = false;

  if (targetGasUrl && String(targetGasUrl).startsWith('https://script.google.com/')) {
    try {
      await pushToGasWebApp(String(targetGasUrl), state, 'syncSnapshot');
      if (state.pengaturan) {
        state.pengaturan.lastSyncAt = new Date().toISOString();
      }
      gasSynced = true;
    } catch {
      // Tetap simpan lokal meskipun koneksi ke GAS lambat
    }
  }

  writeDb(state);
  res.json({
    success: true,
    gasSynced,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/state/reset-demo', (req, res) => {
  const auth = getAuthUser(req);
  if (auth && auth.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Hanya Administrator yang dapat mereset data demo.' });
    return;
  }
  const initialClone = JSON.parse(JSON.stringify(INITIAL_DATABASE_STATE));
  if (getEnvGasUrl()) initialClone.pengaturan.gasWebAppUrl = getEnvGasUrl();
  if (getEnvSpreadsheetId()) initialClone.pengaturan.spreadsheetId = getEnvSpreadsheetId();
  writeDb(initialClone);
  res.json({ success: true, data: initialClone });
});

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
    const result = await pushToGasWebApp(String(targetUrl), db, action);
    if (db.pengaturan) {
      db.pengaturan.gasWebAppUrl = String(targetUrl);
      db.pengaturan.lastSyncAt = new Date().toISOString();
    }
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

export default app;
