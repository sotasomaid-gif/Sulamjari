import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data Directory and Persistent JSON Stores
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const SHEETS_CONFIG_FILE = path.resolve(DATA_DIR, 'sheets-config.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserAccount {
  id: string;
  nama: string;
  username: string;
  noHp: string;
  password: string;
  role: 'admin_pusat' | 'admin_pabrik' | 'kepala_pabrik';
  statusPersetujuan?: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK';
  isVerified?: boolean;
  lastOtp?: string;
  otpExpiresAt?: number;
  disetujuiOleh?: string;
  disetujuiPada?: string;
  createdAt?: string;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin-pusat-utama',
    nama: 'Admin Pusat (Owner)',
    username: '0895321898759',
    noHp: '0895321898759',
    password: '@123Juara',
    role: 'admin_pusat',
    statusPersetujuan: 'DISETUJUI',
    isVerified: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'user-admin-pabrik-1',
    nama: 'Siti Rahma (Kasir & Staf)',
    username: '081233445566',
    noHp: '081233445566',
    password: 'password123',
    role: 'admin_pabrik',
    statusPersetujuan: 'DISETUJUI',
    isVerified: true,
    createdAt: '2026-01-05',
  },
  {
    id: 'user-kepala-pabrik-1',
    nama: 'Pak Bambang (Mandor Giling)',
    username: '081344556677',
    noHp: '081344556677',
    password: 'password123',
    role: 'kepala_pabrik',
    statusPersetujuan: 'DISETUJUI',
    isVerified: true,
    createdAt: '2026-01-10',
  },
];

function normalizePhone(raw: string | undefined | null): string {
  if (!raw) return '';
  let cleaned = String(raw).trim().replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('0062')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.startsWith('8')) {
    cleaned = '0' + cleaned;
  } else if (cleaned.startsWith('008')) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

function toInternationalPhone(raw: string | undefined | null): string {
  const norm = normalizePhone(raw);
  if (!norm) return '';
  if (norm.startsWith('0')) {
    return '62' + norm.slice(1);
  }
  return norm.startsWith('62') ? norm : '62' + norm;
}

function getStoredUsers(): UserAccount[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      let parsed: UserAccount[] = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Clean out any obsolete demo / test accounts
        parsed = parsed.filter((u) => {
          if (u.id === 'user-pending-andi-1') return false;
          if (u.id.startsWith('user-demo-')) return false;
          if (u.nama && (u.nama.includes('Andi Saputra') || u.nama.includes('Test Pegawai'))) return false;
          return true;
        });

        // Guarantee Admin Pusat is always correctly set
        const adminIndex = parsed.findIndex(
          (u) => normalizePhone(u.noHp) === '0895321898759'
        );
        if (adminIndex >= 0) {
          parsed[adminIndex].username = '0895321898759';
          parsed[adminIndex].password = '@123Juara';
          parsed[adminIndex].role = 'admin_pusat';
          parsed[adminIndex].statusPersetujuan = 'DISETUJUI';
          parsed[adminIndex].isVerified = true;
        } else {
          parsed.unshift(DEFAULT_USERS[0]);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading users file:', err);
  }
  saveStoredUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

function saveStoredUsers(users: UserAccount[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users file:', err);
  }
}

const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby9URmN_QFwwhQIxKzJJxqFkj7v8paqGpVcKSTxc-XTqySFQZdG67Zc1VK3xNLat7wHmg/exec';
const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1S2zzxqRYe8Xb_jR88RfXqJwl26JBje-hEtD0Vc499pw/edit';

function getSheetsConfig() {
  try {
    if (fs.existsSync(SHEETS_CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(SHEETS_CONFIG_FILE, 'utf-8'));
      return {
        ...cfg,
        webAppUrl: cfg.webAppUrl && cfg.webAppUrl.trim().startsWith('http') ? cfg.webAppUrl : DEFAULT_WEB_APP_URL,
        spreadsheetUrl: cfg.spreadsheetUrl && cfg.spreadsheetUrl.trim().startsWith('http') ? cfg.spreadsheetUrl : DEFAULT_SPREADSHEET_URL,
        autoSyncEnabled: true,
      };
    }
  } catch (e) {
    console.error('Error reading sheets config:', e);
  }
  return {
    webAppUrl: DEFAULT_WEB_APP_URL,
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    autoSyncEnabled: true,
  };
}

function saveSheetsConfig(config: any) {
  try {
    fs.writeFileSync(SHEETS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving sheets config:', e);
  }
}

async function syncUserToGoogleSheets(user: UserAccount, actor: string = 'Server Sync') {
  const cfg = getSheetsConfig();
  if (!cfg.webAppUrl || !cfg.webAppUrl.startsWith('http')) return;

  const userPayload = {
    id: user.id,
    nama: user.nama,
    username: user.username,
    password: user.password,
    noHp: user.noHp,
    role: user.role,
    statusPersetujuan: user.statusPersetujuan || 'DISETUJUI',
    isVerified: user.isVerified ? 'TERVERIFIKASI' : 'BELUM',
    lastOtp: user.lastOtp || '',
    createdAt: user.createdAt || new Date().toISOString().split('T')[0],
    disetujuiOleh: user.disetujuiOleh || '',
  };

  try {
    // 1. Direct targeted update for user status and OTP
    await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updateUserStatus',
        actor,
        user: userPayload,
      }),
    }).catch(() => null);

    // 2. Also send insertRecord for initial insert compatibility
    await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'insertRecord',
        table: 'AkunPengguna',
        user: actor,
        record: userPayload,
      }),
    }).catch(() => null);
  } catch (err) {
    console.warn('Background sync to Google Sheets failed:', err);
  }
}

