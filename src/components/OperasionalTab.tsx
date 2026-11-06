import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Zap,
  Flame,
  Users,
  Truck,
  Wrench,
  Trash2,
  DollarSign,
} from 'lucide-react';
import { BiayaOperasional, KategoriOperasional, UserRole, RolePermissionMap } from '../types';
import { formatRupiah, formatNumber, formatDateIndo, exportOperasionalCSV } from '../utils/storage';
import { BlurMask } from './BlurMask';

interface OperasionalTabProps {
  operasionalList: BiayaOperasional[];
  onOpenAddModal: () => void;
  onDeleteOperasional: (id: string, deskripsi: string) => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  onNavigateTab?: (tab: any) => void;
}

export const OperasionalTab: React.FC<OperasionalTabProps> = ({
  operasionalList,
  onOpenAddModal,
  onDeleteOperasional,
  activeRole = 'admin_pusat',
  rolePermissions,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  const categories: string[] = [
    'ALL',
    'Listrik',
    'Gas LPG',
    'Gaji Karyawan',
    'Transport / Bensin',
    'Perawatan Mesin',
    'Kebersihan & Air',
    'Lain-lain',
  ];

  const filteredOps = operasionalList.filter((op) => {
    const matchCategory = filterCategory === 'ALL' || op.kategori === filterCategory;
    const matchDate = !filterDate || op.tanggal === filterDate;
    const matchSearch =
      op.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.penanggungJawab.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (op.buktiNota && op.buktiNota.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchDate && matchSearch;
  });

  const totalNominal = filteredOps.reduce((acc, curr) => acc + curr.nominal, 0);

  // Group by category to see spending shares
  const categorySums = filteredOps.reduce((acc, curr) => {
    acc[curr.kategori] = (acc[curr.kategori] || 0) + curr.nominal;
    return acc;
  }, {} as Record<string, number>);

  const handleExportCSV = () => {
    exportOperasionalCSV(filteredOps);
  };

  const canViewOperasional = rolePermissions ? rolePermissions.view_operasional : true;
  const canAddOps = rolePermissions ? rolePermissions.action_tambah_operasional : true;
  const canDeleteOps = rolePermissions ? rolePermissions.action_hapus_operasional : true;
  const canExport = rolePermissions ? rolePermissions.action_ekspor_backup : true;

  if (!canViewOperasional) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        onGoToSettings={onNavigateTab ? () => onNavigateTab('hak-akses') : undefined}
        title="Biaya Operasional Dibatasi"
        reason="Peran Anda belum diberikan izin untuk melihat rincian biaya operasional pabrik."
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h2 className="text-xl font-bold">Biaya Operasional Pabrik Mie</h2>
          <p className="text-xs text-slate-500 mt-2">Biaya listrik PLN, Gas LPG, upah karyawan, transport, dan perawatan mesin.</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pencatatan Biaya Operasional Pabrik Harian
            </h2>
            <p className="text-xs text-slate-700">
              Catat pengeluaran rutin pabrik: Listrik PLN, Gas LPG boiler, upah karyawan, armada bensin, dan maintenance mesin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Unduh seluruh data pengeluaran operasional yang tampil saat ini ke format CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV ({filteredOps.length})</span>
            </button>
          )}
          {canAddOps && (
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Biaya Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI & Category Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Total Biaya Operasional
          </span>
          <div className="mt-2 text-2xl font-black text-rose-700">
            <BlurMask isAllowed={canViewOperasional} mode="inline" activeRole={activeRole}>
              {formatRupiah(totalNominal)}
            </BlurMask>
          </div>
          <span className="text-[11px] text-slate-700 mt-1 block">
            {filteredOps.length} transaksi tercatat
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Beban Gas &amp; Energi
          </span>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {formatRupiah((categorySums['Gas LPG'] || 0) + (categorySums['Listrik'] || 0))}
          </div>
          <span className="text-[11px] text-slate-700 mt-1 block">
            Listrik PLN &amp; Gas Boiler
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            Upah / Gaji Operator
          </span>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {formatRupiah(categorySums['Gaji Karyawan'] || 0)}
          </div>
          <span className="text-[11px] text-slate-700 mt-1 block">
            Tenaga giling &amp; packing
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-500" />
            Transport &amp; Mesin
          </span>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {formatRupiah(
              (categorySums['Transport / Bensin'] || 0) +
                (categorySums['Perawatan Mesin'] || 0)
            )}
          </div>
          <span className="text-[11px] text-slate-700 mt-1 block">
            Bensin kurir &amp; oli mesin
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari deskripsi pengeluaran, penanggung jawab, no nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium text-slate-700"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'Semua Kategori' : c}
              </option>
            ))}
          </select>

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

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Deskripsi Pengeluaran</th>
                <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                <th className="px-4 py-3">Penanggung Jawab</th>
                <th className="px-4 py-3">Bukti / No. Nota</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-700">
                    Tidak ada catatan pengeluaran operasional untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredOps.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {formatDateIndo(op.tanggal)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                        {op.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{op.deskripsi}</td>
                    <td className="px-4 py-3.5 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                      <BlurMask isAllowed={canViewOperasional} mode="table-cell" activeRole={activeRole}>
                        <span>{formatRupiah(op.nominal)}</span>
                      </BlurMask>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs whitespace-nowrap">
                      {op.penanggungJawab}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                      {op.buktiNota || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {canDeleteOps ? (
                        <button
                          onClick={() => onDeleteOperasional(op.id, op.deskripsi)}
                          className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Pengeluaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Lihat Saja</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredOps.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3.5 text-right uppercase tracking-wider text-xs">
                    Total Pengeluaran Operasional:
                  </td>
                  <td className="px-4 py-3.5 text-right text-base text-rose-700 font-black">
                    <BlurMask isAllowed={canViewOperasional} mode="table-cell" activeRole={activeRole}>
                      <span>{formatRupiah(totalNominal)}</span>
                    </BlurMask>
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
