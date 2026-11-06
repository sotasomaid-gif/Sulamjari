import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowDownUp,
  ClipboardList,
  Store,
  Wallet,
  PieChart,
  Printer,
  Download,
  PlusCircle,
  Wheat,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  Lock,
  LogOut,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import { UserRole, RolePermissionMap, UserAccount } from '../types';
import { ROLE_DEFINITIONS } from '../utils/rbac';
import { formatDisplayPhone, getPendingUsersCount } from '../utils/auth';

export type TabId = 
  | 'dashboard'
  | 'master-bahan'
  | 'stok-mutasi'
  | 'pemakaian'
  | 'penjualan'
  | 'operasional'
  | 'laba-rugi'
  | 'hak-akses';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onOpenModal: (type: 'masuk' | 'keluar' | 'penjualan' | 'operasional' | 'bahan' | 'print' | 'backup') => void;
  onOpenSheetsModal: () => void;
  sheetsConnected: boolean;
  lowStockCount: number;
  piutangCount: number;
  activeRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
  rolePermissions: RolePermissionMap;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenModal,
  onOpenSheetsModal,
  sheetsConnected,
  lowStockCount,
  piutangCount,
  activeRole,
  onSwitchRole,
  rolePermissions,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'dashboard' as TabId,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      isRestricted: !rolePermissions.view_dashboard,
    },
    {
      id: 'master-bahan' as TabId,
      label: 'Master Bahan',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount} tipis` : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      isRestricted: !rolePermissions.view_master_bahan,
    },
    {
      id: 'stok-mutasi' as TabId,
      label: 'Stok Masuk & Keluar',
      icon: ArrowDownUp,
      badge: null,
      isRestricted: !rolePermissions.view_stok_mutasi,
    },
    {
      id: 'pemakaian' as TabId,
      label: 'Pemakaian Harian',
      icon: ClipboardList,
      badge: null,
      isRestricted: !rolePermissions.view_pemakaian_harian,
    },
    {
      id: 'penjualan' as TabId,
      label: 'Penjualan Mie',
      icon: Store,
      badge: piutangCount > 0 ? `${piutangCount} piutang` : null,
      badgeColor: 'bg-red-100 text-red-800 border-red-300',
      isRestricted: !rolePermissions.view_penjualan,
    },
    {
      id: 'operasional' as TabId,
      label: 'Biaya Operasional',
      icon: Wallet,
      badge: null,
      isRestricted: !rolePermissions.view_operasional,
    },
    {
      id: 'laba-rugi' as TabId,
      label: 'Laporan Laba Rugi',
      icon: PieChart,
      badge: null,
      isRestricted: !rolePermissions.view_laba_rugi,
    },
    ...(activeRole === 'admin_pusat'
      ? [
          {
            id: 'hak-akses' as TabId,
            label: 'Hak Akses',
            icon: ShieldCheck,
            badge: getPendingUsersCount() > 0 ? `${getPendingUsersCount()} Persetujuan` : 'RBAC',
            badgeColor: getPendingUsersCount() > 0 ? 'bg-amber-500 text-white font-black animate-pulse' : 'bg-red-100 text-red-800 border-red-200',
            isRestricted: false,
          },
        ]
      : []),
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Bar: Brand, Role Switcher & Quick Action Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-500/20 ring-2 ring-red-100">
              <Wheat className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  PABRIK MIE <span className="text-red-600">SULAMJARI</span>
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Produksi Aktif
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium hidden sm:block">
                Manajemen Keuangan, Stok Bahan &amp; Penjualan Harian
              </p>
            </div>
          </div>

          {/* Center-Right: Role Switcher & Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* User Role Switcher Dropdown */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800 transition-all text-xs font-semibold shadow-2xs"
                title="Ganti Peran Pengguna Aktif"
              >
                <div
                  className={`w-5 h-5 rounded-md ${ROLE_DEFINITIONS[activeRole].avatarBg} text-white flex items-center justify-center text-[10px] font-bold`}
                >
                  {activeRole === 'admin_pusat'
                    ? '👑'
                    : activeRole === 'admin_pabrik'
                    ? '🏭'
                    : '👷'}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-bold block leading-none text-slate-900">
                    {ROLE_DEFINITIONS[activeRole].title}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in-50 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Peran Pengguna Aktif:
                    </span>
                    <span className="text-xs text-slate-600 block mt-0.5">
                      Ganti peran untuk menguji tampilan &amp; sensor blur data.
                    </span>
                  </div>

                  <div className="p-1 space-y-1">
                    {(['admin_pusat', 'admin_pabrik', 'kepala_pabrik'] as UserRole[]).map(
                      (r) => {
                        const info = ROLE_DEFINITIONS[r];
                        const isSelected = activeRole === r;
                        return (
                          <button
                            key={r}
                            onClick={() => {
                              onSwitchRole(r);
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                              isSelected
                                ? 'bg-red-50 text-red-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg ${info.avatarBg} text-white flex items-center justify-center text-xs shrink-0`}
                            >
                              {r === 'admin_pusat'
                                ? '👑'
                                : r === 'admin_pabrik'
                                ? '🏭'
                                : '👷'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate">{info.title}</span>
                                {isSelected && (
                                  <span className="text-[10px] text-red-600 font-bold">
                                    Aktif
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {info.subtitle}
                              </span>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="p-1 pt-1 border-t border-slate-100">
                    {activeRole === 'admin_pusat' ? (
                      <button
                        onClick={() => {
                          setActiveTab('hak-akses');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs text-red-700 hover:bg-red-50 font-bold transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Pengaturan Hak Akses (Matrix)</span>
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-[11px] text-slate-400 flex items-center gap-1.5 italic bg-slate-50 rounded-xl">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Hak Akses dikunci khusus Admin Pusat</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

            {/* Quick Action Buttons (Protected by permissions) */}
            {rolePermissions.action_stok_keluar && (
              <button
                onClick={() => onOpenModal('keluar')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors border border-slate-200"
                title="Catat pemakaian bahan untuk produksi"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Pakai</span> Bahan
              </button>
            )}

            {rolePermissions.action_tambah_penjualan && (
              <button
                onClick={() => onOpenModal('penjualan')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shadow-xs"
                title="Catat order penjualan mie ke pelanggan"
              >
                <PlusCircle className="w-3.5 h-3.5 text-white" />
                <span>+ Order Mie</span>
              </button>
            )}

            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

            {rolePermissions.action_cetak_laporan && (
              <button
                onClick={() => onOpenModal('print')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Cetak Laporan / PDF"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">Cetak</span>
              </button>
            )}

            {rolePermissions.action_ekspor_backup && (
              <button
                onClick={() => onOpenModal('backup')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Cadangan Data & File Mandiri"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">Cadangan</span>
              </button>
            )}

            {/* Google Sheets & Apps Script Database Connector Button */}
            <button
              onClick={onOpenSheetsModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border shadow-2xs ${
                sheetsConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-300'
              }`}
              title="Database Google Spreadsheet & Apps Script (Semua Modul Terkoneksi)"
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetsConnected ? 'text-emerald-600' : 'text-emerald-700'}`} />
              <span className="hidden md:inline">Google Sheets</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  sheetsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
                title={sheetsConnected ? 'Terkoneksi ke Cloud Sheets' : 'Koneksi Manual / Belum Aktif'}
              ></span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* User Session Profile & Logout / Switch Account */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all"
                  title="Klik untuk ganti akun atau daftar baru"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {currentUser.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block min-w-0 pr-1">
                    <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                      {currentUser.nama}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span>WA: {formatDisplayPhone(currentUser.noHp)}</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                  title="Keluar / Logout dari Sesi"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Masuk / Daftar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 sm:space-x-2 py-1.5 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-red-50 text-red-700 border border-red-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-red-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
                {item.isRestricted && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200"
                    title="Data halaman ini di-blur untuk peran Anda"
                  >
                    <Lock className="w-2.5 h-2.5 text-slate-400" />
                    <span>Blur</span>
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
