import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Zap,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Layers,
  Info,
  Hourglass,
  Clock,
  Key,
  Check,
  X,
  MessageCircle,
  Trash2,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  UserAccount,
  UserRole,
  PermissionKey,
  SystemPermissions,
  StatusPersetujuanAkun,
} from '../types';
import { ROLE_DEFINITIONS, PERMISSION_LIST } from '../utils/rbac';
import { formatRupiah } from '../utils/storage';
import {
  getStoredUsers,
  saveStoredUsers,
  approveUserAndGenerateOtp,
  rejectUserRegistration,
  deleteUserAccount,
  formatDisplayPhone,
  OtpSimulationMessage,
  getWhatsAppWebUrl,
  fetchUsersFromServer,
  approveUserOnServer,
  rejectUserOnServer,
  deleteUserOnServer,
} from '../utils/auth';
import { WhatsAppChatModal } from './WhatsAppChatModal';

interface PengaturanHakAksesTabProps {
  permissions: SystemPermissions;
  activeRole: UserRole;
  onUpdatePermissions: (newPermissions: SystemPermissions) => void;
  onSwitchRole: (newRole: UserRole) => void;
  onResetPermissions: () => void;
  showToast: (msg: string) => void;
  usersList?: UserAccount[];
  onApproveUser?: (userId: string) => void;
  onRejectUser?: (userId: string) => void;
  onDeleteUser?: (userId: string, nama: string) => void;
}

