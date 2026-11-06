import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  CheckCircle,
} from 'lucide-react';
import { BahanBaku, KategoriBahan, UserRole, RolePermissionMap } from '../types';
import { formatRupiah, formatNumber, exportBahanBakuCSV } from '../utils/storage';
import { BlurMask } from './BlurMask';

interface MasterBahanTabProps {
  bahanList: BahanBaku[];
  onOpenAddModal: () => void;
  onOpenEditModal: (bahan: BahanBaku) => void;
  onDeleteBahan: (id: string, nama: string) => void;
  activeRole?: UserRole;
  rolePermissions?: RolePermissionMap;
  onNavigateTab?: (tab: any) => void;
}

export const MasterBahanTab: React.FC<MasterBahanTabProps> = ({
  bahanList,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteBahan,
  activeRole = 'admin_pusat',
  rolePermissions,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');

  const categories: string[] = ['SEMUA', 'Tepung', 'Telur', 'Minyak', 'Bumbu & Kimiawi', 'Kemasan', 'Lainnya'];

  const filteredBahan = bahanList.filter((b) => {
    const matchCategory = selectedCategory === 'SEMUA' || b.kategori === selectedCategory;
    const matchSearch =
      b.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.merk.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleExportCSV = () => {
    exportBahanBakuCSV(filteredBahan);
  };

  const canViewMasterBahan = rolePermissions ? rolePermissions.view_master_bahan : true;
  const canViewHargaBeli = rolePermissions ? rolePermissions.view_harga_beli_bahan : true;
  const canAddBahan = rolePermissions ? rolePermissions.action_tambah_bahan : true;
  const canHapusBahan = rolePermissions ? rolePermissions.action_hapus_bahan : true;
  const canExport = rolePermissions ? rolePermissions.action_ekspor_backup : true;

  if (!canViewMasterBahan) {
    return (
      <BlurMask
        isAllowed={false}
        mode="block"
        activeRole={activeRole}
        onGoToSettings={onNavigateTab ? () => onNavigateTab('hak-akses') : undefined}
        title="Master Bahan Dibatasi"
        reason="Peran Anda belum diberikan izin untuk melihat katalog master bahan baku."
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <h2 className="text-xl font-bold">Katalog Master Bahan Baku</h2>
          <p className="text-xs text-slate-500 mt-2">Daftar stok tepung, telur, minyak, bumbu &amp; kemasan pabrik.</p>
        </div>
      </BlurMask>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Master Data Bahan Baku &amp; Kategori
              </h2>
              <p className="text-xs text-slate-700">
                Kelola katalog bahan (Tepung, Telur, Kansui, Minyak, Kemasan) beserta harga acuan dan stok minimum.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canExport && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Unduh seluruh tabel bahan baku yang tampil saat ini ke format CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor CSV ({filteredBahan.length})</span>
            </button>
          )}
          {canAddBahan && (
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Bahan Baku</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama bahan, merk, atau jenis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs text-slate-600 font-medium px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Kategori:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bahan Baku Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Bahan Baku &amp; Merk</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Harga Satuan Terakhir</th>
                <th className="px-4 py-3 text-right">Stok Gudang</th>
                <th className="px-4 py-3 text-center">Status Stok</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBahan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-700">
                    Tidak ada bahan baku yang cocok dengan pencarian / filter ini.
                  </td>
                </tr>
              ) : (
                filteredBahan.map((b) => {
                  const isLow = b.stokTersedia <= b.minStok;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{b.nama}</div>
                        <div className="text-xs text-slate-700 flex items-center gap-2 mt-0.5">
                          <span>Merk: {b.merk || '-'}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-600">ID: {b.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {b.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                        <BlurMask isAllowed={canViewHargaBeli} mode="table-cell" activeRole={activeRole}>
                          <span>{formatRupiah(b.hargaSatuan)}</span>
                        </BlurMask>
                        <span className="text-[11px] font-normal text-slate-700 ml-1">
                          / {b.satuan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={`text-sm font-extrabold ${
                            isLow ? 'text-amber-700' : 'text-slate-900'
                          }`}
                        >
                          {formatNumber(b.stokTersedia)}
                        </span>
                        <span className="text-xs text-slate-700 ml-1 font-medium">{b.satuan}</span>
                        <div className="text-[10px] text-slate-600">
                          Min aman: {b.minStok} {b.satuan}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Stok Aman
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canAddBahan && (
                            <button
                              onClick={() => onOpenEditModal(b)}
                              className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Edit Bahan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canHapusBahan && (
                            <button
                              onClick={() => onDeleteBahan(b.id, b.nama)}
                              className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Bahan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {!canAddBahan && !canHapusBahan && (
                            <span className="text-[11px] text-slate-400 italic">Lihat Saja</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
