import React, { useState } from 'react';
import {
  ArrowDownUp,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Download,
  Filter,
  Calendar,
  Trash2,
  Boxes,
} from 'lucide-react';
import { MutasiStok, BahanBaku, UserRole, RolePermissionMap } from '../types';
import { formatRupiah, formatNumber, formatDateIndo, exportMutasiStokCSV } from '../utils/storage';
import { BlurMask } from './BlurMask';

interface StokMutasiTabProps {
  mutasiList: MutasiStok[];
  bahanList: BahanBaku[];
  onOpenModalMasuk: () => void;
  onOpenModalKeluar: () => void;
  onDeleteMutasi: (id: string) => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  onNavigateTab?: (tab: any) => void;
}

export const StokMutasiTab: React.FC<StokMutasiTabProps> = ({
  mutasiList,
  bahanList,
  onOpenModalMasuk,
  onOpenModalKeluar,
  onDeleteMutasi,
  activeRole = 'admin_pusat',
  rolePermissions,
  onNavigateTab,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterBahanId, setFilterBahanId] = useState<string>('ALL');

  const filteredMutasi = mutasiList.filter((m) => {
    const matchType = filterType === 'ALL' || m.tipe === filterType;
    const matchDate = !filterDate || m.tanggal === filterDate;
    const matchBahan = filterBahanId === 'ALL' || m.bahanId === filterBahanId;
    return matchType && matchDate && matchBahan;
  });

  const totalMasukBiaya = filteredMutasi
    .filter((m) => m.tipe === 'MASUK')
    .reduce((acc, curr) => acc + curr.totalBiaya, 0);

  const totalKeluarBiaya = filteredMutasi
    .filter((m) => m.tipe === 'KELUAR')
    .reduce((acc, curr) => acc + curr.totalBiaya, 0);

  const handleExportCSV = () => {
    exportMutasiStokCSV(filteredMutasi);
  };

  const canViewMutasi = rolePermissions ? rolePermissions.view_stok_mutasi : true;
  const canViewHargaBeli = rolePermissions ? rolePermissions.view_harga_beli_bahan : true;
  const canAddMasuk = rolePermissions ? rolePermissions.action_stok_masuk : true;
  const canAddKeluar = rolePermissions ? rolePermissions.action_stok_keluar : true;
  const canExport = rolePermissions ? rolePermissions.action_ekspor_backup : true;
  const canHapusMutasi = rolePermissions ? rolePermissions.action_hapus_bahan : true;

  if (!canViewMutasi) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        onGoToSettings={onNavigateTab ? () => onNavigateTab('hak-akses') : undefined}
        title="Riwayat Mutasi Stok Dibatasi"
        reason="Peran Anda belum diberikan izin untuk melihat riwayat mutasi stok masuk dan keluar."
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h2 className="text-xl font-bold">Riwayat Mutasi Stok Masuk &amp; Keluar</h2>
          <p className="text-xs text-slate-500 mt-2">Daftar penerimaan bahan kulakan supplier dan pemakaian adonan mie.</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xs">
            <ArrowDownUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Pencatatan Stok Masuk &amp; Stok Keluar Harian
            </h2>
            <p className="text-xs text-slate-700">
              Catat pembelian stok dari supplier serta pemakaian bahan harian untuk proses penggilingan mie.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Unduh seluruh data mutasi yang tampil saat ini ke format CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV ({filteredMutasi.length})</span>
            </button>
          )}
          {canAddMasuk && (
            <button
              onClick={onOpenModalMasuk}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Stok Masuk (Kulakan)</span>
            </button>
          )}
          {canAddKeluar && (
            <button
              onClick={onOpenModalKeluar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>+ Stok Keluar (Produksi)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards of Filtered Mutation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Total Transaksi Tercatat
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {formatNumber(filteredMutasi.length)}
            </span>
            <span className="text-xs text-slate-700">catatan pergerakan</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Total Nilai Stok Masuk
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              <BlurMask isAllowed={canViewHargaBeli} mode="inline" activeRole={activeRole}>
                {formatRupiah(totalMasukBiaya)}
              </BlurMask>
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
            Pembelian bahan baru dari supplier
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Total Nilai Stok Keluar
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              <BlurMask isAllowed={canViewHargaBeli} mode="inline" activeRole={activeRole}>
                {formatRupiah(totalKeluarBiaya)}
              </BlurMask>
            </span>
          </div>
          <span className="text-[11px] text-amber-600 mt-1 block font-medium">
            Estimasi HPP bahan terpakai produksi
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Tipe Mutasi:
          </span>
          {(['ALL', 'MASUK', 'KELUAR'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterType === t
                  ? t === 'MASUK'
                    ? 'bg-emerald-600 text-white'
                    : t === 'KELUAR'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'Semua' : t === 'MASUK' ? 'Masuk (Beli)' : 'Keluar (Pakai)'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Bahan */}
          <select
            value={filterBahanId}
            onChange={(e) => setFilterBahanId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium text-slate-700"
          >
            <option value="ALL">Semua Bahan Baku</option>
            {bahanList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama}
              </option>
            ))}
          </select>

          {/* Filter Date */}
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

      {/* Mutation Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Tanggal &amp; Waktu</th>
                <th className="px-4 py-3 text-center">Tipe</th>
                <th className="px-4 py-3">Bahan Baku</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th className="px-4 py-3 text-right">Total Nilai (Rp)</th>
                <th className="px-4 py-3">Supplier / Keterangan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMutasi.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-700">
                    Belum ada riwayat mutasi stok untuk kriteria filter ini.
                  </td>
                </tr>
              ) : (
                filteredMutasi.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{formatDateIndo(m.tanggal)}</div>
                      <div className="text-[10px] text-slate-600 font-mono">
                        {m.createdAt.split(' ')[1] || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          m.tipe === 'MASUK'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {m.tipe === 'MASUK' ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3" />
                            MASUK
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            KELUAR
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900">{m.namaBahan}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {m.tipe === 'MASUK' ? '+' : '-'} {formatNumber(m.jumlah)}{' '}
                      <span className="text-xs font-normal text-slate-700">{m.satuan}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      <BlurMask isAllowed={canViewHargaBeli} mode="table-cell" activeRole={activeRole}>
                        <span>{formatRupiah(m.hargaSatuan)}</span>
                      </BlurMask>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      <BlurMask isAllowed={canViewHargaBeli} mode="table-cell" activeRole={activeRole}>
                        <span>{formatRupiah(m.totalBiaya)}</span>
                      </BlurMask>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs max-w-xs truncate" title={m.supplierOrKeterangan}>
                      {m.supplierOrKeterangan}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canHapusMutasi ? (
                        <button
                          onClick={() => onDeleteMutasi(m.id)}
                          className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus / Batalkan Catatan Mutasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
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
