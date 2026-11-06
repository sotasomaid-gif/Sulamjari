import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  PlusCircle,
  Truck,
  Flame,
  CheckCircle2,
  Clock,
  Boxes,
  ChevronRight,
  Download,
  Target,
  Trophy,
  Sparkles,
  Sliders,
  Check,
  BellRing,
  Layers,
  Filter,
  ShieldAlert,
  Info,
  Receipt,
  Coins,
  Wallet,
  Lock,
  BarChart3,
  Calendar,
  TrendingDown,
  FileSpreadsheet,
  Hourglass,
  UserCheck,
  Eye,
  EyeOff,
  Copy,
  MessageCircle,
  X,
  Key,
  Users,
  UserPlus,
  RefreshCw,
  Zap,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  BahanBaku,
  MutasiStok,
  PenjualanMie,
  BiayaOperasional,
  UserRole,
  RolePermissionMap,
  UserAccount,
} from '../types';
import { formatRupiah, formatNumber, formatDateIndo, exportPenjualanCSV } from '../utils/storage';
import { ROLE_DEFINITIONS } from '../utils/rbac';
import {
  getPendingUsersCount,
  getStoredUsers,
  saveStoredUsers,
  formatDisplayPhone,
  normalizePhoneNumber,
  getWhatsAppWebUrl,
  fetchUsersFromServer,
  registerUserOnServer,
  seedDemoUserOnServer,
} from '../utils/auth';
import { syncUserRecordToSheets } from '../utils/googleSheetsSync';
import { BlurMask } from './BlurMask';

