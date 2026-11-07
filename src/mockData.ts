import { BahanBaku, MutasiStok, PenjualanMie, BiayaOperasional } from './types';

// Helper to get formatted date string: YYYY-MM-DD
export const getTodayStr = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const getPastDateStr = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// Database Bersih: Hanya data riil dari input pengguna/pegawai
export const INITIAL_BAHAN_BAKU: BahanBaku[] = [];
export const INITIAL_MUTASI_STOK: MutasiStok[] = [];
export const INITIAL_PENJUALAN: PenjualanMie[] = [];
export const INITIAL_OPERASIONAL: BiayaOperasional[] = [];