async function syncAllUsersToGoogleSheets(users: UserAccount[]) {
  const cfg = getSheetsConfig();
  if (!cfg.webAppUrl || !cfg.webAppUrl.startsWith('http')) return;

  try {
    // 1. Send syncUsers
    await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncUsers',
        users,
        user: 'Admin Pusat Server',
      }),
    }).catch(() => null);

    // 2. Send syncAll with data.users as resilient fallback
    await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncAll',
        user: 'Admin Pusat Server',
        data: { users },
      }),
    }).catch(() => null);
  } catch (err) {
    console.warn('Background sync all users to Google Sheets failed:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // =========================================================================
  // API ROUTES
  // =========================================================================

  // 1. GET /api/users - Read all registered accounts across all devices
  app.get('/api/users', (_req: Request, res: Response) => {
    const users = getStoredUsers();
    res.json({
      success: true,
      users,
      pendingCount: users.filter((u) => u.statusPersetujuan === 'MENUNGGU_PERSETUJUAN').length,
    });
  });

  // 2. POST /api/register & /api/users/register - Online registration from any device/browser
  const handleRegister = (req: Request, res: Response) => {
    const { nama, noHp, username, password, role } = req.body;

    const namaTrim = (nama || '').trim();
    if (!namaTrim) {
      return res.status(400).json({ success: false, message: 'Nama lengkap wajib diisi.' });
    }

    const cleanPhone = normalizePhone(noHp || username || '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({ success: false, message: 'Nomor WhatsApp tidak valid (minimal 8 digit).' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    const validRole = ['admin_pusat', 'admin_pabrik', 'kepala_pabrik'].includes(role)
      ? role
      : 'admin_pabrik';

    const users = getStoredUsers();
    const existing = users.find(
      (u) => normalizePhone(u.noHp) === cleanPhone || (u.username && u.username === cleanPhone)
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Nomor HP / Username ini sudah terdaftar. Silakan langsung login.',
      });
    }

    const newUser: UserAccount = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nama: namaTrim,
      username: cleanPhone,
      noHp: cleanPhone,
      password,
      role: validRole,
      statusPersetujuan: 'MENUNGGU_PERSETUJUAN',
      isVerified: false,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [...users, newUser];
    saveStoredUsers(updated);

    // Asynchronously sync to Google Spreadsheet if configured
    syncUserToGoogleSheets(newUser, 'Pendaftaran Online Pegawai');
    syncAllUsersToGoogleSheets(updated);

    return res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan dari Admin Pusat.',
      user: newUser,
    });
  };

  app.post('/api/register', handleRegister);
  app.post('/api/users/register', handleRegister);

  // 3. POST /api/users/approve - Admin Pusat approves applicant & generates OTP
  app.post('/api/users/approve', (req: Request, res: Response) => {
    const { userId, adminName } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'ID pengguna wajib disertakan.' });
    }

    const users = getStoredUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const targetUser = users[index];
    targetUser.statusPersetujuan = 'DISETUJUI';
    targetUser.disetujuiOleh = adminName || 'Admin Pusat';
    targetUser.disetujuiPada = new Date().toISOString();
    targetUser.lastOtp = otpCode;
    targetUser.otpExpiresAt = Date.now() + 15 * 60 * 1000;

    saveStoredUsers(users);

    const intPhone = toInternationalPhone(targetUser.noHp);
    const messageText = `Halo *${targetUser.nama}*! 👋\n\nPendaftaran akun Anda di *Sistem Manajemen Pabrik Mie Sulamjari* telah *DISETUJUI* oleh Admin Pusat. ✅\n\nBerikut kode OTP verifikasi akun Anda:\n\n🔐 *${otpCode}*\n\nSilakan buka aplikasi dan masukkan kode OTP ini untuk mengaktifkan akun Anda.\n\n_Catatan: Kode OTP ini berlaku selama 15 menit. Rahasiakan dari pihak lain._`;
    const waWebUrl = `https://web.whatsapp.com/send?phone=${intPhone}&text=${encodeURIComponent(messageText)}`;
    const waUniversalUrl = `https://api.whatsapp.com/send?phone=${intPhone}&text=${encodeURIComponent(messageText)}`;

    // Sync to Google Spreadsheet
    syncAllUsersToGoogleSheets(users);

    return res.json({
      success: true,
      message: `Pendaftaran ${targetUser.nama} berhasil disetujui! Kode OTP: ${otpCode}`,
      user: targetUser,
      otpCode,
      waPayload: {
        id: `wa-msg-${Date.now()}`,
        sender: 'Sulamjari Bot (Official)',
        avatarText: '🍜',
        toPhone: targetUser.noHp,
        rawPhone: intPhone,
        otpCode,
        messageText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        roleName: targetUser.role,
        waWebUrl,
        waUniversalUrl,
      },
    });
  });

  // 3b. POST /api/users/verify-otp - Verify user OTP and persist verification status
  app.post('/api/users/verify-otp', (req: Request, res: Response) => {
    const { userId, noHp, otpCode } = req.body;
    const cleanPhone = normalizePhone(noHp || '');
    const cleanCode = String(otpCode || '').trim();

    if (!cleanCode) {
      return res.status(400).json({ success: false, message: 'Kode OTP wajib diisi.' });
    }

    const users = getStoredUsers();
    const index = users.findIndex(
      (u) => (userId && u.id === userId) || (cleanPhone && normalizePhone(u.noHp) === cleanPhone)
    );

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Data akun tidak ditemukan.' });
    }

    const targetUser = users[index];

    // Check expiration if timestamp exists
    if (targetUser.otpExpiresAt && Date.now() > targetUser.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'Kode OTP telah kadaluarsa. Silakan minta kirim ulang OTP.' });
    }

    // Validate OTP code
    if (!targetUser.lastOtp || targetUser.lastOtp !== cleanCode) {
      return res.status(400).json({ success: false, message: 'Kode OTP tidak cocok. Periksa pesan WhatsApp Anda.' });
    }

    // Mark as verified, keep lastOtp recorded
    targetUser.isVerified = true;
    saveStoredUsers(users);

    // Sync to Google Spreadsheet immediately (both targeted update and full sheet)
    syncUserToGoogleSheets(targetUser, 'Verifikasi OTP Selesai');
    syncAllUsersToGoogleSheets(users);

    return res.json({
      success: true,
      message: 'Verifikasi akun berhasil! Status akun Anda sekarang aktif dan terverifikasi.',
      user: targetUser,
    });
  });

  // 4. POST /api/users/reject - Admin Pusat rejects applicant
  app.post('/api/users/reject', (req: Request, res: Response) => {
    const { userId, adminName } = req.body;
    const users = getStoredUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    users[index].statusPersetujuan = 'DITOLAK';
    users[index].disetujuiOleh = adminName || 'Admin Pusat';
    users[index].disetujuiPada = new Date().toISOString();

    saveStoredUsers(users);
    syncAllUsersToGoogleSheets(users);

    return res.json({
      success: true,
      message: `Pendaftaran ${users[index].nama} telah ditolak.`,
      user: users[index],
    });
  });

  // 5. POST /api/users/delete - Delete user
  app.post('/api/users/delete', (req: Request, res: Response) => {
    const { userId } = req.body;
    const users = getStoredUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
    }
    if (normalizePhone(target.noHp) === '0895321898759') {
      return res.status(403).json({ success: false, message: 'Akun resmi Admin Pusat tidak boleh dihapus.' });
    }

    const filtered = users.filter((u) => u.id !== userId);
    saveStoredUsers(filtered);
    syncAllUsersToGoogleSheets(filtered);

    return res.json({ success: true, message: `Akun ${target.nama} berhasil dihapus.` });
  });

  // 6. GET & POST /api/sheets-config - Shared Google Sheets configuration
  app.get('/api/sheets-config', (_req: Request, res: Response) => {
    res.json({ success: true, config: getSheetsConfig() });
  });

  app.post('/api/sheets-config', (req: Request, res: Response) => {
    const current = getSheetsConfig();
    const updated = { ...current, ...req.body };
    saveSheetsConfig(updated);
    res.json({ success: true, message: 'Konfigurasi Google Spreadsheet berhasil disimpan di server.', config: updated });
  });

  // 8. GET /api/health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Pabrik Mie Sulamjari running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
