import { UserAccount, UserRole } from '../types';

const STORAGE_USERS_KEY = 'sulamjari_users_v2';
const STORAGE_CURRENT_USER_KEY = 'sulamjari_current_session_user_v2';

export const DEFAULT_USERS: UserAccount[] = [
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
    id: 'user-pending-andi-1',
    nama: 'Andi Saputra (Mandor Produksi)',
    username: '081298765432',
    noHp: '081298765432',
    password: 'password123',
    role: 'kepala_pabrik',
    statusPersetujuan: 'MENUNGGU_PERSETUJUAN',
    isVerified: false,
    createdAt: '2026-03-01',
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

export const normalizePhoneNumber = (raw: string | undefined | null): string => {
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
};

export const formatDisplayPhone = (raw: string): string => {
  const norm = normalizePhoneNumber(raw);
  if (norm.length >= 10) {
    return `${norm.slice(0, 4)}-${norm.slice(4, 8)}-${norm.slice(8)}`;
  }
  return norm;
};

export const getStoredUsers = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    let users: UserAccount[] = raw ? JSON.parse(raw) : [];

    // Ensure all existing user records have username and statusPersetujuan
    users = users.map((u) => ({
      ...u,
      username: u.username || u.noHp,
      statusPersetujuan:
        u.statusPersetujuan || (u.isVerified ? 'DISETUJUI' : 'MENUNGGU_PERSETUJUAN'),
    }));

    // Ensure the official Admin Pusat account with username: 0895321898759 and password: @123Juara is always synced
    const adminIndex = users.findIndex(
      (u) => normalizePhoneNumber(u.noHp) === '0895321898759'
    );

    if (adminIndex >= 0) {
      users[adminIndex].username = '0895321898759';
      users[adminIndex].password = '@123Juara';
      users[adminIndex].role = 'admin_pusat';
      users[adminIndex].statusPersetujuan = 'DISETUJUI';
      users[adminIndex].isVerified = true;
    } else {
      users = [DEFAULT_USERS[0], ...users.filter(u => u.id !== 'user-admin-pusat-utama')];
    }

    // Ensure default demo users for other roles also exist if list is small
    DEFAULT_USERS.slice(1).forEach((demoUser) => {
      if (!users.some((u) => normalizePhoneNumber(u.noHp) === normalizePhoneNumber(demoUser.noHp))) {
        users.push(demoUser);
      }
    });

    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return users;
  } catch (err) {
    console.error('Error reading users from storage:', err);
    return DEFAULT_USERS;
  }
};

export const saveStoredUsers = (users: UserAccount[]) => {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving users to storage:', err);
  }
};

export const getCurrentUser = (): UserAccount | null => {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (!raw) {
      // WAJIB LOGIN DULU: Tidak ada bypass otomatis, user wajib login atau daftar
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: UserAccount | null) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Error updating current session user:', err);
  }
};

export const generateOtpCode = (): string => {
  // Generate random 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const toInternationalPhone = (rawPhone: string | undefined | null): string => {
  const norm = normalizePhoneNumber(rawPhone);
  if (!norm) return '';
  if (norm.startsWith('0')) {
    return '62' + norm.slice(1);
  }
  return norm.startsWith('62') ? norm : '62' + norm;
};

export const getWhatsAppWebUrl = (phone: string, text: string): string => {
  const intPhone = toInternationalPhone(phone);
  return `https://web.whatsapp.com/send?phone=${intPhone}&text=${encodeURIComponent(text)}`;
};

export const getWhatsAppUniversalUrl = (phone: string, text: string): string => {
  const intPhone = toInternationalPhone(phone);
  return `https://api.whatsapp.com/send?phone=${intPhone}&text=${encodeURIComponent(text)}`;
};

export interface OtpSimulationMessage {
  id: string;
  sender: string;
  avatarText: string;
  toPhone: string;
  rawPhone: string;
  otpCode: string;
  messageText: string;
  timestamp: string;
  roleName: string;
  waWebUrl: string;
  waUniversalUrl: string;
}

