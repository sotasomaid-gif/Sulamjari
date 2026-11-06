import React, { useState } from 'react';
import {
  Store,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  DollarSign,
  Truck,
} from 'lucide-react';
import { PenjualanMie, StatusPembayaran, UserRole, RolePermissionMap } from '../types';
import { formatRupiah, formatNumber, formatDateIndo, exportPenjualanCSV } from '../utils/storage';
import { BlurMask } from './BlurMask';

interface PenjualanTabProps {
  penjualanList: PenjualanMie[];
  onOpenAddModal: () => void;
  onOpenEditModal: (order: PenjualanMie) => void;
  onDeleteOrder: (id: string, customer: string) => void;
  onUpdateStatus: (id: string, status: StatusPembayaran) => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  onNavigateTab?: (tab: any) => void;
}

export const PenjualanTab: React.FC<PenjualanTabProps> = ({
  penjualanList,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteOrder,
  onUpdateStatus,
  activeRole = 'admin_pusat',
  rolePermissions,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  const filteredOrders = penjualanList.filter((p) => {
    const matchStatus = filterStatus === 'ALL' || p.statusPembayaran === filterStatus;
    const matchDate = !filterDate || p.tanggal === filterDate;
    const matchSearch =
      p.namaPelanggan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.jenisProduk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.catatan && p.catatan.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchDate && matchSearch;
  });

  // Calculate filtered totals
  const totalOmset = filteredOrders.reduce((acc, curr) => acc + curr.totalOmset, 0);
  const totalKg = filteredOrders.reduce((acc, curr) => acc + curr.jumlahKg, 0);
  const totalLunas = filteredOrders
    .filter((p) => p.statusPembayaran === 'LUNAS')
    .reduce((acc, curr) => acc + curr.totalOmset, 0);
  const totalPiutang = filteredOrders
    .filter((p) => p.statusPembayaran !== 'LUNAS')
    .reduce((acc, curr) => acc + curr.totalOmset, 0);

  const handleExportCSV = () => {
    exportPenjualanCSV(filteredOrders);
  };

  const canViewPenjualan = rolePermissions ? rolePermissions.view_penjualan : true;
  const canViewOmset = rolePermissions ? rolePermissions.view_omset_keuangan : true;
  const canViewPiutang = rolePermissions ? rolePermissions.view_piutang : true;
  const canAddOrder = rolePermissions ? rolePermissions.action_tambah_penjualan : true;
  const canEditOrder = rolePermissions ? rolePermissions.action_edit_penjualan : true;
  const canDeleteOrder = rolePermissions ? rolePermissions.action_hapus_penjualan : true;
  const canExport = rolePermissions ? rolePermissions.action_ekspor_backup : true;

  if (!canViewPenjualan) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        onGoToSettings={onNavigateTab ? () => onNavigateTab('hak-akses') : undefined}
        title="Modul Penjualan Mie Dibatasi"
        reason="Peran Anda belum diberikan izin untuk melihat riwayat penjualan dan pesanan pelanggan."
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h2 className="text-xl font-bold">Penjualan Mie &amp; Kasir Pabrik</h2>
          <p className="text-xs text-slate-500 mt-2">Daftar transaksi mie basah, kulit pangsit, dan status piutang pelanggan.</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-xs">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pencatatan Omset Penjualan Mie (Pelanggan)
            </h2>
            <p className="text-xs text-slate-700">
              Kelola pesanan warung mie ayam, bakso, depot mie, dan restoran. Hitung otomatis omset per Kg &amp; status piutang.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Unduh seluruh data order penjualan yang tampil saat ini ke format CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV ({filteredOrders.length})</span>
            </button>
          )}
          {canAddOrder && (
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Order Baru Pelanggan</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: Volume, Total Omset, Lunas, Piutang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Total Mie Terjual
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{formatNumber(totalKg)}</span>
            <span className="text-xs font-bold text-slate-700">Kg</span>
          </div>
          <span className="text-[11px] text-slate-700 mt-1 block">
            Dari {filteredOrders.length} transaksi
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Total Omset Penjualan
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalOmset)}
            </BlurMask>
          </div>
          <span className="text-[11px] text-slate-700 mt-1 block">
            Rata-rata: {totalKg > 0 ? formatRupiah(Math.round(totalOmset / totalKg)) : 0} / Kg
          </span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Penerimaan Kas (Lunas)
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            <BlurMask isAllowed={canViewOmset} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalLunas)}
            </BlurMask>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
            Kas &amp; transfer yang telah diterima
          </span>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
            Sisa Piutang Pelanggan
          </span>
          <div className="mt-2 text-2xl font-black text-rose-700">
            <BlurMask isAllowed={canViewPiutang} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalPiutang)}
            </BlurMask>
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block font-medium">
            Tagihan tempo &amp; belum ditransfer
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama warung, pelanggan, atau jenis mie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'LUNAS', 'PIUTANG', 'BELUM_LUNAS'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filterStatus === st
                    ? st === 'LUNAS'
                      ? 'bg-emerald-600 text-white'
                      : st === 'PIUTANG'
                      ? 'bg-amber-600 text-white'
                      : st === 'BELUM_LUNAS'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL'
                  ? 'Semua'
                  : st === 'LUNAS'
                  ? 'Lunas'
                  : st === 'PIUTANG'
                  ? 'Piutang'
                  : 'Belum Lunas'}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-hidden text-slate-800"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-[10px] text-slate-400 hover:text-red-500 font-bold px-1"
                title="Reset Tanggal"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Nama Pelanggan / Warung</th>
                <th className="px-4 py-3">Jenis Produk</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3 text-right">Harga / Kg</th>
                <th className="px-4 py-3 text-right">Total Omset</th>
                <th className="px-4 py-3 text-center">Status Bayar</th>
                <th className="px-4 py-3 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-700">
                    Tidak ditemukan data order penjualan sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 font-medium">
                      {formatDateIndo(order.tanggal)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{order.namaPelanggan}</div>
                      {order.telepon && (
                        <div className="text-xs text-slate-700">Telp: {order.telepon}</div>
                      )}
                      {order.catatan && (
                        <div className="text-[11px] text-amber-800 italic mt-0.5">
                          "{order.catatan}"
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{order.jenisProduk}</td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                      {formatNumber(order.jumlahKg)}{' '}
                      <span className="text-xs font-normal text-slate-700">Kg</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-700">
                      <BlurMask isAllowed={canViewOmset} mode="table-cell" activeRole={activeRole}>
                        <span>{formatRupiah(order.hargaPerKg)}</span>
                      </BlurMask>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                      <BlurMask isAllowed={canViewOmset} mode="table-cell" activeRole={activeRole}>
                        <span>{formatRupiah(order.totalOmset)}</span>
                      </BlurMask>
                      <div className="text-[10px] text-slate-700 font-normal">
                        via {order.metodePembayaran}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-block">
                        {canEditOrder ? (
                          <select
                            value={order.statusPembayaran}
                            onChange={(e) =>
                              onUpdateStatus(order.id, e.target.value as StatusPembayaran)
                            }
                            className={`text-xs font-bold rounded-full px-2.5 py-1 border transition-colors cursor-pointer ${
                              order.statusPembayaran === 'LUNAS'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : order.statusPembayaran === 'PIUTANG'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="LUNAS">✓ LUNAS</option>
                            <option value="PIUTANG">⏳ PIUTANG (Tempo)</option>
                            <option value="BELUM_LUNAS">✕ BELUM LUNAS</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center text-xs font-bold rounded-full px-2.5 py-1 border ${
                              order.statusPembayaran === 'LUNAS'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : order.statusPembayaran === 'PIUTANG'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {order.statusPembayaran === 'LUNAS'
                              ? '✓ LUNAS'
                              : order.statusPembayaran === 'PIUTANG'
                              ? '⏳ PIUTANG'
                              : '✕ BELUM LUNAS'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEditOrder && (
                          <button
                            onClick={() => onOpenEditModal(order)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Edit Order"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteOrder && (
                          <button
                            onClick={() => onDeleteOrder(order.id, order.namaPelanggan)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!canEditOrder && !canDeleteOrder && (
                          <span className="text-[11px] text-slate-400 italic">Lihat Saja</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
