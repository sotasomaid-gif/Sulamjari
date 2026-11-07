import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Save,
  Printer,
  Download,
  FileDown,
  Upload,
  AlertTriangle,
  RefreshCw,
  FileCode,
  CheckCircle,
} from 'lucide-react';
import {
  BahanBaku,
  KategoriBahan,
  SatuanBahan,
  MutasiStok,
  PenjualanMie,
  BiayaOperasional,
  StatusPembayaran,
  KategoriOperasional,
} from '../types';
import {
  formatRupiah,
  formatNumber,
  formatDateIndo,
  exportBahanBakuCSV,
  exportPenjualanCSV,
} from '../utils/storage';
import { exportLaporanKeuanganPDF } from '../utils/pdfExport';

// -------------------------------------------------------------
// 1. MODAL BAHAN BAKU (TAMBAH / EDIT)
// -------------------------------------------------------------
interface ModalBahanProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bahan: BahanBaku) => void;
  initialData?: BahanBaku | null;
}

export const ModalBahan: React.FC<ModalBahanProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<KategoriBahan>('Tepung');
  const [satuan, setSatuan] = useState<SatuanBahan>('Kg');
  const [merk, setMerk] = useState('');
  const [hargaSatuan, setHargaSatuan] = useState<number>(10000);
  const [stokTersedia, setStokTersedia] = useState<number>(50);
  const [minStok, setMinStok] = useState<number>(20);

  useEffect(() => {
    if (initialData) {
      setNama(initialData.nama);
      setKategori(initialData.kategori);
      setSatuan(initialData.satuan);
      setMerk(initialData.merk);
      setHargaSatuan(initialData.hargaSatuan);
      setStokTersedia(initialData.stokTersedia);
      setMinStok(initialData.minStok);
    } else {
      setNama('');
      setKategori('Tepung');
      setSatuan('Kg');
      setMerk('');
      setHargaSatuan(12000);
      setStokTersedia(50);
      setMinStok(20);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    const data: BahanBaku = {
      id: initialData ? initialData.id : `bh-${Date.now().toString().slice(-6)}`,
      nama: nama.trim(),
      kategori,
      satuan,
      merk: merk.trim(),
      hargaSatuan: Number(hargaSatuan) || 0,
      stokTersedia: Number(stokTersedia) || 0,
      minStok: Number(minStok) || 0,
      terakhirDiperbarui: new Date().toISOString().split('T')[0],
    };
    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-bold text-slate-900">
            {initialData ? 'Edit Master Bahan Baku' : 'Tambah Bahan Baku Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Bahan Baku <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Tepung Terigu Protein Tinggi"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriBahan)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Tepung">Tepung</option>
                <option value="Telur">Telur</option>
                <option value="Minyak">Minyak</option>
                <option value="Bumbu & Kimiawi">Bumbu &amp; Kimiawi</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Satuan
              </label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value as SatuanBahan)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Kg">Kg (Kilogram)</option>
                <option value="Pcs">Pcs (Lembar / Buah)</option>
                <option value="Liter">Liter</option>
                <option value="Gram">Gram</option>
                <option value="Pack">Pack</option>
                <option value="Karung (25kg)">Karung (25kg)</option>
                <option value="Jerigen (20L)">Jerigen (20L)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Merk / Pabrik Pembuat
              </label>
              <input
                type="text"
                placeholder="Contoh: Cakra Kembar Emas"
                value={merk}
                onChange={(e) => setMerk(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Harga Satuan Terakhir (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={hargaSatuan}
                onChange={(e) => setHargaSatuan(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stok Fisik Tersedia ({satuan})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={stokTersedia}
                onChange={(e) => setStokTersedia(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batas Minimum Stok ({satuan})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={minStok}
                onChange={(e) => setMinStok(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
            >
              Simpan Bahan Baku
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. MODAL STOK MASUK (KULAKAN / PEMBELIAN DARI SUPPLIER)
// -------------------------------------------------------------
interface ModalStokMasukProps {
  isOpen: boolean;
  onClose: () => void;
  bahanList: BahanBaku[];
  onSave: (mutasi: MutasiStok) => void;
}

export const ModalStokMasuk: React.FC<ModalStokMasukProps> = ({
  isOpen,
  onClose,
  bahanList,
  onSave,
}) => {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBahanId, setSelectedBahanId] = useState(bahanList[0]?.id || '');
  const [jumlah, setJumlah] = useState<number>(50);
  const [supplier, setSupplier] = useState('');
  const [totalBiaya, setTotalBiaya] = useState<number>(0);

  const selectedBahan = bahanList.find((b) => b.id === selectedBahanId) || bahanList[0];

  useEffect(() => {
    if (selectedBahan) {
      setTotalBiaya(jumlah * selectedBahan.hargaSatuan);
    }
  }, [selectedBahanId, jumlah, selectedBahan]);

  if (!isOpen || !selectedBahan) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) return;

    const data: MutasiStok = {
      id: `mut-in-${Date.now().toString().slice(-6)}`,
      tanggal,
      bahanId: selectedBahan.id,
      namaBahan: `${selectedBahan.nama} (${selectedBahan.merk})`,
      tipe: 'MASUK',
      jumlah: Number(jumlah),
      satuan: selectedBahan.satuan,
      hargaSatuan: selectedBahan.hargaSatuan,
      totalBiaya: Number(totalBiaya) || jumlah * selectedBahan.hargaSatuan,
      supplierOrKeterangan: supplier.trim() || 'Pembelian Rutin Supplier',
      createdAt: `${tanggal} ${new Date().toTimeString().split(' ')[0]}`,
    };

    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-50">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-600 text-white font-bold text-xs">IN</span>
            <h3 className="text-base font-bold text-emerald-950">
              Catat Stok Masuk (Kulakan Bahan)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Pembelian <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Bahan Baku <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBahanId}
                onChange={(e) => setSelectedBahanId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {bahanList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama} ({b.merk}) - Sisa: {b.stokTersedia} {b.satuan}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jumlah Masuk ({selectedBahan.satuan}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Total Biaya Nota Pembelian (Rp)
              </label>
              <input
                type="number"
                min="0"
                required
                value={totalBiaya}
                onChange={(e) => setTotalBiaya(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Supplier / No. Nota / Faktur
            </label>
            <input
              type="text"
              placeholder="Contoh: CV Pangan Makmur Abadi (Faktur #8892)"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
            <strong>Otomatisasi:</strong> Stok <strong>{selectedBahan.nama}</strong> akan bertambah{' '}
            <strong>+{jumlah} {selectedBahan.satuan}</strong> dari stok saat ini ({selectedBahan.stokTersedia} {selectedBahan.satuan}).
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              Simpan Stok Masuk
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. MODAL STOK KELUAR (PEMAKAIAN PRODUKSI MIE)
// -------------------------------------------------------------
interface ModalStokKeluarProps {
  isOpen: boolean;
  onClose: () => void;
  bahanList: BahanBaku[];
  onSave: (mutasi: MutasiStok) => void;
}

export const ModalStokKeluar: React.FC<ModalStokKeluarProps> = ({
  isOpen,
  onClose,
  bahanList,
  onSave,
}) => {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBahanId, setSelectedBahanId] = useState(bahanList[0]?.id || '');
  const [jumlah, setJumlah] = useState<number>(25);
  const [keterangan, setKeterangan] = useState('Produksi Batch Pagi (Mie Ayam & Pangsit)');

  const selectedBahan = bahanList.find((b) => b.id === selectedBahanId) || bahanList[0];

  if (!isOpen || !selectedBahan) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) return;

    const data: MutasiStok = {
      id: `mut-out-${Date.now().toString().slice(-6)}`,
      tanggal,
      bahanId: selectedBahan.id,
      namaBahan: `${selectedBahan.nama} (${selectedBahan.merk})`,
      tipe: 'KELUAR',
      jumlah: Number(jumlah),
      satuan: selectedBahan.satuan,
      hargaSatuan: selectedBahan.hargaSatuan,
      totalBiaya: jumlah * selectedBahan.hargaSatuan,
      supplierOrKeterangan: keterangan.trim() || 'Pemakaian Produksi Harian',
      createdAt: `${tanggal} ${new Date().toTimeString().split(' ')[0]}`,
    };

    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-amber-50">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-600 text-white font-bold text-xs">OUT</span>
            <h3 className="text-base font-bold text-amber-950">
              Catat Pemakaian Produksi Harian
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Pemakaian <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Bahan Yang Digunakan <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBahanId}
                onChange={(e) => setSelectedBahanId(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                {bahanList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama} (Stok: {b.stokTersedia} {b.satuan})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jumlah Digunakan ({selectedBahan.satuan}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimasi Nilai HPP Bahan
              </label>
              <div className="px-3 py-2 bg-slate-100 rounded-lg font-bold text-xs sm:text-sm text-slate-900 border border-slate-200">
                {formatRupiah(jumlah * selectedBahan.hargaSatuan)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Keterangan Penggunaan
            </label>
            <input
              type="text"
              placeholder="Contoh: Produksi 150 Kg Mie Keriting & Kulit Pangsit"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <strong>Pengurangan Stok Otomatis:</strong> Stok <strong>{selectedBahan.nama}</strong>{' '}
            akan berkurang <strong>-{jumlah} {selectedBahan.satuan}</strong>. Sisa nantinya:{' '}
            <strong>{Math.max(0, selectedBahan.stokTersedia - jumlah)} {selectedBahan.satuan}</strong>.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
            >
              Simpan Pemakaian Bahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. MODAL PENJUALAN MIE (ORDER PELANGGAN)
// -------------------------------------------------------------
interface ModalPenjualanProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: PenjualanMie) => void;
  initialData?: PenjualanMie | null;
}

export const ModalPenjualan: React.FC<ModalPenjualanProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [telepon, setTelepon] = useState('');
  const [jenisProduk, setJenisProduk] = useState('Mie Ayam Halus Standar');
  const [jumlahKg, setJumlahKg] = useState<number>(30);
  const [hargaPerKg, setHargaPerKg] = useState<number>(22000);
  const [statusPembayaran, setStatusPembayaran] = useState<StatusPembayaran>('LUNAS');
  const [metodePembayaran, setMetodePembayaran] = useState<
    'Tunai' | 'Transfer Bank' | 'QRIS' | 'Tempo / Piutang'
  >('Tunai');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    if (initialData) {
      setTanggal(initialData.tanggal);
      setNamaPelanggan(initialData.namaPelanggan);
      setTelepon(initialData.telepon || '');
      setJenisProduk(initialData.jenisProduk);
      setJumlahKg(initialData.jumlahKg);
      setHargaPerKg(initialData.hargaPerKg);
      setStatusPembayaran(initialData.statusPembayaran);
      setMetodePembayaran(initialData.metodePembayaran);
      setCatatan(initialData.catatan || '');
    } else {
      setTanggal(new Date().toISOString().split('T')[0]);
      setNamaPelanggan('');
      setTelepon('');
      setJenisProduk('Mie Ayam Halus Standar');
      setJumlahKg(30);
      setHargaPerKg(22000);
      setStatusPembayaran('LUNAS');
      setMetodePembayaran('Tunai');
      setCatatan('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const totalOmset = jumlahKg * hargaPerKg;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPelanggan.trim() || jumlahKg <= 0 || hargaPerKg <= 0) return;

    const data: PenjualanMie = {
      id: initialData ? initialData.id : `pj-${Date.now().toString().slice(-6)}`,
      tanggal,
      namaPelanggan: namaPelanggan.trim(),
      telepon: telepon.trim(),
      jenisProduk,
      jumlahKg: Number(jumlahKg),
      hargaPerKg: Number(hargaPerKg),
      totalOmset,
      statusPembayaran,
      metodePembayaran,
      catatan: catatan.trim(),
    };

    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-red-50">
          <h3 className="text-base font-bold text-red-950">
            {initialData ? 'Edit Order Penjualan Mie' : 'Input Order Penjualan Mie Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Order / Kirim <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jenis Produk Mie <span className="text-red-500">*</span>
              </label>
              <select
                value={jenisProduk}
                onChange={(e) => setJenisProduk(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Mie Ayam Halus Standar">Mie Ayam Halus Standar</option>
                <option value="Mie Keriting Telur Super">Mie Keriting Telur Super</option>
                <option value="Mie Basah Tebal Kenyal">Mie Basah Tebal Kenyal</option>
                <option value="Mie Pangsit & Kulit Pangsit">Mie Pangsit &amp; Kulit Pangsit</option>
                <option value="Mie Ramen Halus Special">Mie Ramen Halus Special</option>
                <option value="Mie Lebar Singkawang">Mie Lebar Singkawang</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Pelanggan / Warung <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Mie Ayam Pak Joko"
                value={namaPelanggan}
                onChange={(e) => setNamaPelanggan(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. HP / WhatsApp Pelanggan
              </label>
              <input
                type="text"
                placeholder="Contoh: 0812-xxxx-xxxx"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jumlah Order (Kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={jumlahKg}
                onChange={(e) => setJumlahKg(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Harga Jual per Kg (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={hargaPerKg}
                onChange={(e) => setHargaPerKg(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Auto calculated total omset */}
          <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-red-900 uppercase">
              Total Omset Penjualan (Kg × Harga):
            </span>
            <span className="text-lg font-black text-red-700">{formatRupiah(totalOmset)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Pembayaran <span className="text-red-500">*</span>
              </label>
              <select
                value={statusPembayaran}
                onChange={(e) => setStatusPembayaran(e.target.value as StatusPembayaran)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="LUNAS">LUNAS</option>
                <option value="PIUTANG">PIUTANG (Tempo)</option>
                <option value="BELUM_LUNAS">BELUM LUNAS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={metodePembayaran}
                onChange={(e) => setMetodePembayaran(e.target.value as any)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              >
                <option value="Tunai">Tunai Langsung</option>
                <option value="Transfer Bank">Transfer Bank (BCA/Mandiri/BRI)</option>
                <option value="QRIS">QRIS Pabrik</option>
                <option value="Tempo / Piutang">Tempo / Piutang</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Order (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kirim jam 05.00 subuh, potong agak tipis"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
            >
              Simpan Order Penjualan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. MODAL BIAYA OPERASIONAL
// -------------------------------------------------------------
interface ModalOperasionalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (biaya: BiayaOperasional) => void;
}

export const ModalOperasional: React.FC<ModalOperasionalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kategori, setKategori] = useState<KategoriOperasional>('Listrik');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominal, setNominal] = useState<number>(100000);
  const [penanggungJawab, setPenanggungJawab] = useState('Staff Operasional');
  const [buktiNota, setBuktiNota] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskripsi.trim() || nominal <= 0) return;

    const data: BiayaOperasional = {
      id: `ops-${Date.now().toString().slice(-6)}`,
      tanggal,
      kategori,
      deskripsi: deskripsi.trim(),
      nominal: Number(nominal),
      penanggungJawab: penanggungJawab.trim() || 'Admin Pabrik',
      buktiNota: buktiNota.trim(),
    };

    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-rose-50">
          <h3 className="text-base font-bold text-rose-950">
            Catat Biaya Operasional Pabrik
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Pengeluaran <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Biaya <span className="text-red-500">*</span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriOperasional)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              >
                <option value="Listrik">Listrik PLN Pabrik</option>
                <option value="Gas LPG">Gas LPG Steam / Boiler</option>
                <option value="Gaji Karyawan">Gaji / Upah Karyawan Harian</option>
                <option value="Transport / Bensin">Transport / Bensin Kurir</option>
                <option value="Perawatan Mesin">Perawatan / Oli Mesin</option>
                <option value="Kebersihan & Air">Kebersihan &amp; Sanitasi Pabrik</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Pengeluaran <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beli Token Listrik Ruang Mesin Daya 5500VA"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nominal Biaya (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={nominal}
                onChange={(e) => setNominal(Number(e.target.value))}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Penanggung Jawab / Penerima
              </label>
              <input
                type="text"
                placeholder="Contoh: Bambang (Gudang)"
                value={penanggungJawab}
                onChange={(e) => setPenanggungJawab(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              No. Bukti / Kuitansi / Struk (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: PLN-TOK-9812 / Struk SPBU 421"
              value={buktiNota}
              onChange={(e) => setBuktiNota(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
            >
              Simpan Biaya Operasional
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 6. MODAL PRINT LAPORAN RESMI
// -------------------------------------------------------------
interface ModalPrintProps {
  isOpen: boolean;
  onClose: () => void;
  printData: any;
}

export const ModalPrint: React.FC<ModalPrintProps> = ({
  isOpen,
  onClose,
  printData,
}) => {
  if (!isOpen || !printData) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      exportLaporanKeuanganPDF({
        startDate: printData.startDate,
        endDate: printData.endDate,
        totalOmset: printData.totalOmset || 0,
        totalKgMie: printData.totalKgMie || 0,
        totalBiayaBahan: printData.totalBiayaBahan || 0,
        totalBiayaOps: printData.totalBiayaOps || 0,
        labaKotor: printData.labaKotor || 0,
        estimasiLabaBersih: printData.estimasiLabaBersih || 0,
        marginLabaKotor: printData.marginLabaKotor || 0,
        marginLabaBersih: printData.marginLabaBersih || 0,
        totalPiutang: printData.totalPiutang || 0,
        opsByCategory: printData.opsByCategory || {},
        penjualanList: printData.penjualanList || [],
        pemakaianList: printData.pemakaianList || [],
        operasionalList: printData.operasionalList || [],
        activeRole: printData.activeRole || 'admin_pusat',
      });
    } catch (err) {
      console.error('Gagal unduh PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] my-auto print:max-h-none print:border-none print:shadow-none print:my-0 print:w-full print:block overflow-hidden">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-bold text-slate-900">
              Pratinjau Cetak Laporan Resmi
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Unduh berkas PDF resmi untuk dikirimkan ke pemilik pabrik"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh PDF (.pdf)</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-300 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-4 sm:p-8 space-y-6 text-slate-900 font-sans overflow-y-auto flex-1 print:overflow-visible print:p-0" id="printable-report">
          {/* Header Surat Resmi Pabrik */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-red-700">
                PABRIK MIE SULAMJARI
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Pusat Produksi Mie Basah, Mie Keriting, Kulit Pangsit &amp; Aneka Olahan Tepung
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Alamat Pabrik: Jl. Industri Sentra Pangan No. 12, Jawa Timur • Telp: (031) 8829-1002
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase rounded bg-slate-100 border border-slate-300">
                Laporan Keuangan &amp; Produksi
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Dicetak: {new Date().toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Period Details */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between">
            <div>
              <span className="text-slate-500">Periode Laporan:</span>{' '}
              <strong className="text-slate-900">
                {formatDateIndo(printData.startDate)} s/d {formatDateIndo(printData.endDate)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Mata Uang:</span>{' '}
              <strong className="text-slate-900">Indonesian Rupiah (IDR)</strong>
            </div>
          </div>

          {/* Table Summary Rekap */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Ikhtisar Laba Rugi Operasional (P&amp;L)
            </h4>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Komponen Keuangan</th>
                    <th className="px-3 py-2 text-right">Nilai (Rp)</th>
                    <th className="px-3 py-2 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 font-bold text-slate-900">
                      Total Omset Penjualan Mie
                    </td>
                    <td className="px-3 py-2 text-right font-black text-emerald-700">
                      {formatRupiah(printData.totalOmset)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {formatNumber(printData.totalKgMie)} Kg ({printData.penjualanCount} transaksi)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-800">
                      Beban Pokok Produksi (HPP Bahan Terpakai)
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-amber-700">
                      ({formatRupiah(printData.totalBiayaBahan)})
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      Tepung, telur, kansui, minyak &amp; plastik
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2 uppercase">LABA KOTOR (GROSS PROFIT)</td>
                    <td className="px-3 py-2 text-right font-black text-slate-900">
                      {formatRupiah(printData.labaKotor)}
                    </td>
                    <td className="px-3 py-2 text-emerald-600 font-bold">
                      Margin: {printData.marginLabaKotor.toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-800">
                      Beban Operasional Pabrik
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-rose-700">
                      ({formatRupiah(printData.totalBiayaOps)})
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      Listrik, gas LPG, upah harian &amp; transport
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 font-black text-sm border-t-2 border-slate-400">
                    <td className="px-3 py-2.5 uppercase text-slate-900">
                      ESTIMASI LABA BERSIH (NET PROFIT)
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">
                      {formatRupiah(printData.estimasiLabaBersih)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700 font-semibold">
                      Net Margin: {printData.marginLabaBersih.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              2. Rincian Biaya Operasional Periode Ini
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(printData.opsByCategory || {}).map(([cat, val]: any) => (
                <div key={cat} className="flex justify-between p-2 border border-slate-100 rounded bg-slate-50">
                  <span className="text-slate-600">{cat}</span>
                  <span className="font-bold text-slate-900">{formatRupiah(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Piutang Warning */}
          {printData.totalPiutang > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              <strong>Catatan Piutang:</strong> Terdapat tagihan pelanggan belum tertagih sebesar{' '}
              <strong>{formatRupiah(printData.totalPiutang)}</strong> yang perlu difollow-up tim kasir/pengiriman.
            </div>
          )}

          {/* Tanda Tangan Pengesahan Resmi */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs">
            <div>
              <p className="text-slate-500">Dibuat &amp; Diverifikasi oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 border-b border-slate-400 inline-block px-8 pb-0.5">
                Staff Administrasi &amp; Gudang
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pabrik Mie Sulamjari</p>
            </div>
            <div>
              <p className="text-slate-500">Disetujui oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 border-b border-slate-400 inline-block px-8 pb-0.5">
                Pemilik / Direktur Pabrik
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pabrik Mie Sulamjari</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 7. MODAL CADANGAN DATA & FILE MANDIRI (STANDALONE HTML)
// -------------------------------------------------------------
interface ModalBackupProps {
  isOpen: boolean;
  onClose: () => void;
  allData: {
    bahan: BahanBaku[];
    mutasi: MutasiStok[];
    penjualan: PenjualanMie[];
    operasional: BiayaOperasional[];
  };
  onRestore: (data: any) => void;
  onReset: () => void;
}

export const ModalBackup: React.FC<ModalBackupProps> = ({
  isOpen,
  onClose,
  allData,
  onRestore,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 1. Download JSON Backup
  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Pabrik_Mie_Sulamjari_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // 2. Restore JSON from file
  const handleUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.bahan && parsed.mutasi && parsed.penjualan && parsed.operasional) {
          onRestore(parsed);
          alert('Berhasil memulihkan data Pabrik Mie Sulamjari!');
          onClose();
        } else {
          alert('Format file JSON tidak cocok dengan data sistem Sulamjari.');
        }
      } catch (err) {
        alert('Gagal membaca file JSON cadangan.');
      }
    };
    reader.readAsText(file);
  };

  // 3. Download Single HTML Standalone version (Alpine.js + Tailwind CDN)
  const handleDownloadSingleHTML = () => {
    const stateJSON = JSON.stringify(allData);
    const htmlTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pabrik Mie Sulamjari - Manajemen Operasional & Keuangan (Mandiri)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans min-h-screen" x-data="sulamjariApp()">
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-xl">🍜</div>
        <div>
          <h1 class="text-lg font-black tracking-tight text-slate-900">PABRIK MIE <span class="text-red-600">SULAMJARI</span></h1>
          <p class="text-xs text-slate-500">Versi Mandiri (Offline / Standalone HTML)</p>
        </div>
      </div>
      <div class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
        Penyimpanan Terpadu Aktif
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <!-- Ringkasan KPI -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-bold text-slate-400 uppercase">Total Bahan Baku</span>
        <div class="text-2xl font-black text-slate-900 mt-1" x-text="data.bahan.length + ' Item'"></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-bold text-slate-400 uppercase">Total Transaksi Penjualan</span>
        <div class="text-2xl font-black text-slate-900 mt-1" x-text="data.penjualan.length + ' Order'"></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-bold text-slate-400 uppercase">Total Mutasi Stok</span>
        <div class="text-2xl font-black text-slate-900 mt-1" x-text="data.mutasi.length + ' Catatan'"></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-bold text-slate-400 uppercase">Total Biaya Operasional</span>
        <div class="text-2xl font-black text-rose-700 mt-1" x-text="formatRupiah(getTotalOps())"></div>
      </div>
    </div>

    <!-- Tabel Master Bahan Baku -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 class="font-bold text-slate-900">📦 Master Data Stok Bahan Baku</h3>
        <span class="text-xs text-slate-500">Tersinkronisasi</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead class="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th class="p-3">Nama Bahan & Merk</th>
              <th class="p-3">Kategori</th>
              <th class="p-3 text-right">Harga Satuan</th>
              <th class="p-3 text-right">Stok Gudang</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template x-for="b in data.bahan" :key="b.id">
              <tr class="hover:bg-slate-50">
                <td class="p-3 font-semibold text-slate-900" x-text="b.nama + ' (' + b.merk + ')'"></td>
                <td class="p-3 text-slate-600" x-text="b.kategori"></td>
                <td class="p-3 text-right text-slate-700" x-text="formatRupiah(b.hargaSatuan) + ' / ' + b.satuan"></td>
                <td class="p-3 text-right font-bold text-slate-900" x-text="b.stokTersedia + ' ' + b.satuan"></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabel Penjualan Pelanggan -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 class="font-bold text-slate-900">🛍️ Penjualan Mie ke Pelanggan</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm">
          <thead class="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Pelanggan</th>
              <th class="p-3">Produk</th>
              <th class="p-3 text-right">Volume</th>
              <th class="p-3 text-right">Total Omset</th>
              <th class="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template x-for="p in data.penjualan" :key="p.id">
              <tr class="hover:bg-slate-50">
                <td class="p-3 text-slate-600" x-text="p.tanggal"></td>
                <td class="p-3 font-semibold text-slate-900" x-text="p.namaPelanggan"></td>
                <td class="p-3 text-slate-600" x-text="p.jenisProduk"></td>
                <td class="p-3 text-right font-bold" x-text="p.jumlahKg + ' Kg'"></td>
                <td class="p-3 text-right font-bold text-emerald-700" x-text="formatRupiah(p.totalOmset)"></td>
                <td class="p-3 text-center">
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold"
                        :class="p.statusPembayaran === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                        x-text="p.statusPembayaran"></span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <script>
    function sulamjariApp() {
      return {
        data: ${stateJSON},
        formatRupiah(val) {
          return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
        },
        getTotalOps() {
          return this.data.operasional.reduce((acc, curr) => acc + curr.nominal, 0);
        }
      };
    }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pabrik_Mie_Sulamjari_Mandiri_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-bold text-slate-900">
            Cadangan Data &amp; Berkas Mandiri
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 1. Ekspor CSV untuk Excel */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-700" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Ekspor Data ke Format Excel (.CSV)
                </h4>
                <p className="text-xs text-slate-600">
                  Unduh data terstruktur yang kompatibel langsung dengan Microsoft Excel &amp; Google Spreadsheet.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportBahanBakuCSV(allData.bahan)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV Bahan Baku</span>
              </button>
              <button
                type="button"
                onClick={() => exportPenjualanCSV(allData.penjualan)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV Penjualan Mie</span>
              </button>
            </div>
          </div>

          {/* 2. Download Standalone HTML */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-red-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Unduh Berkas HTML Mandiri
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Satu berkas HTML lengkap (dengan Tailwind &amp; Alpine.js) siap dibuka offline di HP/laptop tanpa instalasi apapun.
              </p>
            </div>
            <button
              onClick={handleDownloadSingleHTML}
              className="shrink-0 px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
            >
              Unduh .HTML
            </button>
          </div>

          {/* 2. Download JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Cadangkan Arsip Database (JSON)
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Simpan seluruh master bahan, mutasi stok, penjualan mie, dan biaya operasional.
              </p>
            </div>
            <button
              onClick={handleDownloadJSON}
              className="shrink-0 px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs"
            >
              Unduh .JSON
            </button>
          </div>

          {/* 3. Restore JSON */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Pulihkan Cadangan (Restore)
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Muat ulang berkas cadangan .json yang pernah Anda unduh sebelumnya.
              </p>
            </div>
            <label className="shrink-0 px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-xs cursor-pointer">
              Pilih File
              <input
                type="file"
                accept=".json"
                onChange={handleUploadJSON}
                className="hidden"
              />
            </label>
          </div>

          {/* 4. Reset to Initial Sample Data */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Ingin mengembalikan ke data sampel awal pabrik?
            </span>
            <button
              onClick={() => {
                if (confirm('Yakin ingin mereset seluruh data kembali ke sampel awal?')) {
                  onReset();
                }
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 underline"
            >
              Reset Data Awal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