interface DashboardTabProps {
  bahanList: BahanBaku[];
  mutasiList: MutasiStok[];
  penjualanList: PenjualanMie[];
  operasionalList: BiayaOperasional[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenModal: (type: 'masuk' | 'keluar' | 'penjualan' | 'operasional' | 'bahan') => void;
  onOpenSheetsModal?: () => void;
  targetProduksiKg: number;
  onUpdateTargetProduksi: (newTarget: number) => void;
  onTriggerTargetToast: (currentKg: number, targetKg: number) => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  usersList?: UserAccount[];
  onApproveUser?: (userId: string) => void;
  onRejectUser?: (userId: string) => void;
  currentUser?: UserAccount | null;
  onUserRegistered?: (user: UserAccount) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  bahanList,
  mutasiList,
  penjualanList,
  operasionalList,
  selectedDate,
  onSelectDate,
  onNavigateTab,
  onOpenModal,
  onOpenSheetsModal,
  targetProduksiKg,
  onUpdateTargetProduksi,
  onTriggerTargetToast,
  activeRole = 'admin_pusat',
  rolePermissions,
  usersList,
  onApproveUser,
  onRejectUser,
  currentUser,
  onUserRegistered,
}) => {
  // Reactive Users & Approval State
  const [internalUsers, setInternalUsers] = useState<UserAccount[]>(getStoredUsers);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Employee Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newRegNama, setNewRegNama] = useState('');
  const [newRegPhone, setNewRegPhone] = useState('');
  const [newRegRole, setNewRegRole] = useState<UserRole>('admin_pabrik');
  const [newRegPassword, setNewRegPassword] = useState('');
  const [showNewRegPassword, setShowNewRegPassword] = useState(false);
  const [newRegError, setNewRegError] = useState<string | null>(null);

  const refreshDashboardUsers = () => {
    fetchUsersFromServer().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setInternalUsers(fresh);
      }
    });
  };

  useEffect(() => {
    if (usersList && usersList.length > 0) {
      setInternalUsers(usersList);
    } else {
      fetchUsersFromServer().then((fresh) => {
        if (fresh && fresh.length > 0) {
          setInternalUsers(fresh);
        }
      });
    }
  }, [usersList]);

  useEffect(() => {
    const handleSync = () => {
      refreshDashboardUsers();
    };
    window.addEventListener('sulamjari-users-updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    // Poll every 3 seconds to ensure instant sync across all devices and tabs
    const interval = setInterval(handleSync, 3000);
    return () => {
      window.removeEventListener('sulamjari-users-updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, []);

  const activeUsersList = (usersList && usersList.length > 0) ? usersList : internalUsers;
  const pendingUsers = useMemo(() => {
    return activeUsersList.filter((u) => u.statusPersetujuan === 'MENUNGGU_PERSETUJUAN');
  }, [activeUsersList]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Handler: Admin Pusat Daftarkan Akun Pegawai Baru Secara Langsung dari Dashboard (Server Synced)
  const handleCreateNewRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewRegError(null);

    const namaTrim = newRegNama.trim();
    if (!namaTrim) {
      setNewRegError('Nama lengkap pegawai wajib diisi.');
      return;
    }

    const cleanPhone = normalizePhoneNumber(newRegPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
      setNewRegError('Nomor HP / WhatsApp tidak valid. Contoh: 08123456789.');
      return;
    }

    if (!newRegPassword || newRegPassword.length < 6) {
      setNewRegError('Password minimal 6 karakter.');
      return;
    }

    const res = await registerUserOnServer({
      nama: namaTrim,
      noHp: cleanPhone,
      password: newRegPassword,
      role: newRegRole,
    });

    if (!res.success) {
      setNewRegError(res.message);
      return;
    }

    const newUser = res.user!;
    syncUserRecordToSheets(newUser, getStoredUsers(), 'Admin Pusat Dashboard');

    refreshDashboardUsers();
    if (onUserRegistered) {
      onUserRegistered(newUser);
    }

    // Reset Form
    setNewRegNama('');
    setNewRegPhone('');
    setNewRegPassword('');
    setIsRegisterModalOpen(false);
  };

  // Handler: Buat Contoh Registrasi Simulasi untuk Uji Coba Cepat Persetujuan (Server Synced)
  const handleSeedDemoRegistration = async () => {
    const res = await seedDemoUserOnServer();
    if (res.user) {
      refreshDashboardUsers();
      if (onUserRegistered) {
        onUserRegistered(res.user);
      }
    }
  };

  // Filter for selected date
  const todayPenjualan = penjualanList.filter((p) => p.tanggal === selectedDate);
  const todayPemakaian = mutasiList.filter((m) => m.tanggal === selectedDate && m.tipe === 'KELUAR');
  const todayStokMasuk = mutasiList.filter((m) => m.tanggal === selectedDate && m.tipe === 'MASUK');
  const todayOperasional = operasionalList.filter((o) => o.tanggal === selectedDate);

  // Financial metrics for selected date
  const totalOmset = todayPenjualan.reduce((acc, curr) => acc + curr.totalOmset, 0);
  const totalKgTerjual = todayPenjualan.reduce((acc, curr) => acc + curr.jumlahKg, 0);
  const totalBiayaBahan = todayPemakaian.reduce((acc, curr) => acc + curr.totalBiaya, 0);
  const totalBiayaOps = todayOperasional.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalPengeluaran = totalBiayaBahan + totalBiayaOps;
  const estimasiLabaBersih = totalOmset - totalPengeluaran;
  const labaKotor = totalOmset - totalBiayaBahan;
  const totalNilaiAsetStok = bahanList.reduce((acc, curr) => acc + (curr.stokTersedia * (curr.hargaSatuan || 0)), 0);

  // Cumulative & breakdown financial stats for summary widgets
  const allTimeOmset = penjualanList.reduce((acc, curr) => acc + curr.totalOmset, 0);
  const allTimeKgTerjual = penjualanList.reduce((acc, curr) => acc + curr.jumlahKg, 0);
  const allTimeBiayaOps = operasionalList.reduce((acc, curr) => acc + curr.nominal, 0);
  const allTimeBiayaBahan = mutasiList
    .filter((m) => m.tipe === 'KELUAR')
    .reduce((acc, curr) => acc + curr.totalBiaya, 0);
  const allTimeLabaBersih = allTimeOmset - (allTimeBiayaBahan + allTimeBiayaOps);

  const avgOmsetPerKg = totalKgTerjual > 0 ? Math.round(totalOmset / totalKgTerjual) : 0;
  const todayLunasOmset = todayPenjualan
    .filter((p) => p.statusPembayaran === 'LUNAS')
    .reduce((acc, curr) => acc + curr.totalOmset, 0);
  const todayPiutangOmset = todayPenjualan
    .filter((p) => p.statusPembayaran !== 'LUNAS')
    .reduce((acc, curr) => acc + curr.totalOmset, 0);

  // Group today's operational costs by category
  const todayOpsByCategory = todayOperasional.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.kategori] = (acc[curr.kategori] || 0) + curr.nominal;
    return acc;
  }, {});
  const sortedTodayOpsCategories = Object.entries(todayOpsByCategory).sort((a, b) => b[1] - a[1]);

  // Target Produksi Calculation
  const persentaseTarget = targetProduksiKg > 0 ? Math.round((totalKgTerjual / targetProduksiKg) * 100) : 0;
  const isTargetReached = totalKgTerjual >= targetProduksiKg && targetProduksiKg > 0;
  const sisaKgTarget = Math.max(0, targetProduksiKg - totalKgTerjual);
  const surplusKgTarget = Math.max(0, totalKgTerjual - targetProduksiKg);

  // Target Editing State
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTargetInput, setTempTargetInput] = useState(String(targetProduksiKg));

  useEffect(() => {
    setTempTargetInput(String(targetProduksiKg));
  }, [targetProduksiKg]);

  // Track dates where notification has fired in this session to prevent spam
  const notifiedDatesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isTargetReached && !notifiedDatesRef.current.has(selectedDate)) {
      notifiedDatesRef.current.add(selectedDate);
      onTriggerTargetToast(totalKgTerjual, targetProduksiKg);
    }
  }, [selectedDate, isTargetReached, totalKgTerjual, targetProduksiKg, onTriggerTargetToast]);

  const handleSaveCustomTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(tempTargetInput);
    if (val > 0) {
      onUpdateTargetProduksi(val);
      setIsEditingTarget(false);
    }
  };

  // Unpaid receivable count & sum
  const piutangList = penjualanList.filter((p) => p.statusPembayaran !== 'LUNAS');
  const totalNominalPiutang = piutangList.reduce((acc, curr) => acc + curr.totalOmset, 0);

  // Low stock items
  const lowStockItems = bahanList.filter((b) => b.stokTersedia <= b.minStok);

  // Stock comparison horizontal chart state
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('SEMUA');
  const [stockOnlyAlerts, setStockOnlyAlerts] = useState<boolean>(false);
  const [stockSortBy, setStockSortBy] = useState<'kritis' | 'nama' | 'stok'>('kritis');

  const stockCategories = ['SEMUA', ...Array.from(new Set(bahanList.map((b) => b.kategori)))];

  const processedStockData = bahanList
    .filter((b) => {
      if (stockCategoryFilter !== 'SEMUA' && b.kategori !== stockCategoryFilter) {
        return false;
      }
      if (stockOnlyAlerts && b.stokTersedia > b.minStok) {
        return false;
      }
      return true;
    })
    .map((b) => {
      const isDefisit = b.stokTersedia <= b.minStok;
      const isWarning = !isDefisit && b.stokTersedia <= b.minStok * 1.5;
      const rasio = b.minStok > 0 ? (b.stokTersedia / b.minStok) * 100 : 100;
      return {
        id: b.id,
        displayName: b.nama.length > 18 ? b.nama.slice(0, 16) + '…' : b.nama,
        fullName: b.nama,
        kategori: b.kategori,
        satuan: b.satuan,
        merk: b.merk,
        stokTersedia: b.stokTersedia,
        minStok: b.minStok,
        isDefisit,
        isWarning,
        rasio,
        defisit: Math.max(0, b.minStok - b.stokTersedia),
        surplus: Math.max(0, b.stokTersedia - b.minStok),
      };
    })
    .sort((a, b) => {
      if (stockSortBy === 'kritis') {
        return a.rasio - b.rasio;
      }
      if (stockSortBy === 'nama') {
        return a.fullName.localeCompare(b.fullName);
      }
      return b.stokTersedia - a.stokTersedia;
    });

  const chartHeight = Math.max(280, Math.min(680, processedStockData.length * 44 + 40));

  // Weekly Trend Visualizations State
  const [weeklyRange, setWeeklyRange] = useState<'4' | '8' | '12' | 'all'>('8');

  // Compute Weekly Aggregated Data for Penjualan (Kg) and Biaya Operasional (Rp)
  const weeklyTrendData = useMemo(() => {
    // Reference date: selectedDate or current date
    let refDate = new Date();
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        refDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }

    const getMonday = (d: Date): Date => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    };

    const formatYMD = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const indoMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonday = getMonday(refDate);

    // Collect all dates to find earliest if 'all' is chosen
    const allDates: string[] = [];
    penjualanList.forEach((p) => allDates.push(p.tanggal));
    operasionalList.forEach((o) => allDates.push(o.tanggal));
    if (selectedDate) allDates.push(selectedDate);

    let numWeeks = weeklyRange === '4' ? 4 : weeklyRange === '8' ? 8 : weeklyRange === '12' ? 12 : 12;

    if (weeklyRange === 'all') {
      let earliestTime = currentMonday.getTime();
      allDates.forEach((dStr) => {
        const parts = dStr.split('-').map(Number);
        if (parts.length === 3) {
          const t = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
          if (!isNaN(t) && t < earliestTime) {
            earliestTime = t;
          }
        }
      });
      const diffDays = Math.ceil((currentMonday.getTime() - earliestTime) / (1000 * 60 * 60 * 24));
      const calculatedWeeks = Math.ceil(diffDays / 7) + 1;
      numWeeks = Math.min(26, Math.max(6, calculatedWeeks));
    }

    const buckets: Array<{
      weekKey: string;
      label: string;
      shortLabel: string;
      startStr: string;
      endStr: string;
    }> = [];

    for (let i = numWeeks - 1; i >= 0; i--) {
      const mon = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - i * 7);
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      const startStr = formatYMD(mon);
      const endStr = formatYMD(sun);

      const startMonthName = indoMonths[mon.getMonth()];
      const endMonthName = indoMonths[sun.getMonth()];

      const label = startMonthName === endMonthName
        ? `${mon.getDate()} - ${sun.getDate()} ${startMonthName}`
        : `${mon.getDate()} ${startMonthName} - ${sun.getDate()} ${endMonthName}`;

      const shortLabel = `${mon.getDate()} ${startMonthName}`;

      buckets.push({
        weekKey: startStr,
        label,
        shortLabel,
        startStr,
        endStr,
      });
    }

    return buckets.map((b) => {
      let totalKg = 0;
      let totalOmset = 0;
      let penjualanCount = 0;

      penjualanList.forEach((p) => {
        if (p.tanggal >= b.startStr && p.tanggal <= b.endStr) {
          totalKg += p.jumlahKg;
          totalOmset += p.totalOmset;
          penjualanCount++;
        }
      });

      let totalBiayaOps = 0;
      let opsCount = 0;
      const opsBreakdown: Record<string, number> = {};

      operasionalList.forEach((o) => {
        if (o.tanggal >= b.startStr && o.tanggal <= b.endStr) {
          totalBiayaOps += o.nominal;
          opsCount++;
          opsBreakdown[o.kategori] = (opsBreakdown[o.kategori] || 0) + o.nominal;
        }
      });

      let topOpsCategory = '-';
      let maxNom = 0;
      Object.entries(opsBreakdown).forEach(([k, val]) => {
        if (val > maxNom) {
          maxNom = val;
          topOpsCategory = k;
        }
      });

      const avgHargaPerKg = totalKg > 0 ? Math.round(totalOmset / totalKg) : 0;

      return {
        weekKey: b.weekKey,
        label: b.label,
        shortLabel: b.shortLabel,
        startStr: b.startStr,
        endStr: b.endStr,
        totalKg,
        totalOmset,
        totalBiayaOps,
        penjualanCount,
        opsCount,
        avgHargaPerKg,
        topOpsCategory,
        opsBreakdown,
      };
    });
  }, [penjualanList, operasionalList, selectedDate, weeklyRange]);

  // Aggregate metrics for weekly trend cards
  const totalRangeKg = weeklyTrendData.reduce((acc, w) => acc + w.totalKg, 0);
  const avgRangeKg = weeklyTrendData.length > 0 ? Math.round(totalRangeKg / weeklyTrendData.length) : 0;
  const peakRangeKg = Math.max(...weeklyTrendData.map((w) => w.totalKg), 0);

  const totalRangeOps = weeklyTrendData.reduce((acc, w) => acc + w.totalBiayaOps, 0);
  const avgRangeOps = weeklyTrendData.length > 0 ? Math.round(totalRangeOps / weeklyTrendData.length) : 0;
  const peakRangeOps = Math.max(...weeklyTrendData.map((w) => w.totalBiayaOps), 0);

  // Overall top ops category in range
  const allRangeOpsCatBreakdown: Record<string, number> = {};
  weeklyTrendData.forEach((w) => {
    Object.entries(w.opsBreakdown).forEach(([cat, nom]) => {
      allRangeOpsCatBreakdown[cat] = (allRangeOpsCatBreakdown[cat] || 0) + nom;
    });
  });
  const sortedOverallOpsCats = Object.entries(allRangeOpsCatBreakdown).sort((a, b) => b[1] - a[1]);
  const overallTopOpsCategory = sortedOverallOpsCats.length > 0 ? sortedOverallOpsCats[0][0] : 'Operasional';

  // Week-over-week trends (latest week vs previous week)
  const latestWeek = weeklyTrendData[weeklyTrendData.length - 1];
  const prevWeek = weeklyTrendData.length > 1 ? weeklyTrendData[weeklyTrendData.length - 2] : null;

  const salesTrendDiff = prevWeek ? latestWeek.totalKg - prevWeek.totalKg : 0;
  const salesTrendDiffPct = prevWeek && prevWeek.totalKg > 0
    ? Math.round((salesTrendDiff / prevWeek.totalKg) * 100)
    : 0;

  const opsTrendDiff = prevWeek ? latestWeek.totalBiayaOps - prevWeek.totalBiayaOps : 0;
  const opsTrendDiffPct = prevWeek && prevWeek.totalBiayaOps > 0
    ? Math.round((opsTrendDiff / prevWeek.totalBiayaOps) * 100)
    : 0;

  // Permission flags (default to true if rolePermissions not provided)
  const canViewDashboard = rolePermissions ? rolePermissions.view_dashboard : true;

  // Primary check for sensitive financial figures: 'lihat_keuangan' check using activeRole and rolePermissions
  const hasLihatKeuanganPermission = rolePermissions
    ? (rolePermissions.lihat_keuangan !== undefined
        ? Boolean(rolePermissions.lihat_keuangan)
        : Boolean(rolePermissions.view_omset_keuangan ?? (activeRole === 'admin_pusat')))
    : (activeRole === 'admin_pusat' || activeRole === 'admin_pabrik');

  const canViewKeuangan = hasLihatKeuanganPermission;
  const canViewOmset = canViewKeuangan && (rolePermissions ? rolePermissions.view_omset_keuangan : true);
  const canViewHargaBeli = rolePermissions ? rolePermissions.view_harga_beli_bahan : true;
  const canViewPiutang = rolePermissions ? rolePermissions.view_piutang : true;
  const canViewOperasional = canViewKeuangan && (rolePermissions ? rolePermissions.view_operasional : true);
  const canAturTarget = rolePermissions ? rolePermissions.action_atur_target : true;
  const canAddPenjualan = rolePermissions ? rolePermissions.action_tambah_penjualan : true;
  const canAddKeluar = rolePermissions ? rolePermissions.action_stok_keluar : true;
  const canAddMasuk = rolePermissions ? rolePermissions.action_stok_masuk : true;
  const canAddOps = rolePermissions ? rolePermissions.action_tambah_operasional : true;
  const canKelolaAkses = rolePermissions ? rolePermissions.action_kelola_akses : (activeRole === 'admin_pusat');

  if (!canViewDashboard) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        onGoToSettings={() => onNavigateTab('hak-akses')}
        title="Ringkasan Dashboard Dibatasi"
        reason="Peran Anda belum diberikan izin untuk melihat ringkasan operasional dashboard."
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h2 className="text-xl font-bold">Ringkasan Operasional Pabrik Mie</h2>
          <p className="text-sm text-slate-500 mt-2">Omset Harian, Produksi, dan Status Keuangan</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Date Selector & Greetings */}
      <div className="bg-gradient-to-r from-red-800 via-rose-700 to-amber-700 rounded-2xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative noodle pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-72 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:16px_16px]"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-amber-200 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Operasional Produksi &amp; Kasir Pabrik
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ringkasan Harian Pabrik Mie
            </h1>
            <p className="text-xs sm:text-sm text-red-100 mt-1 max-w-xl">
              Pantau arus bahan baku giling, biaya operasional dapur &amp; mesin, serta perputaran omset penjualan mie pelanggan secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenSheetsModal && (
              <button
                onClick={onOpenSheetsModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors border border-emerald-400/30"
                title="Buka panel koneksi & sinkronisasi Google Spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">Database Sheets</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              </button>
            )}

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/20 flex items-center gap-2.5">
              <span className="text-xs font-medium text-red-100">Pilih Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="bg-white text-slate-900 text-xs sm:text-sm font-semibold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-amber-400 border border-slate-200"
              />
            </div>
            <button
              onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 transition-colors shadow-xs"
            >
              Hari Ini
            </button>
          </div>
        </div>
      </div>

      {/* Admin Pusat: Panel Persetujuan Pendaftaran Akun Pegawai & Database Kredensial */}
      {(activeRole === 'admin_pusat' || currentUser?.role === 'admin_pusat') && (
        <div className="space-y-3 animate-in fade-in">
          {pendingUsers.length > 0 ? (
            <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-white border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
              {/* Alert Header with Direct Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Hourglass className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <span>Persetujuan Pendaftaran Akun Pegawai ({pendingUsers.length})</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500 text-white font-bold animate-pulse">
                        Perlu Persetujuan
                      </span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pendaftar baru belum menerima kode OTP WhatsApp sebelum Anda setujui. Periksa data kredensial di bawah ini:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Daftarkan akun pegawai baru langsung dari dashboard"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Daftarkan Pegawai</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSeedDemoRegistration}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Buat 1 contoh pendaftaran baru untuk menguji alur persetujuan & OTP"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Uji Pendaftaran</span>
                  </button>

                  <button
                    type="button"
                    onClick={refreshDashboardUsers}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    title="Segarkan data pendaftaran dari database"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden md:inline">Segarkan</span>
                  </button>
                </div>
              </div>

              {/* Cards Grid of Pending Applicants */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingUsers.map((user) => {
                  const isPasswordRevealed = !!revealedPasswords[user.id];
                  const isCopiedU = copiedKey === 'u-' + user.id;
                  const isCopiedP = copiedKey === 'p-' + user.id;
                  const roleDef = ROLE_DEFINITIONS[user.role] || { title: user.role };

                  return (
                    <div
                      key={user.id}
                      className="bg-white rounded-xl border border-amber-200 shadow-xs p-4 flex flex-col justify-between hover:border-amber-400 transition-all"
                    >
                      <div>
                        {/* Applicant Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0">
                              {user.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm leading-tight">
                                {user.nama}
                              </div>
                              <span
                                className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  user.role === 'admin_pabrik'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {roleDef.title}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono">
                            {user.createdAt || 'Baru Saja'}
                          </span>
                        </div>

                        {/* Stored Credentials Box */}
                        <div className="mt-3 bg-slate-50/90 rounded-lg p-2.5 border border-slate-200/80 space-y-2 text-xs">
                          {/* Username */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              Username:
                            </span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                              <span>{user.username || user.noHp}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(user.username || user.noHp, 'u-' + user.id)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                title="Salin Username"
                              >
                                {isCopiedU ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* WhatsApp */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                              WhatsApp:
                            </span>
                            <span className="font-mono text-slate-700 font-semibold">
                              {formatDisplayPhone(user.noHp)}
                            </span>
                          </div>

                          {/* Password */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                              <Key className="w-3.5 h-3.5 text-amber-500" />
                              Password:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {isPasswordRevealed ? user.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                title={isPasswordRevealed ? 'Sembunyikan' : 'Lihat Password'}
                              >
                                {isPasswordRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyText(user.password, 'p-' + user.id)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                title="Salin Password"
                              >
                                {isCopiedP ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Direct Approval & WhatsApp Web Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onApproveUser && onApproveUser(user.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Setujui pendaftaran dan buat kode OTP WhatsApp"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Setujui &amp; Kirim OTP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectUser && onRejectUser(user.id)}
                            className="bg-white hover:bg-rose-50 text-rose-700 font-semibold py-2 px-3 rounded-lg text-xs transition-colors border border-rose-200 hover:border-rose-300 flex items-center justify-center gap-1 cursor-pointer"
                            title="Tolak Pendaftaran"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>

                        {/* Direct WhatsApp Web Action Link */}
                        <a
                          href={getWhatsAppWebUrl(
                            user.noHp,
                            `Halo *${user.nama}*! 👋\n\nPendaftaran akun Anda di *Sistem Manajemen Pabrik Mie Sulamjari* sebagai *${roleDef?.title || user.role}* telah *DISETUJUI* oleh Admin Pusat. ✅\n\nNomor WhatsApp / Username: *${user.username || user.noHp}*\n${user.lastOtp ? `Kode Verifikasi OTP: *${user.lastOtp}*\n` : ''}\nSilakan login ke aplikasi.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#075E54] border border-emerald-300 text-xs font-bold transition-all cursor-pointer"
                          title="Klik untuk membuka chat WhatsApp Web langsung dengan nomor pendaftar"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kirim via WhatsApp Web Langsung</span>
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span>Persetujuan Pendaftaran Pegawai: Semua Beres</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      0 Antrean
                    </span>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Tidak ada antrean permohonan pendaftaran yang tertunda saat ini. Anda dapat mendaftarkan akun pegawai baru kapan saja atau melakukan uji coba simulasi.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Daftarkan Pegawai</span>
                </button>

                <button
                  type="button"
                  onClick={handleSeedDemoRegistration}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Tambahkan 1 data pendaftaran simulasi untuk menguji alur persetujuan"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Uji Simulasi Pendaftaran</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('hak-akses')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Direktori Pegawai</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* Modal Formulir Daftarkan Akun Pegawai Baru Langsung dari Dashboard */}
          {isRegisterModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transition-all">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base leading-tight">
                        Daftarkan Akun Pegawai Baru
                      </h3>
                      <p className="text-[11px] text-red-100">
                        Pabrik Mie Sulamjari — Langsung Masuk Antrean Persetujuan
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterModalOpen(false);
                      setNewRegError(null);
                    }}
                    className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateNewRegistration} className="p-5 space-y-3.5 text-xs">
                  {newRegError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{newRegError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Lengkap Pegawai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRegNama}
                      onChange={(e) => setNewRegNama(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nomor HP Aktif (WhatsApp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newRegPhone}
                      onChange={(e) => setNewRegPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Nomor ini akan menjadi username login dan tujuan pengiriman kode OTP WA.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pilih Role Model Pegawai <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRegRole('admin_pabrik')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          newRegRole === 'admin_pabrik'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-400/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">Admin Pabrik</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Kasir, Nota &amp; Stok</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewRegRole('kepala_pabrik')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          newRegRole === 'kepala_pabrik'
                            ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-400/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">Kepala Pabrik</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Mandor Giling &amp; Mesin</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Password Login <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewRegPassword ? 'text' : 'password'}
                        value={newRegPassword}
                        onChange={(e) => setNewRegPassword(e.target.value)}
                        placeholder="Minimal 6 karakter (contoh: pegawai123)"
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewRegPassword(!showNewRegPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                    ℹ️ Akun yang didaftarkan akan langsung masuk ke antrean <strong>Persetujuan Pendaftaran Akun Pegawai</strong> di atas agar Admin Pusat dapat menyetujui dan memverifikasi pengiriman kode OTP WhatsApp.
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterModalOpen(false);
                        setNewRegError(null);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Daftarkan Sekarang
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target Produksi Harian Card Widget */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border transition-all ${
          isTargetReached
            ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border-emerald-400 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-300'
            : 'bg-white border-slate-200 shadow-xs hover:border-amber-300'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isTargetReached
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isTargetReached ? (
                <Trophy className="w-6 h-6 animate-bounce" />
              ) : (
                <Target className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Target Produksi &amp; Penjualan Harian
                </h2>
                {isTargetReached ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                    TARGET TERCAPAI ({persentaseTarget}%)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Progres: {persentaseTarget}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isTargetReached
                  ? `🎉 Luar biasa! Total order ${formatNumber(totalKgTerjual)} Kg berhasil melampaui kuota target harian (${formatNumber(targetProduksiKg)} Kg) untuk ${formatDateIndo(selectedDate)}.`
                  : `Total ${formatNumber(totalKgTerjual)} Kg terjual dari target harian ${formatNumber(targetProduksiKg)} Kg (Sisa ${formatNumber(sisaKgTarget)} Kg untuk mencapai target).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => onTriggerTargetToast(totalKgTerjual, targetProduksiKg)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Periksa dan bunyikan notifikasi status target saat ini"
            >
              <BellRing className="w-3.5 h-3.5 text-slate-600" />
              <span>Cek Notifikasi</span>
            </button>
            {canAturTarget && (
              <button
                onClick={() => setIsEditingTarget(!isEditingTarget)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-300 shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>{isEditingTarget ? 'Tutup Pengaturan' : 'Ubah Target'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Edit Target Inline Form */}
        {isEditingTarget && canAturTarget && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 bg-slate-50/80 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 rounded-b-2xl">
            <form onSubmit={handleSaveCustomTarget} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Atur Target Kapasitas Produksi (Kg / Hari):
                </span>
                <span className="text-[11px] text-slate-500">
                  Target ini digunakan untuk memantau pemenuhan kapasitas mesin &amp; pesanan pelanggan.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Presets */}
                <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-lg text-xs font-semibold">
                  {[100, 150, 200, 250].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setTempTargetInput(String(preset));
                        onUpdateTargetProduksi(preset);
                        setIsEditingTarget(false);
                      }}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        targetProduksiKg === preset
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset} Kg
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={tempTargetInput}
                    onChange={(e) => setTempTargetInput(e.target.value)}
                    className="w-20 px-2 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold text-slate-600">Kg</span>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors shadow-2xs"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Progress Bar & Details */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-700">
              Realisasi: <strong className={isTargetReached ? 'text-emerald-700' : 'text-slate-900'}>{formatNumber(totalKgTerjual)} Kg</strong>
              {' '}/ Target: <strong className="text-slate-600">{formatNumber(targetProduksiKg)} Kg</strong>
            </span>
            <span className={isTargetReached ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
              {persentaseTarget}% {isTargetReached ? '• TERCAPAI' : `(Kurang ${formatNumber(sisaKgTarget)} Kg)`}
            </span>
          </div>

          {/* Bar track */}
          <div className="w-full h-3.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5 relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                isTargetReached
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600'
              }`}
              style={{ width: `${Math.min(100, persentaseTarget)}%` }}
            >
              {isTargetReached && (
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Basis perhitungan: Total order penjualan mie masuk pada tanggal {formatDateIndo(selectedDate)}
            </span>
            {isTargetReached ? (
              <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                ✓ Surplus produksi: +{formatNumber(surplusKgTarget)} Kg mie (
                <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                  {formatRupiah(surplusKgTarget * 22000)}
                </BlurMask>{' '}
                est. nilai lebih)
              </span>
            ) : (
              <span className="font-semibold text-amber-700">
                Memerlukan {formatNumber(sisaKgTarget)} Kg order lagi
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUMMARY WIDGETS: RINGKASAN STATISTIK (OMSET, BIAYA, STOK, LABA)           */}
      {/* Grid Responsif Modern & Indikator Visual Konten Dibatasi                  */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Permission Notice Banner when 'lihat_keuangan' is disabled */}
        {!canViewKeuangan && (
          <div className="bg-amber-50/95 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-200/80 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-amber-950">Mode Pembatasan Finansial:</span>{' '}
                <span className="text-amber-900">
                  Peran <strong className="font-bold underline">{ROLE_DEFINITIONS[activeRole]?.title || activeRole}</strong> tidak memiliki izin <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono text-[11px] font-bold text-amber-900">lihat_keuangan</code>. Nilai rupiah omset dan biaya tetap tercatat di sistem namun dibatasi oleh hak akses peran Anda.
                </span>
              </div>
            </div>
            {canKelolaAkses && (
              <button
                onClick={() => onNavigateTab('hak-akses')}
                className="shrink-0 self-start sm:self-auto px-3 py-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors border border-amber-300 shadow-2xs cursor-pointer"
              >
                Ubah Hak Akses
              </button>
            )}
          </div>
        )}

        {/* Section Header with Access Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Ringkasan Statistik Pabrik</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {formatDateIndo(selectedDate)}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Matriks performa penjualan, beban operasional, HPP bahan giling, dan ketersediaan stok gudang.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {!canViewKeuangan ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Akses Finansial Dibatasi ({ROLE_DEFINITIONS[activeRole]?.title || activeRole})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Akses Penuh Finansial</span>
              </span>
            )}
          </div>
        </div>

        {/* PRIMARY RESPONSIVE GRID: 5 STAT CARDS (OMSET, BIAYA OPS, BEBAN BAHAN/HPP, ESTIMASI LABA, KESEHATAN STOK) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4.5 items-stretch">
          {/* Card 1: Omset Penjualan */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Omset Penjualan
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 min-h-[72px] flex flex-col justify-center">
                <div className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  <BlurMask
                    isAllowed={canViewKeuangan}
                    mode="stat"
                    activeRole={activeRole}
                    title="Nominal Omset Dibatasi"
                    reason="Peran memerlukan izin 'lihat_keuangan' untuk melihat omset."
                  >
                    {formatRupiah(totalOmset)}
                  </BlurMask>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                  <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 text-[11px]">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    {formatNumber(totalKgTerjual)} Kg
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">terkirim ({todayPenjualan.length} order)</span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Lunas:{' '}
                <strong className="text-emerald-700">
                  <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                    {formatRupiah(todayLunasOmset)}
                  </BlurMask>
                </strong>
              </span>
              <button
                onClick={() => onNavigateTab('penjualan')}
                className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Kasir</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2: Biaya Operasional */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-rose-300 hover:shadow-sm transition-all p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Biaya Operasional
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 min-h-[72px] flex flex-col justify-center">
                <div className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  <BlurMask
                    isAllowed={canViewKeuangan}
                    mode="stat"
                    activeRole={activeRole}
                    title="Biaya Operasional Dibatasi"
                    reason="Peran memerlukan izin 'lihat_keuangan' untuk melihat biaya operasional."
                  >
                    {formatRupiah(totalBiayaOps)}
                  </BlurMask>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                  <span className="inline-flex items-center font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 text-[11px]">
                    {todayOperasional.length} Nota Biaya
                  </span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                    {sortedTodayOpsCategories[0]?.[0] ? `Top: ${sortedTodayOpsCategories[0][0]}` : 'Belum ada nota'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Akumulasi:{' '}
                <strong className="text-slate-800">
                  <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                    {formatRupiah(allTimeBiayaOps)}
                  </BlurMask>
                </strong>
              </span>
              <button
                onClick={() => onNavigateTab('operasional')}
                className="text-rose-700 hover:text-rose-800 font-bold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Detail</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Beban Bahan Baku (HPP) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Beban Bahan (HPP)
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-2xs">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 min-h-[72px] flex flex-col justify-center">
                <div className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  <BlurMask
                    isAllowed={canViewKeuangan && canViewHargaBeli}
                    mode="stat"
                    activeRole={activeRole}
                    title="Beban Bahan Dibatasi"
                    reason="Peran memerlukan izin 'lihat_keuangan' dan 'lihat_harga_beli' untuk melihat beban bahan baku."
                  >
                    {formatRupiah(totalBiayaBahan)}
                  </BlurMask>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                  <span className="inline-flex items-center font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 text-[11px]">
                    {todayPemakaian.length} Macam Bahan
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">terpakai giling</span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                HPP/Kg:{' '}
                <strong className="text-slate-800">
                  <BlurMask isAllowed={canViewKeuangan && canViewHargaBeli} mode="inline" activeRole={activeRole}>
                    {totalKgTerjual > 0 ? formatRupiah(Math.round(totalBiayaBahan / totalKgTerjual)) : 'Rp 0'}
                  </BlurMask>
                </strong>
              </span>
              <button
                onClick={() => onNavigateTab('stok-mutasi')}
                className="text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Giling</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 4: Estimasi Laba Bersih */}
          <div className={`rounded-2xl border shadow-xs hover:shadow-sm transition-all p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full ${
            estimasiLabaBersih >= 0
              ? 'bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white border-emerald-300/80 hover:border-emerald-400'
              : 'bg-red-50/50 border-red-300 hover:border-red-400'
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              estimasiLabaBersih >= 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-500' : 'bg-red-500'
            }`}></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Estimasi Laba Bersih
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  estimasiLabaBersih >= 0 ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-red-600 text-white shadow-2xs'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 min-h-[72px] flex flex-col justify-center">
                <div className={`text-2xl font-black tracking-tight leading-tight ${
                  estimasiLabaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  <BlurMask
                    isAllowed={canViewKeuangan}
                    mode="stat"
                    activeRole={activeRole}
                    title="Laba Bersih Dibatasi"
                    reason="Peran memerlukan izin 'lihat_keuangan' untuk melihat estimasi laba bersih."
                  >
                    {formatRupiah(estimasiLabaBersih)}
                  </BlurMask>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                  <span className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded text-[11px] ${
                    estimasiLabaBersih >= 0 ? 'bg-emerald-100/70 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    Margin:{' '}
                    <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                      {totalOmset > 0 ? `${Math.round((estimasiLabaBersih / totalOmset) * 100)}%` : '0%'}
                    </BlurMask>
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">
                    {canViewKeuangan ? (estimasiLabaBersih >= 0 ? 'Surplus operasional' : 'Defisit hari ini') : 'Performa harian'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Laba Kotor:{' '}
                <strong className="text-slate-900">
                  <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                    {formatRupiah(labaKotor)}
                  </BlurMask>
                </strong>
              </span>
              <button
                onClick={() => onNavigateTab('laba-rugi')}
                className="text-slate-700 hover:text-slate-900 font-bold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Laporan</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 5: Kesehatan Stok Bahan Baku */}
          <div className={`bg-white rounded-2xl border shadow-xs hover:shadow-sm transition-all p-4.5 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full ${
            lowStockItems.length > 0
              ? 'border-rose-300 hover:border-rose-400'
              : 'border-slate-200/90 hover:border-sky-300'
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              lowStockItems.length > 0
                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                : 'bg-gradient-to-r from-sky-500 to-blue-500'
            }`}></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Stok Bahan Baku
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  lowStockItems.length > 0
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs'
                    : 'bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs'
                }`}>
                  <PackageCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 min-h-[72px] flex flex-col justify-center">
                <div className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {bahanList.length} <span className="text-base font-bold text-slate-500">Item Bahan</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {lowStockItems.length > 0 ? (
                    <span className="inline-flex items-center font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px]">
                      <AlertTriangle className="w-3 h-3 mr-0.5" />
                      {lowStockItems.length} Bahan Kritis
                    </span>
                  ) : (
                    <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" />
                      100% Stok Aman
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 truncate">
                    {lowStockItems.length > 0 ? 'Perlu kulakan' : 'Gudang cukup'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Nilai Aset:{' '}
                <strong className="text-slate-800">
                  <BlurMask isAllowed={canViewKeuangan && canViewHargaBeli} mode="inline" activeRole={activeRole}>
                    {formatRupiah(totalNilaiAsetStok)}
                  </BlurMask>
                </strong>
              </span>
              <button
                onClick={() => onNavigateTab('master-bahan')}
                className="text-sky-700 hover:text-sky-800 font-bold inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Gudang</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Dual Primary Financial Summary Widgets (Deep-dive breakdown) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* ------------------------------------------------------------------- */}
          {/* WIDGET 1: TOTAL REVENUE (TOTAL PENDAPATAN / OMSET PENJUALAN)       */}
          {/* ------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between h-full">
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Total Revenue (Omset Penjualan)
                      </h3>
                      {!canViewKeuangan ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          Akses Dibatasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          {todayPenjualan.length} Transaksi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Penerimaan kas tunai &amp; piutang penjualan mie Sulamjari
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('penjualan')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 shrink-0 cursor-pointer"
                >
                  <span>Detail Kasir</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Main Revenue Figure Box */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 via-slate-50/50 to-white border border-emerald-100/80 min-h-[142px] flex flex-col justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Pendapatan / Omset ({formatDateIndo(selectedDate)}):</span>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    {formatNumber(totalKgTerjual)} Kg Mie Terkirim
                  </span>
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  <BlurMask
                    isAllowed={canViewKeuangan}
                    mode="stat"
                    activeRole={activeRole}
                    title="Nominal Omset Dibatasi"
                    reason="Peran memerlukan izin 'lihat_keuangan' untuk melihat omset."
                  >
                    {formatRupiah(totalOmset)}
                  </BlurMask>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Rata-rata/Kg:{' '}
                    <strong className="text-slate-800">
                      <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                        {formatRupiah(avgOmsetPerKg)}
                      </BlurMask>
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    Lunas:{' '}
                    <strong className="text-emerald-700">
                      <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                        {formatRupiah(todayLunasOmset)}
                      </BlurMask>
                    </strong>
                  </span>
                  {todayPiutangOmset > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        Piutang:{' '}
                        <strong className="text-amber-700">
                          <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                            {formatRupiah(todayPiutangOmset)}
                          </BlurMask>
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Sub-stats: Cumulative & Gross Margin */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Akumulasi Total Revenue:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                    {formatRupiah(allTimeOmset)}
                  </BlurMask>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Total {formatNumber(allTimeKgTerjual)} Kg ({penjualanList.length} transaksi)
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Margin Kotor Hari Ini:</span>
                <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">
                  <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                    {formatRupiah(labaKotor)}
                  </BlurMask>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Setelah dikurangi HPP bahan
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* WIDGET 2: TOTAL OPERATIONAL COSTS (TOTAL BIAYA OPERASIONAL PABRIK) */}
          {/* ------------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between h-full">
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600"></div>

            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-2xs">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Total Biaya Operasional Pabrik
                      </h3>
                      {!canViewKeuangan ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock className="w-2.5 h-2.5 text-amber-600" />
                          Akses Dibatasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <Flame className="w-2.5 h-2.5 text-rose-600" />
                          {todayOperasional.length} Nota Biaya
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pengeluaran listrik PLN, gas LPG, bahan bakar, upah &amp; servis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {canAddOps && (
                    <button
                      onClick={() => onOpenModal('operasional')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Catat</span>
                    </button>
                  )}
                  <button
                    onClick={() => onNavigateTab('operasional')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                  >
                    <span>Detail</span>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                </div>
              </div>

              {/* Main Operational Cost Figure Box */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-rose-50/60 via-slate-50/50 to-white border border-rose-100/80 min-h-[142px] flex flex-col justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Biaya Operasional ({formatDateIndo(selectedDate)}):</span>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md">
                    {todayOperasional.length} Transaksi Nota
                  </span>
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  <BlurMask
                    isAllowed={canViewKeuangan}
                    mode="stat"
                    activeRole={activeRole}
                    title="Biaya Operasional Dibatasi"
                    reason="Peran memerlukan izin 'lihat_keuangan' untuk melihat biaya operasional."
                  >
                    {formatRupiah(totalBiayaOps)}
                  </BlurMask>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500">Rincian Hari Ini:</span>
                  {sortedTodayOpsCategories.length === 0 ? (
                    <span className="text-slate-400 italic">Belum ada nota operasional pada tanggal ini</span>
                  ) : (
                    sortedTodayOpsCategories.slice(0, 3).map(([cat, nominal]) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-rose-200 text-[11px] font-medium text-slate-800"
                      >
                        <span>{cat}:</span>
                        <strong className="text-rose-700">
                          <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                            {formatRupiah(nominal)}
                          </BlurMask>
                        </strong>
                      </span>
                    ))
                  )}
                  {sortedTodayOpsCategories.length > 3 && (
                    <span className="text-[11px] text-slate-500 font-semibold">
                      +{sortedTodayOpsCategories.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Sub-stats: Cumulative & Material Cost */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Akumulasi Total Biaya Ops:</span>
                <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                  <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                    {formatRupiah(allTimeBiayaOps)}
                  </BlurMask>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Total {operasionalList.length} bukti pengeluaran
                </span>
              </div>
              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">Beban Bahan Baku Hari Ini:</span>
                <span className="font-extrabold text-amber-700 text-sm mt-0.5 block">
                  <BlurMask isAllowed={canViewKeuangan && canViewHargaBeli} mode="inline" activeRole={activeRole}>
                    {formatRupiah(totalBiayaBahan)}
                  </BlurMask>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {todayPemakaian.length} macam bahan terpakai
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Alerts Row: Low Stock Alert & Piutang Alert */}
      {(lowStockItems.length > 0 || piutangList.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Low Stock Warning */}
          {lowStockItems.length > 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-900">
                    Peringatan: {lowStockItems.length} Bahan Baku Menipis!
                  </h3>
                  <button
                    onClick={() => onNavigateTab('master-bahan')}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 inline-flex items-center"
                  >
                    Cek Gudang <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lowStockItems.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-white border border-amber-300 text-amber-900"
                    >
                      {item.nama}: Sisa {item.stokTersedia} {item.satuan} (Min {item.minStok})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Semua stok bahan baku saat ini berada di atas batas aman produksi.</span>
            </div>
          )}

          {/* Piutang Warning */}
          {piutangList.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-rose-900">
                    Perhatian: {piutangList.length} Order Belum Lunas / Piutang
                  </h3>
                  <button
                    onClick={() => onNavigateTab('penjualan')}
                    className="text-xs font-bold text-rose-800 hover:text-rose-950 inline-flex items-center"
                  >
                    Buka Kasir <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
                <p className="text-xs text-rose-700 mt-1 font-medium">
                  Total tagihan tertahan:{' '}
                  <span className="font-extrabold text-rose-900">
                    <BlurMask isAllowed={canViewKeuangan && canViewPiutang} mode="inline" activeRole={activeRole}>
                      {formatRupiah(totalNominalPiutang)}
                    </BlurMask>
                  </span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {piutangList.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-white border border-rose-300 text-rose-900"
                    >
                      {item.namaPelanggan}:{' '}
                      <BlurMask isAllowed={canViewKeuangan && canViewPiutang} mode="inline" activeRole={activeRole}>
                        {formatRupiah(item.totalOmset)}
                      </BlurMask>
                    </span>
                  ))}
                  {piutangList.length > 3 && (
                    <span className="text-xs text-rose-600 font-semibold self-center">
                      +{piutangList.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recharts Horizontal Bar Chart: Perbandingan Stok Tersedia vs Batas Minimum (minStok) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        {/* Header with Title, Badges, and Quick Action buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Perbandingan Stok Tersedia vs Batas Minimum
                </h2>
                {lowStockItems.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    {lowStockItems.length} Bahan Kritis
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Semua Stok Aman
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Grafik batang horizontal membandingkan jumlah fisik stok gudang dengan ambang batas pengaman (minStok).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onOpenModal('masuk')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Kulakan Stok Masuk
            </button>
            <button
              onClick={() => onNavigateTab('bahan')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
            >
              Master Bahan <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Kategori:
            </span>
            {stockCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setStockCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  stockCategoryFilter === cat
                    ? 'bg-red-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Filter & Sort Options */}
          <div className="flex items-center gap-2 shrink-0">
            {lowStockItems.length > 0 && (
              <button
                onClick={() => setStockOnlyAlerts(!stockOnlyAlerts)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  stockOnlyAlerts
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Hanya Kritis ({lowStockItems.length})
              </button>
            )}

            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700">
              <span className="text-slate-500 font-medium hidden sm:inline">Urutan:</span>
              <select
                value={stockSortBy}
                onChange={(e) => setStockSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="kritis">Paling Kritis / Rendah</option>
                <option value="nama">Nama Bahan (A-Z)</option>
                <option value="stok">Jumlah Stok Terbanyak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-600">
            <span className="font-semibold text-slate-500">Keterangan Bar:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              Stok Aman (&gt; 150% min)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-400"></span>
              Stok Waspada (100%-150%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
              Stok Kritis (≤ Batas Min)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-400"></span>
              Batas Min. Pengaman
            </span>
          </div>

          <span className="text-[11px] text-slate-600">
            Menampilkan <strong className="text-slate-800">{processedStockData.length}</strong> bahan baku
          </span>
        </div>

        {/* Chart Viewport */}
        {processedStockData.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Tidak ada bahan baku yang cocok</p>
            <p className="text-xs text-slate-600 mt-1">Coba ubah filter kategori atau matikan filter stok kritis.</p>
            <button
              onClick={() => {
                setStockCategoryFilter('SEMUA');
                setStockOnlyAlerts(false);
              }}
              className="mt-3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div style={{ height: `${chartHeight}px`, minWidth: '480px' }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={processedStockData}
                  margin={{ top: 10, right: 30, left: 15, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={130}
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const isCritical = data.stokTersedia <= data.minStok;
                        const isWarning = !isCritical && data.stokTersedia <= data.minStok * 1.5;

                        return (
                          <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[240px] backdrop-blur-md">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
                              <div>
                                <span className="font-bold text-sm text-white block leading-tight">
                                  {data.fullName}
                                </span>
                                <span className="text-[11px] text-slate-400 mt-0.5 block">
                                  {data.kategori} {data.merk ? `• ${data.merk}` : ''}
                                </span>
                              </div>
                              {isCritical ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 font-bold text-[10px] border border-rose-500/40 shrink-0">
                                  🚨 Kritis
                                </span>
                              ) : isWarning ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-bold text-[10px] border border-amber-500/40 shrink-0">
                                  ⚠️ Waspada
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 shrink-0">
                                  ✅ Aman
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-xs inline-block ${
                                      isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                                    }`}
                                  ></span>
                                  Stok Tersedia:
                                </span>
                                <span
                                  className={`font-bold ${
                                    isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {formatNumber(data.stokTersedia)} {data.satuan}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-slate-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block"></span>
                                  Batas Min. (Safety):
                                </span>
                                <span className="font-semibold text-slate-200">
                                  {formatNumber(data.minStok)} {data.satuan}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Kecukupan Stok:</span>
                                <span className="font-semibold text-slate-200">
                                  {Math.round(data.rasio)}% dari batas aman
                                </span>
                              </div>

                              {isCritical ? (
                                <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2 rounded-lg border border-rose-800/60 font-medium mt-1">
                                  Defisit {formatNumber(data.defisit)} {data.satuan}! Segera kulakan stok masuk.
                                </div>
                              ) : isWarning ? (
                                <div className="text-[11px] text-amber-300 bg-amber-950/50 p-1.5 rounded-lg border border-amber-800/50 font-medium mt-1">
                                  Buffer tersisa {formatNumber(data.surplus)} {data.satuan}.
                                </div>
                              ) : (
                                <div className="text-[11px] text-emerald-300 bg-emerald-950/50 p-1.5 rounded-lg border border-emerald-800/50 font-medium mt-1">
                                  Surplus {formatNumber(data.surplus)} {data.satuan} di atas safety stock.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <RechartsLegend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                  />
                  <Bar
                    dataKey="stokTersedia"
                    name="Stok Tersedia Saat Ini"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    {processedStockData.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.isDefisit ? '#ef4444' : entry.isWarning ? '#f59e0b' : '#10b981'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="minStok"
                    name="Batas Min. Stok (Safety)"
                    fill="#94a3b8"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE VISUALIZATIONS: TREN PENJUALAN MINGGUAN (KG) & BIAYA OPS     */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Header bar with range selector */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Visualisasi Tren Mingguan Pabrik
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {weeklyTrendData.length} Siklus Minggu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan berdampingan volume penjualan mie (Kg) dan beban operasional untuk analisis efisiensi pabrik.
              </p>
            </div>
          </div>

          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto text-xs font-semibold">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 hidden sm:inline">
              Rentang:
            </span>
            {[
              { id: '4', label: '4 Minggu' },
              { id: '8', label: '8 Minggu' },
              { id: '12', label: '12 Minggu' },
              { id: 'all', label: 'Semua Riwayat' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWeeklyRange(opt.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  weeklyRange === opt.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-side 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* --------------------------------------------------------------- */}
          {/* CARD 1: TREN PENJUALAN MINGGUAN (KG)                            */}
          {/* --------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Tren Penjualan Mingguan (Kg)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Volume output mie basah &amp; pangsit terkirim
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {prevWeek ? (
                    salesTrendDiff > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        +{formatNumber(salesTrendDiff)} Kg (+{salesTrendDiffPct}%)
                      </span>
                    ) : salesTrendDiff < 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                        {formatNumber(salesTrendDiff)} Kg ({salesTrendDiffPct}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Stabil
                      </span>
                    )
                  ) : null}
                </div>
              </div>

              {/* Sub-KPI Summary Strip */}
              <div className="grid grid-cols-3 gap-2.5 my-3.5 text-xs">
                <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] uppercase font-bold text-amber-800/80 block">
                    Total Volume
                  </span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {formatNumber(totalRangeKg)} Kg
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {weeklyTrendData.length} minggu
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Rata-rata/Mg
                  </span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {formatNumber(avgRangeKg)} Kg
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Kapasitas mingguan
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Puncak (Peak)
                  </span>
                  <span className="font-black text-amber-700 text-sm mt-0.5 block">
                    {formatNumber(peakRangeKg)} Kg
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Rekor tertinggi
                  </span>
                </div>
              </div>

              {/* Recharts Bar Chart Viewport */}
              <div style={{ height: '280px' }} className="w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyTrendData}
                    margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tickFormatter={(val: number) => `${val} Kg`}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const isPeak = data.totalKg === peakRangeKg && peakRangeKg > 0;
                          return (
                            <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[220px] backdrop-blur-md">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400"></span>
                                  {data.label}
                                </span>
                                {isPeak && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                                    ★ Puncak
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Volume Penjualan:</span>
                                  <span className="font-black text-amber-400 text-sm">
                                    {formatNumber(data.totalKg)} Kg
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Total Omset:</span>
                                  <span className="font-bold text-slate-200">
                                    <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                                      {formatRupiah(data.totalOmset)}
                                    </BlurMask>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800">
                                  <span>Jumlah Order / Kasir:</span>
                                  <span className="font-semibold text-slate-200">
                                    {data.penjualanCount} Transaksi
                                  </span>
                                </div>
                                {data.totalKg > 0 && (
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Rata-rata/Kg:</span>
                                    <span className="font-medium text-slate-300">
                                      <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                                        {formatRupiah(data.avgHargaPerKg)}
                                      </BlurMask>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="totalKg"
                      name="Volume (Kg)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    >
                      {weeklyTrendData.map((entry, idx) => (
                        <Cell
                          key={`kg-bar-${idx}`}
                          fill={
                            entry.totalKg === peakRangeKg && peakRangeKg > 0
                              ? '#d97706'
                              : entry.totalKg > 0
                              ? '#f59e0b'
                              : '#e2e8f0'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Card Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Total {weeklyTrendData.reduce((acc, w) => acc + w.penjualanCount, 0)} order penjualan terdata
              </span>
              <button
                onClick={() => onNavigateTab('penjualan')}
                className="font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-0.5"
              >
                Lihat Kasir <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* CARD 2: TREN BIAYA OPERASIONAL (RP)                             */}
          {/* --------------------------------------------------------------- */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                    <Receipt className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Tren Biaya Operasional Pabrik
                      </h3>
                      {!canViewKeuangan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          Terkunci
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pengeluaran listrik PLN, gas LPG, BBM &amp; upah
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {canViewKeuangan ? (
                    prevWeek ? (
                      opsTrendDiff > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          +{formatRupiah(opsTrendDiff)} (+{opsTrendDiffPct}%)
                        </span>
                      ) : opsTrendDiff < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                          Hemat {formatRupiah(Math.abs(opsTrendDiff))}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Stabil
                        </span>
                      )
                    ) : null
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Dibatasi
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-KPI Summary Strip */}
              <div className="grid grid-cols-3 gap-2.5 my-3.5 text-xs">
                <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-[10px] uppercase font-bold text-rose-800/80 block">
                    Total Biaya
                  </span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                      {formatRupiah(totalRangeOps)}
                    </BlurMask>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {weeklyTrendData.length} minggu
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Rata-rata/Mg
                  </span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                      {formatRupiah(avgRangeOps)}
                    </BlurMask>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Beban mingguan
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Beban Terbesar
                  </span>
                  <span className="font-bold text-rose-700 text-xs mt-1 block truncate" title={overallTopOpsCategory}>
                    {overallTopOpsCategory}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Kategori utama
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart Viewport with Blur Protection */}
              <BlurMask
                isAllowed={canViewKeuangan}
                mode="card"
                activeRole={activeRole}
                onGoToSettings={() => onNavigateTab('hak-akses')}
                title="Grafik Biaya Operasional Dibatasi"
                reason="Peran Anda belum diberikan izin 'lihat_keuangan' untuk melihat grafik biaya pabrik."
                className="w-full mt-2"
              >
                <div style={{ height: '280px' }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weeklyTrendData}
                      margin={{ top: 15, right: 15, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="opsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        tickFormatter={(val: number) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
                          if (val >= 1000) return `${Math.round(val / 1000)}rb`;
                          return String(val);
                        }}
                      />
                      <RechartsTooltip
                        cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '3 3' }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[240px] backdrop-blur-md">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                  <span className="font-bold text-white flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                                    {data.label}
                                  </span>
                                  <span className="text-[10px] text-rose-300 font-mono bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/60">
                                    {data.opsCount} Bukti Nota
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Total Beban Operasional:</span>
                                    <span className="font-black text-rose-400 text-sm">
                                      <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                                        {formatRupiah(data.totalBiayaOps)}
                                      </BlurMask>
                                    </span>
                                  </div>
                                  {Object.keys(data.opsBreakdown).length > 0 && (
                                    <div className="pt-2 border-t border-slate-800 space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Rincian Pengeluaran:
                                      </span>
                                      {Object.entries(data.opsBreakdown).map(([cat, nom]: any) => (
                                        <div key={cat} className="flex items-center justify-between text-[11px] text-slate-300">
                                          <span className="truncate max-w-[130px]">{cat}:</span>
                                          <span className="font-semibold text-rose-300">
                                            <BlurMask isAllowed={canViewKeuangan} mode="inline" activeRole={activeRole}>
                                              {formatRupiah(nom)}
                                            </BlurMask>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalBiayaOps"
                        name="Biaya Operasional"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#opsAreaGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </BlurMask>
            </div>

            {/* Bottom Card Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Total {weeklyTrendData.reduce((acc, w) => acc + w.opsCount, 0)} bukti pengeluaran operasional
              </span>
              <button
                onClick={() => onNavigateTab('operasional')}
                className="font-bold text-rose-700 hover:text-rose-800 inline-flex items-center gap-0.5"
              >
                Lihat Operasional <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Quick Actions & Today's Orders Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Quick Action Menu Cards */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-red-600" />
            Aksi Cepat Operasional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            {canAddPenjualan && (
              <button
                onClick={() => onOpenModal('penjualan')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-red-400 hover:bg-red-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    🛍️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Catat Penjualan Mie</div>
                    <div className="text-[11px] text-slate-700">Input nota order pelanggan / warung</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
              </button>
            )}

            {canAddKeluar && (
              <button
                onClick={() => onOpenModal('keluar')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    🥣
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pakai Bahan Produksi</div>
                    <div className="text-[11px] text-slate-700">Tepung, telur, kansui, minyak keluar</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
              </button>
            )}

            {canAddMasuk && (
              <button
                onClick={() => onOpenModal('masuk')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    📥
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Kulakan / Stok Masuk</div>
                    <div className="text-[11px] text-slate-700">Beli bahan baku dari supplier</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>
            )}

            {canAddOps && (
              <button
                onClick={() => onOpenModal('operasional')}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                    ⚡
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Catat Beban Operasional</div>
                    <div className="text-[11px] text-slate-700">Listrik PLN, Gas LPG, upah giling</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>
            )}
          </div>
        </div>

        {/* Right 8-cols: Today's Orders & Today's Material Usage Snapshot */}
        <div className="lg:col-span-8 space-y-6">
          {/* Orders Today List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Pengiriman Mie ({formatDateIndo(selectedDate)})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {todayPenjualan.length > 0 && (
                  <button
                    onClick={() =>
                      exportPenjualanCSV(todayPenjualan, {
                        filename: `Daftar_Pengiriman_Mie_${selectedDate}`,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                    title="Unduh daftar pengiriman tanggal ini ke format CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ekspor CSV ({todayPenjualan.length})</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigateTab('penjualan')}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Lihat Semua
                </button>
              </div>
            </div>

            {todayPenjualan.length === 0 ? (
              <div className="p-8 text-center text-slate-700 text-xs">
                Belum ada transaksi penjualan pada tanggal {formatDateIndo(selectedDate)}.
                <div className="mt-2">
                  <button
                    onClick={() => onOpenModal('penjualan')}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    + Tambah order pelanggan sekarang
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Pelanggan</th>
                      <th className="px-4 py-2.5">Jenis Produk</th>
                      <th className="px-4 py-2.5 text-right">Volume</th>
                      <th className="px-4 py-2.5 text-right">Total Tagihan</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todayPenjualan.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {order.namaPelanggan}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{order.jenisProduk}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatNumber(order.jumlahKg)} Kg
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          <BlurMask isAllowed={canViewKeuangan} mode="table-cell" activeRole={activeRole}>
                            {formatRupiah(order.totalOmset)}
                          </BlurMask>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${
                              order.statusPembayaran === 'LUNAS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.statusPembayaran === 'PIUTANG'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {order.statusPembayaran}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Today's Material Usage Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pemakaian Bahan Baku Produksi ({formatDateIndo(selectedDate)})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('pemakaian')}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Lihat Rekap Lengkap
              </button>
            </div>

            {todayPemakaian.length === 0 ? (
              <div className="p-6 text-center text-slate-700 text-xs">
                Belum ada catatan pemakaian bahan untuk tanggal {formatDateIndo(selectedDate)}.
                <div className="mt-1">
                  <button
                    onClick={() => onOpenModal('keluar')}
                    className="text-xs font-semibold text-amber-700 hover:underline"
                  >
                    + Catat pemakaian tepung &amp; telur hari ini
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {todayPemakaian.map((mut) => (
                  <div
                    key={mut.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate" title={mut.namaBahan}>
                        {mut.namaBahan}
                      </div>
                      <div className="text-[11px] text-slate-700 truncate mt-0.5">
                        {mut.supplierOrKeterangan}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-amber-700">
                        {formatNumber(mut.jumlah)} {mut.satuan}
                      </span>
                      <span className="font-semibold text-slate-700">
                        <BlurMask isAllowed={canViewKeuangan && canViewHargaBeli} mode="inline" activeRole={activeRole}>
                          {formatRupiah(mut.totalBiaya)}
                        </BlurMask>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
