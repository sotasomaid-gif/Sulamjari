import React, { useState } from 'react';
import {
  ClipboardList,
  Calendar,
  Download,
  Boxes,
  PlusCircle,
  FileSpreadsheet,
  TrendingDown,
} from 'lucide-react';
import { MutasiStok, BahanBaku, UserRole, RolePermissionMap } from '../types';
import { formatRupiah, formatNumber, formatDateIndo, exportPemakaianHarianCSV } from '../utils/storage';
import { BlurMask } from './BlurMask';

interface PemakaianHarianTabProps {
  mutasiList: MutasiStok[];
  bahanList: BahanBaku[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenModalKeluar: () => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  onNavigateTab?: (tab: any) => void;
}

interface RekapBahanHarian {
  bahanId: string;
  namaBahan: string;
  kategori: string;
  satuan: string;
  merk: string;
  hargaSatuan: number;
  jumlahTerpakai: number;
  totalPengeluaran: number;
  keteranganList: string[];
}

export const PemakaianHarianTab: React.FC<PemakaianHarianTabProps> = ({
  mutasiList,
  bahanList,
  selectedDate,
  onSelectDate,
  onOpenModalKeluar,
  activeRole = 'admin_pusat',
  rolePermissions,
  onNavigateTab,
}) => {
  // Permission checks
  const canViewPemakaian = rolePermissions ? rolePermissions.view_pemakaian_harian : true;
  const canViewHargaBeli = rolePermissions ? rolePermissions.view_harga_beli_bahan : true;
  const canAddKeluar = rolePermissions ? rolePermissions.action_stok_keluar : true;
  const canExport = rolePermissions ? rolePermissions.action_ekspor_backup : true;

  // Filter only KELUAR mutasi for the selected date
  const filteredKeluar = mutasiList.filter(
    (m) => m.tipe === 'KELUAR' && m.tanggal === selectedDate
  );

  // Group by bahanId
  const rekapMap = new Map<string, RekapBahanHarian>();

  filteredKeluar.forEach((item) => {
    const bahanRef = bahanList.find((b) => b.id === item.bahanId);
    const kategori = bahanRef ? bahanRef.kategori : 'Lainnya';
    const merk = bahanRef ? bahanRef.merk : '-';

    if (!rekapMap.has(item.bahanId)) {
      rekapMap.set(item.bahanId, {
        bahanId: item.bahanId,
        namaBahan: item.namaBahan,
        kategori,
        satuan: item.satuan,
        merk,
        hargaSatuan: item.hargaSatuan,
        jumlahTerpakai: item.jumlah,
        totalPengeluaran: item.totalBiaya,
        keteranganList: [item.supplierOrKeterangan],
      });
    } else {
      const existing = rekapMap.get(item.bahanId)!;
      existing.jumlahTerpakai += item.jumlah;
      existing.totalPengeluaran += item.totalBiaya;
      existing.keteranganList.push(item.supplierOrKeterangan);
    }
  });

  const rekapItems = Array.from(rekapMap.values());
  const totalBiayaHariIni = rekapItems.reduce((acc, curr) => acc + curr.totalPengeluaran, 0);

  const handleExportCSV = () => {
    exportPemakaianHarianCSV(rekapItems, selectedDate, totalBiayaHariIni);
  };

  if (!canViewPemakaian) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        title="Laporan Pemakaian Bahan Dibatasi"
        reason="Akses ke Laporan Pemakaian Bahan Baku dibatasi untuk peran ini. Hubungi Admin Pusat atau ubah izin pada menu Pengaturan Hak Akses."
        onGoToSettings={onNavigateTab ? () => onNavigateTab('hak-akses') : undefined}
      >
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Laporan Pemakaian Bahan</h3>
          <p className="text-sm text-slate-500 mt-1">Data pemakaian bahan baku harian tersembunyi.</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Laporan Pemakaian Bahan Baku Harian
            </h2>
            <p className="text-xs text-slate-700">
              Rekapitulasi rinci bahan tepung, telur, kansui, dan kemasan yang terpakai pada lini produksi mie.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
            <Calendar className="w-4 h-4 text-slate-500 ml-1" />
            <span className="text-xs font-semibold text-slate-700">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Hari Ini
          </button>

          {canExport && (
            <button
              onClick={handleExportCSV}
              disabled={rekapItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors border border-slate-200"
              title="Unduh rekap pemakaian bahan baku tanggal ini ke format CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV ({rekapItems.length})</span>
            </button>
          )}

          {canAddKeluar && (
            <button
              onClick={onOpenModalKeluar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Catat Pemakaian</span>
            </button>
          )}
        </div>
      </div>

      {/* Daily Usage Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Periode Laporan
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {formatDateIndo(selectedDate)}
          </div>
          <span className="text-xs text-slate-700">Filter tanggal terpilih</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Variasi Bahan Terpakai
          </span>
          <div className="text-lg font-black text-amber-700 mt-1">
            {rekapItems.length} Jenis Bahan
          </div>
          <span className="text-xs text-slate-700">Terlibat dalam produksi</span>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
            Total Biaya Pengeluaran Bahan
          </span>
          <div className="text-2xl font-black mt-1">
            <BlurMask isAllowed={canViewHargaBeli} mode="inline">
              {formatRupiah(totalBiayaHariIni)}
            </BlurMask>
          </div>
          <span className="text-xs text-amber-100 font-medium">
            Nilai HPP bahan baku harian
          </span>
        </div>
      </div>

      {/* Rekapitulasi Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            Tabel Rekapitulasi Pemakaian Bahan — {formatDateIndo(selectedDate)}
          </h3>
          <span className="text-xs text-slate-700">
            Otomatis terhitung dari stok keluar produksi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Nama Bahan &amp; Merk</th>
                <th className="px-4 py-3 text-right">Harga Satuan Terakhir</th>
                <th className="px-4 py-3 text-right">Jumlah Terpakai</th>
                <th className="px-4 py-3 text-right">Total Biaya Bahan</th>
                <th className="px-4 py-3">Peruntukan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rekapItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-700">
                    <p className="font-semibold text-slate-800">
                      Tidak ada catatan pemakaian bahan pada {formatDateIndo(selectedDate)}.
                    </p>
                    <p className="text-xs text-slate-700 mt-1">
                      Silakan pilih tanggal lain atau klik tombol "+ Catat Pemakaian" di atas.
                    </p>
                  </td>
                </tr>
              ) : (
                rekapItems.map((item, idx) => (
                  <tr key={item.bahanId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{item.namaBahan}</div>
                      <div className="text-xs text-slate-700">Merk: {item.merk}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                      <BlurMask isAllowed={canViewHargaBeli} mode="table-cell">
                        {formatRupiah(item.hargaSatuan)} / {item.satuan}
                      </BlurMask>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-amber-700">
                      {formatNumber(item.jumlahTerpakai)}{' '}
                      <span className="text-xs font-normal text-slate-700">{item.satuan}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                      <BlurMask isAllowed={canViewHargaBeli} mode="table-cell">
                        {formatRupiah(item.totalPengeluaran)}
                      </BlurMask>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs max-w-xs">
                      {item.keteranganList.join(', ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rekapItems.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className="px-4 py-3.5 text-right uppercase tracking-wider text-xs">
                    Total Biaya Bahan Hari Ini:
                  </td>
                  <td className="px-4 py-3.5 text-right text-base text-red-700 font-black">
                    <BlurMask isAllowed={canViewHargaBeli} mode="table-cell">
                      {formatRupiah(totalBiayaHariIni)}
                    </BlurMask>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
