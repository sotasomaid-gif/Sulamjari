import React from 'react';
import {
  X,
  User,
  ShieldCheck,
  Phone,
  CheckCircle2,
  Lock,
  Unlock,
  LogOut,
  FileSpreadsheet,
  Users,
  ExternalLink,
  Calendar,
  Key,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { UserAccount, UserRole, SystemPermissions } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';
import { formatDisplayPhone, getWhatsAppWebUrl } from '../utils/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  activeRole: UserRole;
  permissions?: SystemPermissions;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeRole,
  permissions,
  onLogout,
  onOpenAuthModal,
  onNavigateTab,
}) => {
  if (!isOpen || !currentUser) return null;

  const roleDef = ROLE_DEFINITIONS[currentUser.role] || ROLE_DEFINITIONS[activeRole];
  const userPerms = permissions ? permissions[currentUser.role] : null;
  const isAdminPusat = currentUser.role === 'admin_pusat';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6 transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <span>Informasi Akun Pegawai Pabrik Mie Sulamjari</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">Profil &amp; Hak Akses Pengguna</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Informasi lengkap kredensial akun, wewenang jabatan, dan status sensor privasi finansial.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* User Profile Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl ${roleDef.avatarBg} text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0 relative`}
                >
                  {currentUser.nama.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow-xs">
                    {currentUser.role === 'admin_pusat' ? '👑' : currentUser.role === 'admin_pabrik' ? '🏭' : '👷'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {currentUser.nama}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold text-white shadow-2xs ${
                        currentUser.role === 'admin_pusat'
                          ? 'bg-red-600'
                          : currentUser.role === 'admin_pabrik'
                          ? 'bg-blue-600'
                          : 'bg-amber-600'
                      }`}
                    >
                      {roleDef.title}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">({roleDef.subtitle})</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="sm:text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Akun Aktif &amp; Disetujui</span>
                </span>
                {currentUser.createdAt && (
                  <div className="text-[10px] text-slate-400 mt-1 flex sm:justify-end items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Terdaftar: {currentUser.createdAt}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/80 leading-relaxed">
              {roleDef.description}
            </p>
          </div>

          {/* Account Credentials & Contact Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-600" />
              <span>Kredensial &amp; Kontak WhatsApp</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Username */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Username Login
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block mt-0.5">
                  {currentUser.username || currentUser.noHp}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Digunakan untuk login ke sistem
                </span>
              </div>

              {/* WhatsApp Phone */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nomor WhatsApp Aktif
                  </span>
                  <a
                    href={getWhatsAppWebUrl(
                      currentUser.noHp,
                      `Halo ${currentUser.nama}, verifikasi akun sistem Pabrik Mie Sulamjari.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                    title="Buka Chat WhatsApp"
                  >
                    <span>Chat WA</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-800 font-mono block mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{formatDisplayPhone(currentUser.noHp)}</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Tujuan pengiriman kode verifikasi OTP
                </span>
              </div>
            </div>
          </div>

          {/* Financial Privacy & Blur Status */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-600" />
              <span>Sensor Privasi &amp; Akses Keuangan</span>
            </h4>
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isAdminPusat
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isAdminPusat ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {isAdminPusat ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs sm:text-sm">
                    {isAdminPusat ? 'Akses Penuh Tanpa Sensor (Pemilik)' : 'Sensor Blur Keuangan Aktif'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isAdminPusat
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {isAdminPusat ? '🔓 Full View' : '🔒 Sensor Blur'}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed text-slate-600">
                  {isAdminPusat
                    ? 'Sebagai Admin Pusat, Anda memiliki otoritas penuh untuk melihat seluruh omset harian, laba kotor, laba bersih, rincian biaya operasional dapur/mesin, serta harga kulakan bahan baku tanpa sensor.'
                    : 'Untuk menjaga kerahasiaan margin pabrik, data nominal omset total, keuntungan bersih, dan harga kulakan rahasia diburamkan (efek blur). Anda tetap dapat melihat stok fisik dan memproses operasional harian.'}
                </p>
              </div>
            </div>
          </div>

          {/* Privileges & Permissions List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Izin Fitur &amp; Wewenang Akun</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Kasir Penjualan &amp; Nota</span>
                <span className={`font-bold ${userPerms?.view_penjualan ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {userPerms?.view_penjualan ? '✓ Ya (Bisa)' : '✗ Dibatasi'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Pemakaian Stok Bahan Giling</span>
                <span className={`font-bold ${userPerms?.action_stok_keluar ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {userPerms?.action_stok_keluar ? '✓ Ya (Bisa)' : '✗ Dibatasi'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Biaya Operasional Pabrik</span>
                <span className={`font-bold ${userPerms?.view_operasional ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {userPerms?.view_operasional ? '✓ Ya (Bisa)' : '✗ Dibatasi'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Cetak Laporan / PDF</span>
                <span className={`font-bold ${userPerms?.action_cetak_laporan ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {userPerms?.action_cetak_laporan ? '✓ Ya (Bisa)' : '✗ Dibatasi'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Pengaturan Database Google Sheets</span>
                <span className={`font-bold ${isAdminPusat ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {isAdminPusat ? '✓ Khusus Admin Pusat' : '✗ Terkunci'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-700">Persetujuan Akun Pegawai Baru</span>
                <span className={`font-bold ${isAdminPusat ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {isAdminPusat ? '✓ Khusus Admin Pusat' : '✗ Terkunci'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Admin Navigation Shortcuts */}
          {isAdminPusat && (
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-red-900 block">
                👑 Pintasan Cepat Otoritas Admin Pusat:
              </span>
              <div className="flex flex-wrap gap-2">
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateTab('hak-akses');
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-red-100 text-red-800 border border-red-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-red-600" />
                    <span>Kelola Direktori Pegawai &amp; Hak Akses</span>
                    <ArrowRight className="w-3 h-3 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              Ganti Akun
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Keluar dari sesi ini"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Keluar (Logout)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
