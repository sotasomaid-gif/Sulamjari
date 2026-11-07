import React, { useState, useEffect } from 'react';
import {
  Wheat,
  Lock,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  MessageCircle,
  X,
  Hourglass,
  Clock,
  ShieldAlert,
  Sparkles,
  Check,
  ExternalLink,
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';
import {
  getStoredUsers,
  saveStoredUsers,
  normalizePhoneNumber,
  formatDisplayPhone,
  generateOtpCode,
  createOtpWhatsAppPayload,
  OtpSimulationMessage,
  DEFAULT_USERS,
  getWhatsAppWebUrl,
  toInternationalPhone,
  fetchUsersFromServer,
  registerUserOnServer,
  verifyUserOtpOnServer,
} from '../utils/auth';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { syncUserRecordToSheets } from '../utils/googleSheetsSync';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean; // If true (user logged out), cannot close without logging in
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  showToast: (msg: string) => void;
  onUserRegistered?: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
  currentUser,
  onLoginSuccess,
  showToast,
  onUserRegistered,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'otp_verify' | 'pending_approval'>('login');

  // Waiting user approval state
  const [registeredUserWaiting, setRegisteredUserWaiting] = useState<UserAccount | null>(null);
  const [showWaitingPassword, setShowWaitingPassword] = useState(false);

  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regNama, setRegNama] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('admin_pabrik');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // OTP Verification state
  const [otpTargetUserId, setOtpTargetUserId] = useState<string | null>(null);
  const [otpTargetUser, setOtpTargetUser] = useState<UserAccount | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  // WhatsApp Chat Simulation State
  const [activeWaMessage, setActiveWaMessage] = useState<OtpSimulationMessage | null>(null);
  const [showWaModal, setShowWaModal] = useState<boolean>(false);

  // OTP Resend Countdown Timer
  useEffect(() => {
    let timer: any;
    if (mode === 'otp_verify' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, otpCountdown]);

  if (!isOpen) return null;

  // --- HANDLER: LOGIN ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanPhone = normalizePhoneNumber(loginPhone);
    if (!cleanPhone) {
      setLoginError('Silakan masukkan nomor HP aktif.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Silakan masukkan password akun Anda.');
      return;
    }

    // Always fetch latest users from server to ensure fresh credentials across devices
    let users = await fetchUsersFromServer();
    if (!users || users.length === 0) {
      users = getStoredUsers();
    }

    const user = users.find(
      (u) => normalizePhoneNumber(u.noHp) === cleanPhone || (u.username && u.username === cleanPhone)
    );

    if (!user) {
      setLoginError('Nomor HP / Username belum terdaftar. Silakan daftar akun baru terlebih dahulu.');
      return;
    }

    if (user.password !== loginPassword) {
      setLoginError('Password yang Anda masukkan salah.');
      return;
    }

    // 1. Check approval status by Admin Pusat
    if (user.statusPersetujuan === 'MENUNGGU_PERSETUJUAN') {
      setRegisteredUserWaiting(user);
      setMode('pending_approval');
      showToast('⏳ Akun Anda masih menunggu persetujuan Admin Pusat.');
      return;
    }

    if (user.statusPersetujuan === 'DITOLAK') {
      setLoginError('❌ Pendaftaran akun ini telah DITOLAK oleh Admin Pusat. Hubungi Admin Pusat untuk informasi lebih lanjut.');
      return;
    }

    // 2. Check if user is verified via OTP
    if (!user.isVerified) {
      let otpCode = user.lastOtp;
      if (!otpCode) {
        otpCode = generateOtpCode();
        user.lastOtp = otpCode;
        user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
        saveStoredUsers(users);
      }

      const waMsg = createOtpWhatsAppPayload(user.nama, user.noHp, user.role, otpCode);
      setActiveWaMessage(waMsg);
      setShowWaModal(true);

      setOtpTargetUserId(user.id);
      setOtpTargetUser(user);
      setOtpInput('');
      setOtpCountdown(60);
      setCanResend(false);
      setMode('otp_verify');
      showToast('✅ Akun telah disetujui Admin Pusat! Silakan masukkan kode OTP yang dikirimkan ke WhatsApp Anda.');
      return;
    }

    // Login successful
    onLoginSuccess(user);
    showToast(`👋 Selamat datang kembali, ${user.nama} (${ROLE_DEFINITIONS[user.role].title})!`);
    if (onClose) onClose();
  };

  // --- HANDLER: REGISTER ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const namaTrim = regNama.trim();
    if (!namaTrim) {
      setRegError('Nama lengkap wajib diisi.');
      return;
    }

    const cleanPhone = normalizePhoneNumber(regPhone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setRegError('Nomor HP aktif (WhatsApp) tidak valid. Contoh: 08123456789 (minimal 8-13 digit).');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setRegError('Password minimal 6 karakter.');
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setRegError('Konfirmasi password tidak cocok dengan password.');
      return;
    }

    // Save directly to the shared backend server so it is immediately visible to Admin Pusat on any device
    const res = await registerUserOnServer({
      nama: namaTrim,
      noHp: cleanPhone,
      password: regPassword,
      role: regRole,
    });

    if (!res.success) {
      setRegError(res.message);
      return;
    }

    const newUser = res.user!;
    // Also sync to Google Spreadsheet if configured
    syncUserRecordToSheets(newUser, getStoredUsers(), 'Pendaftaran Online Pegawai');

    if (onUserRegistered) {
      onUserRegistered(newUser);
    }

    setRegisteredUserWaiting(newUser);
    setMode('pending_approval');
    showToast('⏳ Pendaftaran berhasil dikirim! Menunggu konfirmasi & persetujuan dari Admin Pusat.');
  };

  const handleCheckApprovalStatus = async () => {
    if (!registeredUserWaiting) return;
    const users = await fetchUsersFromServer();
    const found = users.find((u) => u.id === registeredUserWaiting.id || normalizePhoneNumber(u.noHp) === normalizePhoneNumber(registeredUserWaiting.noHp));
    if (!found) {
      showToast('Data akun tidak ditemukan.');
      return;
    }
    setRegisteredUserWaiting(found);

    if (found.statusPersetujuan === 'DISETUJUI') {
      showToast('🎉 Akun Anda telah disetujui Admin Pusat!');
      let otpCode = found.lastOtp;
      if (!otpCode) {
        otpCode = generateOtpCode();
        found.lastOtp = otpCode;
        found.otpExpiresAt = Date.now() + 15 * 60 * 1000;
        saveStoredUsers(users);
      }
      const waMsg = createOtpWhatsAppPayload(found.nama, found.noHp, found.role, otpCode);
      setActiveWaMessage(waMsg);
      setShowWaModal(true);

      setOtpTargetUserId(found.id);
      setOtpTargetUser(found);
      setOtpInput('');
      setOtpCountdown(60);
      setCanResend(false);
      setMode('otp_verify');
    } else if (found.statusPersetujuan === 'DITOLAK') {
      showToast('❌ Pendaftaran akun Anda telah ditolak oleh Admin Pusat.');
    } else {
      showToast('⏳ Masih menunggu persetujuan Admin Pusat.');
    }
  };

  // --- HANDLER: RESEND OTP ---
  const handleResendOtp = () => {
    if (!otpTargetUserId) return;
    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.id === otpTargetUserId);
    if (userIndex === -1) return;

    const newOtp = generateOtpCode();
    users[userIndex].lastOtp = newOtp;
    users[userIndex].otpExpiresAt = Date.now() + 5 * 60 * 1000;
    saveStoredUsers(users);

    const user = users[userIndex];
    setOtpTargetUser(user);

    const waMsg = createOtpWhatsAppPayload(user.nama, user.noHp, user.role, newOtp);
    setActiveWaMessage(waMsg);
    setShowWaModal(true);

    setOtpCountdown(60);
    setCanResend(false);
    setOtpError(null);
    showToast('🔄 Kode OTP baru telah dikirimkan kembali ke WhatsApp!');
  };

  // --- HANDLER: VERIFY OTP ---
  const handleVerifyOtpSubmit = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    setOtpError(null);

    const codeToVerify = (overrideCode || otpInput).trim();
    if (!codeToVerify) {
      setOtpError('Silakan masukkan 6 digit kode OTP.');
      return;
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.id === otpTargetUserId);
    if (userIndex === -1) {
      setOtpError('Data akun tidak ditemukan. Silakan lakukan pendaftaran ulang.');
      return;
    }

    const user = users[userIndex];

    const result = await verifyUserOtpOnServer(user.id, codeToVerify, user.noHp);
    if (!result.success) {
      setOtpError(result.message);
      return;
    }

    const activatedUser = result.user || { ...user, isVerified: true, lastOtp: codeToVerify };
    // Synchronize to Google Sheets
    syncUserRecordToSheets(activatedUser, getStoredUsers(), 'Aktivasi OTP Sukses');

    onLoginSuccess(activatedUser);
    showToast(
      `🎉 Pendaftaran Berhasil & Akun Aktif! Selamat bergabung sebagai ${
        ROLE_DEFINITIONS[activatedUser.role].title
      }!`
    );

    if (onClose) onClose();
  };

  return (
    <>
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 ${
        isMandatory ? 'bg-slate-950/90 backdrop-blur-md min-h-screen' : 'bg-slate-900/60 backdrop-blur-xs'
      }`}>
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 transition-all">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-5 sm:p-6 relative">
            {!isMandatory && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400/30 shrink-0">
                <Wheat className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 block">
                  Autentikasi &amp; Akses Pengguna
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  Pabrik Mie Sulamjari
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sistem Terintegrasi Stok, Pemakaian, Penjualan &amp; Laporan
                </p>
              </div>
            </div>

            {/* Switch Mode Tabs (Only for login and register) */}
            {mode !== 'otp_verify' && mode !== 'pending_approval' && (
              <div className="flex bg-slate-800/80 p-1 rounded-xl mt-5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Masuk (Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setRegError(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Daftar Akun Baru (OTP WA)
                </button>
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Mandatory login notice */}
            {isMandatory && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Akses Terproteksi:</strong> Seluruh pengguna wajib masuk (login) atau mendaftar terlebih dahulu untuk mengakses sistem pabrik mie.
                </span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODE: LOGIN */}
            {/* ========================================================================= */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor WhatsApp / HP Aktif <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi Anda"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Masuk ke Sistem Pabrik</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Belum memiliki akun terdaftar?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setRegError(null);
                      }}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Daftar akun baru dengan OTP WA
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* MODE: REGISTER (Daftar Akun Baru dengan OTP WhatsApp) */}
            {/* ========================================================================= */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {regError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Lengkap Pendaftar <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regNama}
                      onChange={(e) => {
                        setRegNama(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      placeholder="Contoh: Budi Santoso / Pak Joko"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Nomor HP Aktif (WhatsApp) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor WhatsApp / HP Aktif <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value);
                        if (regError) setRegError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      placeholder="08xxxxxxxxxx / 628xxxxxxxxxx"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium font-mono"
                    />
                  </div>
                  {/* Live Interactive WhatsApp Format Indicator */}
                  {regPhone.trim().length > 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px] mt-1.5 font-medium animate-in fade-in">
                      {normalizePhoneNumber(regPhone).length >= 8 ? (
                        <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          <span>Format Valid: <strong>+{toInternationalPhone(regPhone)}</strong> ({formatDisplayPhone(regPhone)})</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <span>⚠️ Masukkan minimal 8 digit nomor HP ({normalizePhoneNumber(regPhone).length}/8).</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Sistem akan mengirimkan pesan chat OTP langsung ke nomor WhatsApp ini untuk verifikasi.
                    </p>
                  )}
                </div>

                {/* Role Model Selection (Wajib memilih salah satu) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilih Role Model Jabatan <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['admin_pusat', 'admin_pabrik', 'kepala_pabrik'] as UserRole[]).map((r) => {
                      const info = ROLE_DEFINITIONS[r];
                      const isSelected = regRole === r;
                      return (
                        <div
                          key={r}
                          onClick={() => setRegRole(r)}
                          className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-red-600 bg-red-50/70 shadow-xs ring-2 ring-red-500/20'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base">
                              {r === 'admin_pusat' ? '👑' : r === 'admin_pabrik' ? '🏭' : '👷'}
                            </span>
                            <span
                              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-red-600 bg-red-600' : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 leading-tight">
                            {info.title}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                            {r === 'admin_pusat' && 'Pemilik, audit keuangan & atur hak akses.'}
                            {r === 'admin_pabrik' && 'Kasir penjualan, stok barang & biaya pabrik.'}
                            {r === 'kepala_pabrik' && 'Mandor produksi mie, target & pemakaian.'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Setelah login, hak akses menu dan sensor blur akan disesuaikan otomatis dengan peran ini.
                  </p>
                </div>

                {/* Password & Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regError) setRegError(null);
                        }}
                        placeholder="Min. 6 karakter"
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ulangi Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPasswordConfirm}
                        onChange={(e) => {
                          setRegPasswordConfirm(e.target.value);
                          if (regError) setRegError(null);
                        }}
                        placeholder="Ketik ulang password"
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRegPassword}
                      onChange={(e) => setShowRegPassword(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span>Tampilkan password</span>
                  </label>
                </div>

                {/* Submit Register */}
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Hourglass className="w-4 h-4" />
                  <span>Kirim Pendaftaran (Menunggu Konfirmasi Admin)</span>
                </button>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  ℹ️ Akun Anda akan diverifikasi dan disetujui terlebih dahulu oleh Admin Pusat sebelum sistem mengirimkan kode OTP ke WhatsApp Anda.
                </p>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setLoginError(null);
                      }}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Masuk ke sistem di sini
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* MODE: PENDING APPROVAL (Menunggu Konfirmasi & Persetujuan Admin Pusat) */}
            {/* ========================================================================= */}
            {mode === 'pending_approval' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="text-center p-5 bg-gradient-to-br from-amber-50 to-orange-50/80 rounded-2xl border border-amber-200 space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-md ring-4 ring-amber-100">
                    <Hourglass className="w-7 h-7 text-white animate-pulse" />
                  </div>

                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Status: Menunggu Persetujuan Admin Pusat
                    </span>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg mt-2">
                      Pendaftaran Berhasil Dikirim!
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                      Akun Anda telah tersimpan di sistem &amp; database. Kode OTP verifikasi WhatsApp akan dikirimkan segera setelah <strong>Admin Pusat</strong> menyetujui pendaftaran Anda.
                    </p>
                  </div>

                  {registeredUserWaiting && (
                    <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-amber-200 text-left text-xs space-y-2 mt-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Nama Lengkap:</span>
                        <span className="font-bold text-slate-800">{registeredUserWaiting.nama}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Username / No WhatsApp:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatDisplayPhone(registeredUserWaiting.noHp)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Role Model:</span>
                        <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          {ROLE_DEFINITIONS[registeredUserWaiting.role]?.title || registeredUserWaiting.role}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Password Login:</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-bold text-slate-800">
                            {showWaitingPassword ? registeredUserWaiting.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowWaitingPassword(!showWaitingPassword)}
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                            title="Tampilkan / sembunyikan password"
                          >
                            {showWaitingPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Keamanan Akses Pabrik Mie Sulamjari</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Hanya Admin Pusat yang berwenang memberikan izin masuk dan menyetujui pengiriman kode OTP kepada akun baru untuk menjaga keamanan data operasional pabrik.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {registeredUserWaiting && (
                    <a
                      href={getWhatsAppWebUrl(
                        '0895321898759',
                        `Halo Admin Pusat Pabrik Mie Sulamjari! 👋\n\nSaya telah mendaftar akun baru:\n• Nama: *${registeredUserWaiting.nama}*\n• Nomor WhatsApp: *${registeredUserWaiting.noHp}*\n• Role yang Diajukan: *${ROLE_DEFINITIONS[registeredUserWaiting.role]?.title || registeredUserWaiting.role}*\n\nMohon persetujuan akun dan pengiriman kode verifikasi OTP WhatsApp. Terima kasih! 🙏`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      title="Kirim pesan langsung ke WhatsApp Web Admin Pusat (0895321898759)"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Konfirmasi ke Admin Pusat via WA Web</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleCheckApprovalStatus}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Cek Status Persetujuan Terbaru</span>
                  </button>

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Buka &amp; Proses di Dashboard Admin Pusat</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginPhone('0895321898759');
                        setLoginPassword('@123Juara');
                        setMode('login');
                        setLoginError(null);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Masuk sebagai Admin Pusat untuk Memproses</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLoginError(null);
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Kembali ke Halaman Masuk (Login)</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODE: OTP VERIFICATION (Verifikasi Chat WhatsApp OTP) */}
            {/* ========================================================================= */}
            {mode === 'otp_verify' && (
              <div className="space-y-4">
                {otpError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto text-xl shadow-md">
                    💬
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Verifikasi Akun via Chat WhatsApp
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Kode OTP 6-digit telah dikirimkan ke nomor WhatsApp:{' '}
                    <strong className="text-emerald-800 font-bold">
                      {otpTargetUser ? formatDisplayPhone(otpTargetUser.noHp) : ''}
                    </strong>
                  </p>

                  {/* Button to open simulated WhatsApp modal */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowWaModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Lihat Chat Masuk WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* OTP Input Form */}
                <form
                  onSubmit={(e) => handleVerifyOtpSubmit(e)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                      Masukkan 6 Digit Kode OTP
                    </label>
                    <div className="flex justify-center">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • • • •"
                        className="w-48 sm:w-56 text-center tracking-[0.5em] text-2xl font-black font-mono py-2.5 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-slate-900 shadow-inner"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifikasi &amp; Aktifkan Akun</span>
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setOtpError(null);
                      }}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      ← Ganti nomor HP
                    </button>

                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kirim Ulang OTP</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">
                        Kirim ulang dalam <strong className="text-slate-600">{otpCountdown}s</strong>
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded WhatsApp Chat Simulation Modal */}
      <WhatsAppChatModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        message={activeWaMessage}
        onAutoFillAndVerify={(code) => {
          setOtpInput(code);
          handleVerifyOtpSubmit(undefined, code);
        }}
      />
    </>
  );
};
