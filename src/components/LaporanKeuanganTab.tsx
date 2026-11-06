import React, { useState } from 'react';
import {
  PieChart as PieChartIcon,
  Calendar,
  Printer,
  Download,
  FileDown,
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Wallet,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PenjualanMie, MutasiStok, BiayaOperasional, BahanBaku, UserRole, RolePermissionMap } from '../types';
import {
  formatRupiah,
  formatNumber,
  formatDateIndo,
  exportLaporanKeuanganCSV,
} from '../utils/storage';
import { exportLaporanKeuanganPDF } from '../utils/pdfExport';
import { BlurMask } from './BlurMask';

interface LaporanKeuanganTabProps {
  penjualanList: PenjualanMie[];
  mutasiList: MutasiStok[];
  operasionalList: BiayaOperasional[];
  bahanList: BahanBaku[];
  onOpenPrintModal: (periodData: any) => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  onNavigateTab?: (tab: any) => void;
}

type PeriodeMode = 'hari_ini' | '7_hari' | 'bulan_ini' | 'kustom';

const CATEGORY_COLORS: Record<string, string> = {
  'Gas LPG': '#d97706', // amber-600
  'Listrik': '#dc2626', // red-600
  'Gaji Karyawan': '#2563eb', // blue-600
  'Transport / Bensin': '#059669', // emerald-600
  'Perawatan Mesin': '#7c3aed', // violet-600
  'Kebersihan & Air': '#0891b2', // cyan-600
  'Lain-lain': '#64748b', // slate-500
};