export const createOtpWhatsAppPayload = (
  userName: string,
  noHp: string,
  role: UserRole,
  otpCode: string
): OtpSimulationMessage => {
  const roleLabels: Record<UserRole, string> = {
    admin_pusat: 'Admin Pusat (Pemilik/Pusat)',
    admin_pabrik: 'Admin Pabrik (Kasir/Administrasi)',
    kepala_pabrik: 'Kepala Pabrik (Mandor Produksi)',
  };

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const messageText = `Halo *${userName}*! 👋\n\nPendaftaran akun Anda di *Sistem Manajemen Pabrik Mie Sulamjari* sebagai *${roleLabels[role]}* telah *DISETUJUI* oleh Admin Pusat. ✅\n\nBerikut kode OTP verifikasi akun Anda:\n\n🔐 *${otpCode}*\n\nSilakan buka aplikasi dan masukkan kode OTP ini untuk mengaktifkan akun Anda.\n\n_Catatan: Kode OTP ini berlaku selama 15 menit. Rahasiakan dari pihak yang tidak berkepentingan._`;

  const intPhone = toInternationalPhone(noHp);
  const waWebUrl = getWhatsAppWebUrl(noHp, messageText);
  const waUniversalUrl = getWhatsAppUniversalUrl(noHp, messageText);

  return {
    id: `wa-msg-${Date.now()}`,
    sender: 'Sulamjari Bot (Official)',
    avatarText: '🍜',
    toPhone: formatDisplayPhone(noHp),
    rawPhone: intPhone,
    otpCode,
    messageText,
    timestamp: timeStr,
    roleName: roleLabels[role],
    waWebUrl,
    waUniversalUrl,
  };
};

export const approveUserAndGenerateOtp = (
  userId: string,
  adminName: string = 'Admin Pusat'
): {
  success: boolean;
  user?: UserAccount;
  otpCode?: string;
  message: string;
  waPayload?: OtpSimulationMessage;
} => {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  const otpCode = generateOtpCode();
  const targetUser = users[index];
  targetUser.statusPersetujuan = 'DISETUJUI';
  targetUser.disetujuiOleh = adminName;
  targetUser.disetujuiPada = new Date().toISOString();
  targetUser.lastOtp = otpCode;
  targetUser.otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 menit

  saveStoredUsers(users);

  const waPayload = createOtpWhatsAppPayload(
    targetUser.nama,
    targetUser.noHp,
    targetUser.role,
    otpCode
  );

  return {
    success: true,
    user: targetUser,
    otpCode,
    waPayload,
    message: `Pendaftaran ${targetUser.nama} disetujui! Kode OTP (${otpCode}) telah dibuat & siap dikirim via WhatsApp.`,
  };
};

export const rejectUserRegistration = (
  userId: string,
  adminName: string = 'Admin Pusat'
): { success: boolean; message: string } => {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  users[index].statusPersetujuan = 'DITOLAK';
  users[index].disetujuiOleh = adminName;
  users[index].disetujuiPada = new Date().toISOString();
  saveStoredUsers(users);

  return {
    success: true,
    message: `Pendaftaran ${users[index].nama} telah ditolak oleh Admin Pusat.`,
  };
};

export const deleteUserAccount = (userId: string): boolean => {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;
  // Protect official Admin Pusat account from deletion
  if (normalizePhoneNumber(target.noHp) === '0895321898759') {
    return false;
  }
  const filtered = users.filter((u) => u.id !== userId);
  saveStoredUsers(filtered);
  return true;
};

export const getPendingUsersCount = (): number => {
  const users = getStoredUsers();
  return users.filter((u) => u.statusPersetujuan === 'MENUNGGU_PERSETUJUAN').length;
};

// =============================================================================
// SERVER-SYNCHRONIZED USER API (CROSS-DEVICE & REAL-TIME PERSISTENCE)
// =============================================================================

export const fetchUsersFromServer = async (): Promise<UserAccount[]> => {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        saveStoredUsers(data.users);
        return data.users;
      }
    }
  } catch (err) {
    console.warn('fetchUsersFromServer fallback to local storage:', err);
  }
  return getStoredUsers();
};

export const registerUserOnServer = async (userData: {
  nama: string;
  noHp: string;
  password: string;
  role: UserRole;
}): Promise<{ success: boolean; message: string; user?: UserAccount }> => {
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const current = getStoredUsers();
        if (!current.some((u) => u.id === data.user.id)) {
          const updated = [...current, data.user];
          saveStoredUsers(updated);
        }
        window.dispatchEvent(new CustomEvent('sulamjari-users-updated', { detail: data.user }));
        return { success: true, message: data.message, user: data.user };
      }
    } else if (res.status === 409) {
      const data = await res.json().catch(() => ({ message: 'Nomor HP / Username ini sudah terdaftar. Silakan langsung login.' }));
      return { success: false, message: data.message || 'Nomor HP / Username ini sudah terdaftar. Silakan langsung login.' };
    }

    // If static hosting (404/405) or server error, trigger fallback to ensure user can still register
    throw new Error(`Server returned status ${res.status}`);
  } catch (err: any) {
    // Graceful offline & static hosting fallback
    const cleanPhone = normalizePhoneNumber(userData.noHp);
    const current = getStoredUsers();
    const existing = current.find(
      (u) => normalizePhoneNumber(u.noHp) === cleanPhone || (u.username && normalizePhoneNumber(u.username) === cleanPhone)
    );
    if (existing) {
      return { success: false, message: 'Nomor HP / Username ini sudah terdaftar. Silakan langsung login.' };
    }
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      nama: userData.nama.trim(),
      username: cleanPhone,
      noHp: cleanPhone,
      password: userData.password,
      role: userData.role,
      statusPersetujuan: 'MENUNGGU_PERSETUJUAN',
      isVerified: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...current, newUser];
    saveStoredUsers(updated);
    window.dispatchEvent(new CustomEvent('sulamjari-users-updated', { detail: newUser }));
    return { success: true, message: 'Pendaftaran berhasil dikirim! Menunggu persetujuan Admin Pusat.', user: newUser };
  }
};