export const PengaturanHakAksesTab: React.FC<PengaturanHakAksesTabProps> = ({
  permissions,
  activeRole,
  onUpdatePermissions,
  onSwitchRole,
  onResetPermissions,
  showToast,
  usersList: propUsersList,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'view' | 'action'>('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localPermissions, setLocalPermissions] = useState<SystemPermissions>(permissions);

  // User Management & Approval State
  const [usersList, setUsersList] = useState<UserAccount[]>(() => propUsersList || getStoredUsers());
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showUsersDirectory, setShowUsersDirectory] = useState<boolean>(true);
  const [activeWaMessage, setActiveWaMessage] = useState<OtpSimulationMessage | null>(null);
  const [showWaModal, setShowWaModal] = useState<boolean>(false);

  useEffect(() => {
    if (propUsersList) {
      setUsersList(propUsersList);
    }
  }, [propUsersList]);

  const refreshUsers = () => {
    fetchUsersFromServer().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setUsersList(fresh);
      }
    });
  };

  const handleApprove = async (userId: string) => {
    if (onApproveUser) {
      onApproveUser(userId);
      refreshUsers();
      return;
    }
    const res = await approveUserOnServer(userId, 'Admin Pusat');
    if (res.success) {
      refreshUsers();
      if (res.waPayload) {
        setActiveWaMessage(res.waPayload);
        setShowWaModal(true);
      }
      showToast(res.message);
    } else {
      showToast('❌ Gagal menyetujui: ' + res.message);
    }
  };

  const handleReject = async (userId: string) => {
    if (onRejectUser) {
      onRejectUser(userId);
      refreshUsers();
      return;
    }
    if (confirm('Tolak permohonan pendaftaran akun ini?')) {
      const res = await rejectUserOnServer(userId, 'Admin Pusat');
      refreshUsers();
      showToast(res.message);
    }
  };

  const handleDelete = async (userId: string, nama: string) => {
    if (onDeleteUser) {
      onDeleteUser(userId, nama);
      refreshUsers();
      return;
    }
    if (confirm(`Hapus akun "${nama}" secara permanen dari sistem?`)) {
      const ok = await deleteUserOnServer(userId);
      if (ok) {
        refreshUsers();
        showToast(`Akun "${nama}" telah dihapus.`);
      } else {
        showToast('Akun Admin Pusat utama tidak dapat dihapus.');
      }
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const pendingUsers = usersList.filter((u) => u.statusPersetujuan === 'MENUNGGU_PERSETUJUAN');
  const approvedOrRejectedUsers = usersList.filter((u) => u.statusPersetujuan !== 'MENUNGGU_PERSETUJUAN');

  // Sync if external permissions change
  React.useEffect(() => {
    setLocalPermissions(permissions);
    setHasUnsavedChanges(false);
  }, [permissions]);

  const roles: UserRole[] = ['admin_pusat', 'admin_pabrik', 'kepala_pabrik'];

  const handleToggle = (role: UserRole, key: PermissionKey) => {
    const updated = {
      ...localPermissions,
      [role]: {
        ...localPermissions[role],
        [key]: !localPermissions[role][key],
      },
    };
    setLocalPermissions(updated);
    setHasUnsavedChanges(true);
    // Instant save for convenience, while keeping save button for explicit feedback
    onUpdatePermissions(updated);
  };

  const handleToggleAllForRole = (role: UserRole, targetValue: boolean) => {
    const updatedRolePerms = { ...localPermissions[role] };
    PERMISSION_LIST.forEach((perm) => {
      // If category filter is active, only toggle that category
      if (categoryFilter === 'all' || perm.category === categoryFilter) {
        updatedRolePerms[perm.key] = targetValue;
      }
    });

    const updated = {
      ...localPermissions,
      [role]: updatedRolePerms,
    };
    setLocalPermissions(updated);
    setHasUnsavedChanges(true);
    onUpdatePermissions(updated);
    showToast(
      `${targetValue ? 'Mencentang semua' : 'Membatalkan semua'} izin untuk ${
        ROLE_DEFINITIONS[role].title
      }`
    );
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengembalikan seluruh hak akses ke setelan bawaan standar pabrik?'
      )
    ) {
      onResetPermissions();
      setHasUnsavedChanges(false);
      showToast('Hak akses berhasil dikembalikan ke standar bawaan pabrik.');
    }
  };

  const handleSave = () => {
    onUpdatePermissions(localPermissions);
    setHasUnsavedChanges(false);
    showToast('✅ Seluruh konfigurasi checklist hak akses berhasil disimpan!');
  };

  // Filtered permission list
  const filteredPermissions = PERMISSION_LIST.filter((perm) => {
    const matchesCategory =
      categoryFilter === 'all' || perm.category === categoryFilter;
    const matchesSearch =
      perm.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.key.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const viewCount = PERMISSION_LIST.filter((p) => p.category === 'view').length;
  const actionCount = PERMISSION_LIST.filter((p) => p.category === 'action').length;

  // STRICT ACCESS CONTROL: Fitur HAK AKSES hanya bisa dilihat dan di-edit oleh Admin Pusat
  if (activeRole !== 'admin_pusat') {
    return (
      <div className="py-12 px-4 max-w-2xl mx-auto text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-50">
          <Lock className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>Kewenangan Terbatas (Admin Pusat Only)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Akses Dibatasi Khusus Admin Pusat
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            Halaman <strong>Pengaturan Hak Akses (Matrix RBAC)</strong> bersifat rahasia dan 
            hanya dapat dilihat serta diedit oleh pengguna dengan peran <strong>Admin Pusat</strong>.
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-left flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
            {activeRole === 'admin_pabrik' ? '🏭' : '👷'}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status Peran Anda Saat Ini:
            </div>
            <div className="font-extrabold text-sm text-slate-900">
              {ROLE_DEFINITIONS[activeRole].title} ({ROLE_DEFINITIONS[activeRole].subtitle})
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Anda tidak memiliki izin untuk mengonfigurasi wewenang atau hak akses pengguna lain.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onSwitchRole('admin_pusat')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>👑 Masuk Sebagai Admin Pusat</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-2xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold mb-2 border border-red-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              Role-Based Access Control (RBAC) Pabrik Mie
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Pengaturan Hak Akses Pengguna
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Atur kewenangan setiap peran melalui checklist fitur lengkap. Anda dapat menentukan
              tindakan yang boleh dilakukan dan data apa saja yang dapat dilihat —{' '}
              <span className="text-amber-300 font-semibold underline underline-offset-2">
                data yang tidak diizinkan akan otomatis di-BLUR
              </span>{' '}
              untuk menjaga kerahasiaan keuangan dan fokus kerja karyawan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/15"
              title="Kembalikan semua checklist ke default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke Default
            </button>
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                hasUnsavedChanges
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {hasUnsavedChanges ? 'Simpan Perubahan' : 'Tersimpan Otomatis'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PERSETUJUAN PENDAFTARAN AKUN BARU OLEH ADMIN PUSAT */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Persetujuan Pendaftaran Akun Pegawai</span>
              {pendingUsers.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white animate-pulse">
                  {pendingUsers.length} Menunggu Persetujuan
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Semua Akun Telah Dikonfirmasi
                </span>
              )}
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Kewenangan khusus Admin Pusat untuk menyetujui pengiriman kode OTP WhatsApp
          </span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Tidak ada permohonan pendaftaran baru</p>
                <p className="text-slate-500 text-[11px]">
                  Jika ada pegawai baru mendaftar di halaman depan, permohonan akun mereka akan otomatis muncul di sini untuk Anda setujui.
                </p>
              </div>
            </div>
            <button
              onClick={refreshUsers}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 font-semibold shrink-0"
            >
              Segarkan
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => {
              const isPasswordRevealed = !!revealedPasswords[user.id];
              const roleInfo = ROLE_DEFINITIONS[user.role];

              return (
                <div
                  key={user.id}
                  className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-2xl border-2 border-amber-300 shadow-sm space-y-3 animate-in fade-in"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl ${roleInfo?.avatarBg || 'bg-amber-600'} text-white flex items-center justify-center text-base font-black shadow-xs shrink-0`}>
                        {user.nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-sm sm:text-base">
                            {user.nama}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${roleInfo?.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            Memohon Role: {roleInfo?.title || user.role}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ⏳ Menunggu Konfirmasi OTP
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Username / WhatsApp:{' '}
                          <strong className="text-slate-900 font-mono font-bold">
                            {formatDisplayPhone(user.noHp)}
                          </strong>
                          {' • '}Terdaftar: {user.createdAt}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap justify-end">
                      <button
                        onClick={() => handleReject(user.id)}
                        className="px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="Tolak pendaftaran akun"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>

                      <a
                        href={getWhatsAppWebUrl(
                          user.noHp,
                          `Halo *${user.nama}*! 👋\n\nPendaftaran akun Anda di *Sistem Manajemen Pabrik Mie Sulamjari* telah *DISETUJUI* oleh Admin Pusat. ✅\n\nNomor HP / Username: *${user.username || user.noHp}*\n${user.lastOtp ? `Kode OTP: *${user.lastOtp}*\n` : ''}\nSilakan login ke aplikasi.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[#075E54] text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="Buka chat WhatsApp Web langsung dengan nomor pendaftar"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kirim via WA Web</span>
                        <ExternalLink className="w-3 h-3 text-emerald-600" />
                      </a>

                      <button
                        onClick={() => handleApprove(user.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        title="Setujui pendaftaran dan kirim kode OTP ke nomor WhatsApp pendaftar"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Setujui &amp; Kirim OTP WA</span>
                      </button>
                    </div>
                  </div>

                  {/* Stored Credentials Card for Admin Pusat */}
                  <div className="p-3 bg-white rounded-xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Username Login:</span>
                        <code className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {user.username || user.noHp}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Password Login:</span>
                        <code className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {isPasswordRevealed ? user.password : '••••••••'}
                        </code>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                          title="Lihat / sembunyikan password akun ini"
                        >
                          {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-800 font-medium">
                      💡 Setelah disetujui, kode OTP 6-digit akan langsung dibuat dan dikirimkan via chat WhatsApp.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DIREKTORI SELURUH AKUN PEGAWAI & KREDENSIAL DATABASE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          onClick={() => setShowUsersDirectory(!showUsersDirectory)}
          className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                Direktori Akun Pegawai &amp; Kredensial Database ({usersList.length} Akun)
              </h3>
              <p className="text-[11px] text-slate-500">
                Informasi username, password, dan status persetujuan yang tersimpan di sistem &amp; Google Spreadsheet
              </p>
            </div>
          </div>
          <button className="text-slate-500 p-1">
            {showUsersDirectory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showUsersDirectory && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Nama Pegawai</th>
                  <th className="py-2.5 px-4">Username Login</th>
                  <th className="py-2.5 px-4">Password Tersimpan</th>
                  <th className="py-2.5 px-4">Role Model</th>
                  <th className="py-2.5 px-4">Persetujuan</th>
                  <th className="py-2.5 px-4">Verifikasi OTP</th>
                  <th className="py-2.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {usersList.map((user) => {
                  const isPasswordRevealed = !!revealedPasswords[user.id];
                  const isMainAdmin = user.noHp === '0895321898759';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{user.nama}</span>
                          {isMainAdmin && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold">
                              Utama
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {user.username || user.noHp}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {isPasswordRevealed ? user.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-700 p-1"
                            title="Tampilkan password"
                          >
                            {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          user.role === 'admin_pusat'
                            ? 'bg-red-100 text-red-800'
                            : user.role === 'admin_pabrik'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ROLE_DEFINITIONS[user.role]?.title || user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.statusPersetujuan === 'DISETUJUI'
                            ? 'bg-emerald-100 text-emerald-800'
                            : user.statusPersetujuan === 'DITOLAK'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {user.statusPersetujuan || 'DISETUJUI'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.isVerified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.isVerified ? '✓ Terverifikasi' : 'Belum OTP'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isMainAdmin ? (
                          <span className="text-[10px] text-slate-400 italic">Terkunci</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={getWhatsAppWebUrl(
                                user.noHp,
                                `Halo *${user.nama}*! 👋\n\nPesan resmi dari Admin Pusat Pabrik Mie Sulamjari mengenai akun Anda (${formatDisplayPhone(user.noHp)}).`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                              title="Buka Chat via WhatsApp Web"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            {!user.isVerified && (
                              <button
                                onClick={() => handleApprove(user.id)}
                                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 cursor-pointer"
                                title="Setujui & Kirim Kode OTP"
                              >
                                OTP WA
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(user.id, user.nama)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Hapus akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Switcher & Live Simulation Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Simulasi &amp; Ganti Peran Aktif
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Klik salah satu kartu di bawah untuk mencoba tampilan sebagai peran tersebut
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((roleKey) => {
            const role = ROLE_DEFINITIONS[roleKey];
            const isCurrentActive = activeRole === roleKey;
            const rolePerms = localPermissions[roleKey];
            const activePermCount = Object.values(rolePerms).filter(Boolean).length;
            const totalPermCount = PERMISSION_LIST.length;

            return (
              <div
                key={roleKey}
                onClick={() => {
                  onSwitchRole(roleKey);
                  showToast(`👤 Beralih peran ke: ${role.title} (${role.subtitle})`);
                }}
                className={`relative rounded-2xl p-4 sm:p-5 cursor-pointer transition-all border-2 text-left group ${
                  isCurrentActive
                    ? 'bg-white border-red-600 shadow-md ring-4 ring-red-500/10'
                    : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Active Indicator Badge */}
                {isCurrentActive && (
                  <div className="absolute top-3.5 right-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" /> Aktif Digunakan
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${role.avatarBg} text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0`}
                  >
                    {roleKey === 'admin_pusat' ? '👑' : roleKey === 'admin_pabrik' ? '🏭' : '👷'}
                  </div>
                  <div className="pr-16">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                      {role.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{role.subtitle}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {role.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Izin Diberikan:</span>
                  <span className="font-bold text-slate-800">
                    {activePermCount} / {totalPermCount} Fitur
                  </span>
                </div>

                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      roleKey === 'admin_pusat'
                        ? 'bg-red-600'
                        : roleKey === 'admin_pabrik'
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${(activePermCount / totalPermCount) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Interactive Blur Sandbox Simulation */}
      <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Pratinjau Efek Blur Langsung (Peran Aktif:{' '}
              <span className={ROLE_DEFINITIONS[activeRole].textColor}>
                {ROLE_DEFINITIONS[activeRole].title}
              </span>
              )
            </h3>
          </div>
          <span className="text-[11px] text-slate-600 bg-white/70 px-2.5 py-1 rounded-lg border border-amber-200">
            Coba centang/batalkan checklist di bawah untuk melihat efek langsung
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Item 1: Omset Keuangan */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Total Omset Harian</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  localPermissions[activeRole].view_omset_keuangan
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {localPermissions[activeRole].view_omset_keuangan ? 'Terlihat' : 'BLUR AKTIF'}
              </span>
            </div>
            {localPermissions[activeRole].view_omset_keuangan ? (
              <div className="text-base font-extrabold text-slate-900">
                {formatRupiah(4850000)}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="filter blur-[5px] select-none text-base font-bold text-slate-400">
                  Rp 4.850.000
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Blur
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-600 mt-1">
              Dikontrol oleh izin <code>view_omset_keuangan</code>
            </p>
          </div>

          {/* Item 2: Harga Beli Kulakan */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Harga Kulakan Tepung Cakra</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  localPermissions[activeRole].view_harga_beli_bahan
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {localPermissions[activeRole].view_harga_beli_bahan ? 'Terlihat' : 'BLUR AKTIF'}
              </span>
            </div>
            {localPermissions[activeRole].view_harga_beli_bahan ? (
              <div className="text-base font-extrabold text-slate-900">
                {formatRupiah(11400)} / Kg
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="filter blur-[5px] select-none text-base font-bold text-slate-400">
                  Rp 11.400 / Kg
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Blur
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-600 mt-1">
              Dikontrol oleh izin <code>view_harga_beli_bahan</code>
            </p>
          </div>

          {/* Item 3: Piutang Pelanggan */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Sisa Piutang Toko Depot</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  localPermissions[activeRole].view_piutang
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {localPermissions[activeRole].view_piutang ? 'Terlihat' : 'BLUR AKTIF'}
              </span>
            </div>
            {localPermissions[activeRole].view_piutang ? (
              <div className="text-base font-extrabold text-amber-700">
                {formatRupiah(650000)} (3 Nota)
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="filter blur-[5px] select-none text-base font-bold text-slate-400">
                  Rp 650.000 (3 Nota)
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Blur
                </span>
              </div>
            )}
            <p className="text-[10px] text-slate-600 mt-1">
              Dikontrol oleh izin <code>view_piutang</code>
            </p>
          </div>
        </div>
      </div>

      {/* Main Checklist Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua Fitur ({PERMISSION_LIST.length})
            </button>
            <button
              onClick={() => setCategoryFilter('view')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'view'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Hak Melihat &amp; Blur Data ({viewCount})
            </button>
            <button
              onClick={() => setCategoryFilter('action')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                categoryFilter === 'action'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Hak Melakukan Aksi ({actionCount})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari fitur / izin..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/75 text-xs text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6 w-1/2">
                  Daftar Fitur &amp; Wewenang Operasional
                </th>
                <th className="py-3.5 px-3 text-center w-[16%]">
                  <div className="flex flex-col items-center">
                    <span className="text-red-700 font-extrabold flex items-center gap-1">
                      👑 Admin Pusat
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-normal normal-case">
                      <button
                        onClick={() => handleToggleAllForRole('admin_pusat', true)}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        Semua
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleToggleAllForRole('admin_pusat', false)}
                        className="text-rose-700 hover:underline font-semibold"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center w-[16%]">
                  <div className="flex flex-col items-center">
                    <span className="text-blue-700 font-extrabold flex items-center gap-1">
                      🏭 Admin Pabrik
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-normal normal-case">
                      <button
                        onClick={() => handleToggleAllForRole('admin_pabrik', true)}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        Semua
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleToggleAllForRole('admin_pabrik', false)}
                        className="text-rose-700 hover:underline font-semibold"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center w-[16%]">
                  <div className="flex flex-col items-center">
                    <span className="text-amber-700 font-extrabold flex items-center gap-1">
                      👷 Kepala Pabrik
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-normal normal-case">
                      <button
                        onClick={() => handleToggleAllForRole('kepala_pabrik', true)}
                        className="text-emerald-700 hover:underline font-semibold"
                      >
                        Semua
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleToggleAllForRole('kepala_pabrik', false)}
                        className="text-rose-700 hover:underline font-semibold"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPermissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Tidak ditemukan fitur dengan kata kunci "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredPermissions.map((perm) => {
                  const isView = perm.category === 'view';

                  return (
                    <tr
                      key={perm.key}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                              isView
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isView ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {perm.label}
                              </span>
                              {perm.affectsBlur && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                  <Lock className="w-2.5 h-2.5" /> Otomatis Blur Jika Mati
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Admin Pusat Checkbox */}
                      <td className="py-3 px-3 text-center align-middle">
                        <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localPermissions.admin_pusat[perm.key]}
                            onChange={() => handleToggle('admin_pusat', perm.key)}
                            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Admin Pabrik Checkbox */}
                      <td className="py-3 px-3 text-center align-middle">
                        <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localPermissions.admin_pabrik[perm.key]}
                            onChange={() => handleToggle('admin_pabrik', perm.key)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Kepala Pabrik Checkbox */}
                      <td className="py-3 px-3 text-center align-middle">
                        <label className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localPermissions.kepala_pabrik[perm.key]}
                            onChange={() => handleToggle('kepala_pabrik', perm.key)}
                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Perubahan checklist disimpan secara lokal di browser dan langsung berlaku secara realtime pada seluruh modul pabrik mie.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </div>
      </div>

      {/* Simulated WhatsApp Message View when Admin Approves Registration */}
      <WhatsAppChatModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        message={activeWaMessage}
      />
    </div>
  );
};