export const LaporanKeuanganTab: React.FC<LaporanKeuanganTabProps> = ({
  penjualanList,
  mutasiList,
  operasionalList,
  bahanList,
  onOpenPrintModal,
  activeRole = 'admin_pusat',
  rolePermissions,
  onNavigateTab,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [periodeMode, setPeriodeMode] = useState<PeriodeMode>('hari_ini');
  const [customStart, setCustomStart] = useState<string>(today);
  const [customEnd, setCustomEnd] = useState<string>(today);
  const [pieDataSource, setPieDataSource] = useState<'periode' | 'semua'>('semua');
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Compute date range based on mode
  let startDate = today;
  let endDate = today;

  if (periodeMode === 'hari_ini') {
    startDate = today;
    endDate = today;
  } else if (periodeMode === '7_hari') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    startDate = d.toISOString().split('T')[0];
    endDate = today;
  } else if (periodeMode === 'bulan_ini') {
    const d = new Date();
    startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    endDate = today;
  } else if (periodeMode === 'kustom') {
    startDate = customStart || today;
    endDate = customEnd || today;
  }

  // Filter datasets for P&L table
  const filteredPenjualan = penjualanList.filter(
    (p) => p.tanggal >= startDate && p.tanggal <= endDate
  );
  const filteredPemakaian = mutasiList.filter(
    (m) => m.tipe === 'KELUAR' && m.tanggal >= startDate && m.tanggal <= endDate
  );
  const filteredStokMasuk = mutasiList.filter(
    (m) => m.tipe === 'MASUK' && m.tanggal >= startDate && m.tanggal <= endDate
  );
  const filteredOperasional = operasionalList.filter(
    (o) => o.tanggal >= startDate && o.tanggal <= endDate
  );

  // Financial aggregates
  const totalOmset = filteredPenjualan.reduce((acc, curr) => acc + curr.totalOmset, 0);
  const totalKgMie = filteredPenjualan.reduce((acc, curr) => acc + curr.jumlahKg, 0);
  const totalBiayaBahan = filteredPemakaian.reduce((acc, curr) => acc + curr.totalBiaya, 0);
  const totalBiayaOps = filteredOperasional.reduce((acc, curr) => acc + curr.nominal, 0);
  const totalKulakanBaru = filteredStokMasuk.reduce((acc, curr) => acc + curr.totalBiaya, 0);

  const labaKotor = totalOmset - totalBiayaBahan;
  const estimasiLabaBersih = labaKotor - totalBiayaOps;
  const marginLabaBersih = totalOmset > 0 ? (estimasiLabaBersih / totalOmset) * 100 : 0;
  const marginLabaKotor = totalOmset > 0 ? (labaKotor / totalOmset) * 100 : 0;

  const totalPiutang = filteredPenjualan
    .filter((p) => p.statusPembayaran !== 'LUNAS')
    .reduce((acc, curr) => acc + curr.totalOmset, 0);

  // Group operational expenses by category for period table
  const opsByCategory: Record<string, number> = {};
  filteredOperasional.forEach((op) => {
    opsByCategory[op.kategori] = (opsByCategory[op.kategori] || 0) + op.nominal;
  });

  // -------------------------------------------------------------
  // DATA PREPARATION FOR RECHARTS
  // -------------------------------------------------------------

  // 1. Monthly Sales Trend Data (Bar Chart)
  // Group all sales by YYYY-MM
  const monthlySalesMap = new Map<string, { omset: number; volumeKg: number }>();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

  penjualanList.forEach((p) => {
    if (!p.tanggal) return;
    const yearMonth = p.tanggal.slice(0, 7); // '2026-10'
    const current = monthlySalesMap.get(yearMonth) || { omset: 0, volumeKg: 0 };
    current.omset += p.totalOmset;
    current.volumeKg += p.jumlahKg;
    monthlySalesMap.set(yearMonth, current);
  });

  // Sort months chronologically
  const sortedMonthKeys = Array.from(monthlySalesMap.keys()).sort();
  const monthlySalesChartData = sortedMonthKeys.map((key) => {
    const [y, m] = key.split('-');
    const monthIndex = parseInt(m, 10) - 1;
    const label = `${monthNames[monthIndex]} '${y.slice(2)}`;
    const data = monthlySalesMap.get(key)!;
    return {
      key,
      label,
      omset: data.omset,
      volumeKg: data.volumeKg,
    };
  });

  // 2. Operational Costs Composition Data (Pie Chart)
  const targetOpsList = pieDataSource === 'periode' ? filteredOperasional : operasionalList;
  const opsPieMap = new Map<string, number>();

  targetOpsList.forEach((op) => {
    const current = opsPieMap.get(op.kategori) || 0;
    opsPieMap.set(op.kategori, current + op.nominal);
  });

  const totalOpsPie = Array.from(opsPieMap.values()).reduce((a, b) => a + b, 0);

  const opsPieChartData = Array.from(opsPieMap.entries())
    .map(([kategori, nominal]) => ({
      name: kategori,
      nominal,
      percentage: totalOpsPie > 0 ? (nominal / totalOpsPie) * 100 : 0,
      color: CATEGORY_COLORS[kategori] || '#64748b',
    }))
    .filter((item) => item.nominal > 0)
    .sort((a, b) => b.nominal - a.nominal);

  const handleExportCSV = () => {
    exportLaporanKeuanganCSV({
      startDate,
      endDate,
      totalOmset,
      totalKgMie,
      totalBiayaBahan,
      totalBiayaOps,
      labaKotor,
      estimasiLabaBersih,
      marginLabaKotor,
      marginLabaBersih,
      totalPiutang,
      totalKulakanBaru,
      opsByCategory,
    });
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      let periodLabel = `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
      if (periodeMode === 'bulan_ini') {
        const d = new Date();
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        periodLabel = `Bulan ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      } else if (periodeMode === 'hari_ini') {
        periodLabel = `Harian — ${formatDateIndo(startDate)}`;
      } else if (periodeMode === '7_hari') {
        periodLabel = `7 Hari Terakhir (${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)})`;
      }

      exportLaporanKeuanganPDF({
        startDate,
        endDate,
        periodeLabel: periodLabel,
        totalOmset,
        totalKgMie,
        totalBiayaBahan,
        totalBiayaOps,
        labaKotor,
        estimasiLabaBersih,
        marginLabaKotor,
        marginLabaBersih,
        totalPiutang,
        opsByCategory,
        penjualanList: filteredPenjualan,
        pemakaianList: filteredPemakaian,
        operasionalList: filteredOperasional,
        activeRole,
        pencetakNama:
          activeRole === 'admin_pusat'
            ? 'Admin Keuangan Pusat'
            : activeRole === 'kepala_pabrik'
            ? 'Kepala Pabrik / Supervisor'
            : 'Admin Kasir Pabrik',
      });
    } catch (err) {
      console.error('Error saat membuat dokumen PDF Laporan Keuangan:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const periodDataForPrint = {
    startDate,
    endDate,
    totalOmset,
    totalKgMie,
    totalBiayaBahan,
    totalBiayaOps,
    labaKotor,
    estimasiLabaBersih,
    marginLabaBersih,
    marginLabaKotor,
    totalPiutang,
    opsByCategory,
    penjualanCount: filteredPenjualan.length,
    pemakaianCount: filteredPemakaian.length,
    penjualanList: filteredPenjualan,
    pemakaianList: filteredPemakaian,
    operasionalList: filteredOperasional,
    activeRole,
  };

  const canViewLabaRugi = rolePermissions ? rolePermissions.view_laba_rugi : true;
  const canViewOmset = rolePermissions ? rolePermissions.view_omset_keuangan : true;
  const canPrint = rolePermissions ? rolePermissions.action_cetak_laporan : true;
  const canExport = rolePermissions ? rolePermissions.action_ekspor_backup : true;

  if (!canViewLabaRugi) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        onGoToSettings={onNavigateTab ? () => onNavigateTab('hak-akses') : undefined}
        title="Laporan Laba Rugi Dibatasi"
        reason="Peran Anda belum diberikan izin untuk melihat analisis margin keuntungan dan laporan keuangan pabrik."
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h2 className="text-xl font-bold">Laporan Laba Rugi &amp; Margin Keuangan</h2>
          <p className="text-xs text-slate-500 mt-2">Analisis pendapatan kotor, HPP, operasional, dan margin laba bersih.</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Periode Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-xs">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Laporan Rekapitulasi &amp; Laba Rugi Pabrik Mie
            </h2>
            <p className="text-xs text-slate-700">
              Analisis komprehensif omset kotor, HPP bahan terpakai, beban operasional, dan laba bersih.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick period buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setPeriodeMode('hari_ini')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                periodeMode === 'hari_ini'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriodeMode('7_hari')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                periodeMode === '7_hari'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setPeriodeMode('bulan_ini')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                periodeMode === 'bulan_ini'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPeriodeMode('kustom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                periodeMode === 'kustom'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rentang Bebas
            </button>
          </div>

          {canExport && (
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
              title="Unduh laporan laba rugi resmi berformat PDF untuk Pemilik Pabrik"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-white" />
              )}
              <span>{isExportingPDF ? 'Menyiapkan PDF...' : 'Ekspor PDF Resmi'}</span>
            </button>
          )}

          {canExport && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Unduh laporan laba rugi dan ikhtisar keuangan periode ini ke format CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV</span>
            </button>
          )}

          {canPrint && (
            <button
              onClick={() => onOpenPrintModal(periodDataForPrint)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Pratinjau Cetak</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker when mode == 'kustom' */}
      {periodeMode === 'kustom' && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex flex-wrap items-center gap-4 text-xs font-semibold text-amber-900">
          <div className="flex items-center gap-2">
            <span>Dari Tanggal:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white border border-amber-300 rounded px-2.5 py-1 text-slate-900 font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Sampai Tanggal:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white border border-amber-300 rounded px-2.5 py-1 text-slate-900 font-bold"
            />
          </div>
        </div>
      )}

      {/* Active Period Label */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
        <span>
          Periode Analisis: {formatDateIndo(startDate)} — {formatDateIndo(endDate)}
        </span>
        <span>Mata Uang: Rupiah (IDR)</span>
      </div>

      {/* 4 Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Total Omset Penjualan
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalOmset)}
            </BlurMask>
          </div>
          <div className="mt-1 text-xs text-slate-700 font-medium">
            Volume: <strong className="text-slate-900">{formatNumber(totalKgMie)} Kg</strong> mie
          </div>
        </div>

        {/* HPP Bahan Baku */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Beban Bahan Baku (HPP)
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalBiayaBahan)}
            </BlurMask>
          </div>
          <div className="mt-1 text-xs text-slate-700 font-medium">
            Laba Kotor:{' '}
            <strong className="text-slate-900">
              <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
                {formatRupiah(labaKotor)}
              </BlurMask>
            </strong>
          </div>
        </div>

        {/* Beban Operasional */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Biaya Operasional
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalBiayaOps)}
            </BlurMask>
          </div>
          <div className="mt-1 text-xs text-slate-700 font-medium">
            Listrik, gas, upah tenaga &amp; armada
          </div>
        </div>

        {/* Laba Bersih */}
        <div
          className={`rounded-xl p-5 border shadow-xs ${
            estimasiLabaBersih >= 0
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">
            Estimasi Laba Bersih
          </div>
          <div className="mt-2 text-2xl font-black">
            <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
              {formatRupiah(estimasiLabaBersih)}
            </BlurMask>
          </div>
          <div className="mt-1 text-xs opacity-90 font-medium">
            Margin Keuntungan: <strong>{marginLabaBersih.toFixed(1)}%</strong>
          </div>
        </div>
      </div>
      {/* Visual Analytics Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Grafik Batang: Tren Omset Penjualan Bulanan */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Tren Omset Penjualan Bulanan
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Akumulasi omset dari seluruh order pelanggan per bulan
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {monthlySalesChartData.length} Bulan Terdata
              </span>
            </div>

            {/* Bar Chart Container */}
            <div className="h-72 w-full mt-4">
              {monthlySalesChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada data penjualan tercatat.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlySalesChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)} jt`}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [formatRupiah(Number(value)), 'Total Omset']}
                      labelFormatter={(label) => `Periode: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '0.75rem',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                      }}
                      itemStyle={{ color: '#fca5a5', fontWeight: 'bold' }}
                    />
                    <Bar
                      dataKey="omset"
                      name="Omset Penjualan (Rp)"
                      fill="#dc2626"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Volume Tertinggi:</span>
            <span className="font-bold text-slate-800">
              {formatNumber(
                monthlySalesChartData.reduce((max, curr) => Math.max(max, curr.volumeKg), 0)
              )}{' '}
              Kg / bulan
            </span>
          </div>
        </div>

        {/* 2. Grafik Pie: Komposisi Biaya Operasional */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Komposisi Biaya Operasional
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Distribusi alokasi energi boiler, listrik, upah &amp; armada
                  </p>
                </div>
              </div>

              {/* Data source toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  onClick={() => setPieDataSource('semua')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    pieDataSource === 'semua'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setPieDataSource('periode')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    pieDataSource === 'periode'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Periode Filter
                </button>
              </div>
            </div>

            {/* Pie Chart Container */}
            <div className="h-72 w-full mt-2 flex flex-col sm:flex-row items-center">
              {opsPieChartData.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada biaya operasional pada pilihan ini.
                </div>
              ) : (
                <>
                  <div className="h-56 sm:h-full w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={opsPieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="nominal"
                          nameKey="name"
                        >
                          {opsPieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any, name: any) => [
                            `${formatRupiah(Number(value))} (${(
                              (Number(value) / (totalOpsPie || 1)) *
                              100
                            ).toFixed(1)}%)`,
                            name,
                          ]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '0.75rem',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend list with badges & nominal */}
                  <div className="w-full sm:w-1/2 space-y-1.5 pl-2 max-h-56 overflow-y-auto scrollbar-none text-xs">
                    {opsPieChartData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-1 rounded-md hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-slate-700 font-medium truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0 font-semibold text-slate-900 ml-2">
                          <span>{item.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Beban Operasional:</span>
            <span className="font-extrabold text-rose-700">{formatRupiah(totalOpsPie)}</span>
          </div>
        </div>
      </div>

      {/* Official Factory Owner Report Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-xs border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-red-600 text-white rounded-xl shadow-xs shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase bg-red-600 text-white px-2 py-0.5 rounded">
                Laporan Resmi Pemilik Pabrik
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Kop Surat Resmi, Rasio Finansial &amp; Pengesahan Tanda Tangan
              </span>
            </div>
            <h3 className="text-base font-bold mt-1 text-slate-100">
              Cetak / Ekspor Laporan Laba Rugi Bulanan (PDF)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              Dokumen PDF siap kirim ke pemilik pabrik dengan kop resmi Pabrik Mie Basah Sulam Jari, rincian omset penjualan mie basah, HPP bahan terpakai, beban operasional, dan kolom tanda tangan pengesahan.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {canExport && (
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 rounded-lg transition-all shadow-md hover:shadow-lg border border-red-500"
            >
              {isExportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{isExportingPDF ? 'Membuat Dokumen...' : 'Unduh Berkas PDF'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base tracking-tight">
              Laporan Laba Rugi Operasional — Pabrik Mie Sulamjari
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-300">
              {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)}
            </span>
            {canExport && (
              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded border border-white/20 transition-colors"
                title="Unduh Laporan Laba Rugi Berformat PDF Resmi"
              >
                <FileDown className="w-3.5 h-3.5 text-red-400" />
                <span>Unduh PDF</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 divide-y divide-slate-100 text-sm">
          {/* Section 1: Pendapatan Penjualan */}
          <div className="py-3">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="text-base text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                1. PENDAPATAN OMSET PENJUALAN MIE
              </span>
              <span className="text-base font-extrabold text-emerald-700">
                {formatRupiah(totalOmset)}
              </span>
            </div>
            <div className="pl-4 mt-2 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Total Volume Penjualan Mie Basah &amp; Keriting:</span>
                <span className="font-semibold text-slate-800">{formatNumber(totalKgMie)} Kg</span>
              </div>
              <div className="flex justify-between">
                <span>Penerimaan Kas &amp; Transfer Masuk:</span>
                <span className="font-semibold text-emerald-600">
                  {formatRupiah(totalOmset - totalPiutang)}
                </span>
              </div>
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Piutang / Tempo Belum Ditagih:</span>
                <span className="font-bold">{formatRupiah(totalPiutang)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Beban Pokok Produksi (HPP Bahan) */}
          <div className="py-3">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="text-base text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                2. BEBAN POKOK PRODUKSI / BAHAN BAKU TERPAKAI
              </span>
              <span className="text-base font-extrabold text-amber-700">
                ({formatRupiah(totalBiayaBahan)})
              </span>
            </div>
            <div className="pl-4 mt-2 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Bahan terpakai (Tepung terigu, telur, minyak, kansui, kemasan):</span>
                <span className="font-semibold text-slate-800">
                  {filteredPemakaian.length} catatan pemakaian
                </span>
              </div>
            </div>
          </div>

          {/* Subtotal: Laba Kotor */}
          <div className="py-3 bg-slate-50/80 -mx-6 px-6 flex items-center justify-between border-y border-slate-200">
            <div>
              <span className="font-black text-slate-900 text-sm uppercase tracking-wide">
                LABA KOTOR (GROSS PROFIT)
              </span>
              <div className="text-[11px] text-slate-700">
                Omset dikurangi HPP bahan langsung
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-slate-900">{formatRupiah(labaKotor)}</div>
              <div className="text-xs font-bold text-emerald-600">
                Margin: {marginLabaKotor.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Section 3: Beban Biaya Operasional */}
          <div className="py-3">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="text-base text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                3. BIAYA OPERASIONAL PABRIK
              </span>
              <span className="text-base font-extrabold text-rose-700">
                ({formatRupiah(totalBiayaOps)})
              </span>
            </div>
            <div className="pl-4 mt-2 space-y-1.5 text-xs text-slate-600">
              {Object.keys(opsByCategory).length === 0 ? (
                <div>Tidak ada beban operasional tercatat pada periode ini.</div>
              ) : (
                Object.entries(opsByCategory).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between">
                    <span>{cat}:</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(val)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Final: Laba Bersih */}
          <div className="py-4 bg-red-50/50 -mx-6 px-6 flex items-center justify-between border-t-2 border-slate-300">
            <div>
              <span className="font-black text-slate-950 text-base uppercase tracking-wider">
                ESTIMASI LABA BERSIH (NET PROFIT)
              </span>
              <div className="text-xs text-slate-700">
                Keuntungan bersih setelah seluruh bahan baku dan biaya operasional
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-black ${
                  estimasiLabaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatRupiah(estimasiLabaBersih)}
              </div>
              <div className="text-xs font-bold text-slate-700">
                Net Margin:{' '}
                <span
                  className={
                    estimasiLabaBersih >= 0 ? 'text-emerald-700 font-extrabold' : 'text-red-700'
                  }
                >
                  {marginLabaBersih.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