export const approveUserOnServer = async (
  userId: string,
  adminName: string = 'Admin Pusat'
): Promise<{
  success: boolean;
  user?: UserAccount;
  otpCode?: string;
  message: string;
  waPayload?: OtpSimulationMessage;
}> => {
  try {
    const res = await fetch('/api/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, adminName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const current = getStoredUsers();
        const idx = current.findIndex((u) => u.id === userId);
        if (idx >= 0) {
          current[idx] = data.user;
          saveStoredUsers(current);
        } else {
          saveStoredUsers([...current, data.user]);
        }
        window.dispatchEvent(new CustomEvent('sulamjari-users-updated', { detail: data.user }));
        return data;
      }
    }
  } catch (err) {
    console.warn('approveUserOnServer fallback to local:', err);
  }
  return approveUserAndGenerateOtp(userId, adminName);
};

export const rejectUserOnServer = async (
  userId: string,
  adminName: string = 'Admin Pusat'
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/users/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, adminName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const current = getStoredUsers();
        const idx = current.findIndex((u) => u.id === userId);
        if (idx >= 0) {
          current[idx].statusPersetujuan = 'DITOLAK';
          saveStoredUsers(current);
        }
        window.dispatchEvent(new CustomEvent('sulamjari-users-updated'));
        return data;
      }
    }
  } catch (err) {
    console.warn('rejectUserOnServer fallback to local:', err);
  }
  return rejectUserRegistration(userId, adminName);
};

export const deleteUserOnServer = async (userId: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const current = getStoredUsers();
      const filtered = current.filter((u) => u.id !== userId);
      saveStoredUsers(filtered);
      window.dispatchEvent(new CustomEvent('sulamjari-users-updated'));
      return true;
    }
  } catch (err) {
    console.warn('deleteUserOnServer fallback to local:', err);
  }
  return deleteUserAccount(userId);
};

export const seedDemoUserOnServer = async (): Promise<{ success: boolean; user?: UserAccount; message: string }> => {
  try {
    const res = await fetch('/api/users/seed-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        const current = getStoredUsers();
        saveStoredUsers([...current, data.user]);
        window.dispatchEvent(new CustomEvent('sulamjari-users-updated', { detail: data.user }));
        return data;
      }
    }
  } catch (err) {
    console.warn('seedDemoUserOnServer fallback to local:', err);
  }
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
  const demoCandidates = [
    { nama: 'Dedi Kurniawan', role: 'admin_pabrik' as UserRole, phone: `0812${randomDigits}` },
    { nama: 'Slamet Riyadi', role: 'kepala_pabrik' as UserRole, phone: `0813${randomDigits}` },
    { nama: 'Lestari Handayani', role: 'admin_pabrik' as UserRole, phone: `0857${randomDigits}` },
  ];
  const picked = demoCandidates[Math.floor(Math.random() * demoCandidates.length)];
  const demoUser: UserAccount = {
    id: `user-demo-${Date.now()}`,
    nama: picked.nama,
    username: picked.phone,
    noHp: picked.phone,
    password: 'password123',
    role: picked.role,
    statusPersetujuan: 'MENUNGGU_PERSETUJUAN',
    isVerified: false,
    createdAt: new Date().toISOString().split('T')[0],
  };
  const current = getStoredUsers();
  saveStoredUsers([...current, demoUser]);
  window.dispatchEvent(new CustomEvent('sulamjari-users-updated', { detail: demoUser }));
  return { success: true, user: demoUser, message: `Contoh pendaftar (${demoUser.nama}) berhasil ditambahkan dan menunggu persetujuan.` };
};
