import { BahanBaku, MutasiStok, PenjualanMie, BiayaOperasional } from '../types';
import { INITIAL_BAHAN_BAKU, INITIAL_MUTASI_STOK, INITIAL_PENJUALAN, INITIAL_OPERASIONAL } from '../mockData';

const STORAGE_KEYS = {
  BAHAN_BAKU: 'sulamjari_bahan_baku_v1',
  MUTASI_STOK: 'sulamjari_mutasi_stok_v1',
  PENJUALAN: 'sulamjari_penjualan_v1',
  OPERASIONAL: 'sulamjari_operasional_v1',
};

export const loadStoredData = () => {
  try {
    const rawBahan = localStorage.getItem(STORAGE_KEYS.BAHAN_BAKU);
    const rawMutasi = localStorage.getItem(STORAGE_KEYS.MUTASI_STOK);
    const rawPenjualan = localStorage.getItem(STORAGE_KEYS.PENJUALAN);
    const rawOperasional = localStorage.getItem(STORAGE_KEYS.OPERASIONAL);

    const bahan: BahanBaku[] = rawBahan ? JSON.parse(rawBahan) : INITIAL_BAHAN_BAKU;
    const mutasi: MutasiStok[] = rawMutasi ? JSON.parse(rawMutasi) : INITIAL_MUTASI_STOK;
    const penjualan: PenjualanMie[] = rawPenjualan ? JSON.parse(rawPenjualan) : INITIAL_PENJUALAN;
    const operasional: BiayaOperasional[] = rawOperasional ? JSON.parse(rawOperasional) : INITIAL_OPERASIONAL;

    return { bahan, mutasi, penjualan, operasional };
  } catch (err) {
    console.error('Error reading localStorage, using mock data:', err);
    return {
      bahan: INITIAL_BAHAN_BAKU,
      mutasi: INITIAL_MUTASI_STOK,
      penjualan: INITIAL_PENJUALAN,
      operasional: INITIAL_OPERASIONAL,
    };
  }
};

export const saveBahanData = (data: BahanBaku[]) => {
  localStorage.setItem(STORAGE_KEYS.BAHAN_BAKU, JSON.stringify(data));
};

export const saveMutasiData = (data: MutasiStok[]) => {
  localStorage.setItem(STORAGE_KEYS.MUTASI_STOK, JSON.stringify(data));
};

export const savePenjualanData = (data: PenjualanMie[]) => {
  localStorage.setItem(STORAGE_KEYS.PENJUALAN, JSON.stringify(data));
};

export const saveOperasionalData = (data: BiayaOperasional[]) => {
  localStorage.setItem(STORAGE_KEYS.OPERASIONAL, JSON.stringify(data));
};

export const resetAllData = () => {
  localStorage.removeItem(STORAGE_KEYS.BAHAN_BAKU);
  localStorage.removeItem(STORAGE_KEYS.MUTASI_STOK);
  localStorage.removeItem(STORAGE_KEYS.PENJUALAN);
  localStorage.removeItem(STORAGE_KEYS.OPERASIONAL);
  window.location.reload();
};

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num || 0);
};

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
};

// Export CSV Utilities (Excel-compatible with UTF-8 BOM)
export {
  downloadCSV,
  exportBahanBakuCSV,
  exportPenjualanCSV,
  exportMutasiStokCSV,
  exportPemakaianHarianCSV,
  exportOperasionalCSV,
  exportLaporanKeuanganCSV,
} from './csvExport';
