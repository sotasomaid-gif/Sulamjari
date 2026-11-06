export type KategoriBahan = 'Tepung' | 'Telur' | 'Minyak' | 'Bumbu & Kimiawi' | 'Kemasan' | 'Lainnya';

export type SatuanBahan = 'Kg' | 'Pcs' | 'Liter' | 'Gram' | 'Pack' | 'Karung (25kg)' | 'Jerigen (20L)';

export interface BahanBaku {
  id: string;
  nama: string;
  kategori: KategoriBahan;
  satuan: SatuanBahan;
  merk: string;
  hargaSatuan: number; // Harga per satuan
  stokTersedia: number;
  minStok: number; // batas peringatan
  terakhirDiperbarui: string;
}

export type TipeMutasi = 'MASUK' | 'KELUAR';

export interface MutasiStok {
  id: string;
  tanggal: string; // YYYY-MM-DD
  bahanId: string;
  namaBahan: string;
  tipe: TipeMutasi;
  jumlah: number;
  satuan: SatuanBahan;
  hargaSatuan: number;
  totalBiaya: number; // untuk stok masuk: nilai nota pembelian; untuk keluar: estimasi nilai bahan
  supplierOrKeterangan: string; // nama supplier jika masuk, keterangan produksi jika keluar
  createdAt: string;
}

export type StatusPembayaran = 'LUNAS' | 'BELUM_LUNAS' | 'PIUTANG';

export interface PenjualanMie {
  id: string;
  tanggal: string; // YYYY-MM-DD
  namaPelanggan: string; // e.g., Mie Ayam Pak Joko, Depot Podomoro
  telepon?: string;
  jenisProduk: string; // e.g., Mie Basah Standar, Mie Keriting Telur, Mie Pangsit, Kulit Pangsit
  jumlahKg: number;
  hargaPerKg: number;
  totalOmset: number; // jumlahKg * hargaPerKg
  statusPembayaran: StatusPembayaran;
  metodePembayaran: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Tempo / Piutang';
  catatan?: string;
}

export type KategoriOperasional = 
  | 'Listrik' 
  | 'Gas LPG' 
  | 'Gaji Karyawan' 
  | 'Transport / Bensin' 
  | 'Perawatan Mesin' 
  | 'Kebersihan & Air' 
  | 'Lain-lain';

export interface BiayaOperasional {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: KategoriOperasional;
  deskripsi: string;
  nominal: number;
  penanggungJawab: string;
  buktiNota?: string;
}

// --- HAK AKSES & ROLE-BASED ACCESS CONTROL (RBAC) ---
export type UserRole = 'admin_pusat' | 'admin_pabrik' | 'kepala_pabrik';

export interface RoleDefinition {
  id: UserRole;
  title: string;
  subtitle: string;
  description: string;
  badgeColor: string;
  avatarBg: string;
  textColor: string;
}

export type PermissionKey =
  // View Permissions (Data yang bisa dilihat / blur jika tidak diizinkan)
  | 'view_dashboard'
  | 'view_omset_keuangan'
  | 'lihat_keuangan' // Izin melihat ringkasan keuangan (total revenue / omset & operational costs / biaya operasional)
  | 'view_harga_beli_bahan'
  | 'view_master_bahan'
  | 'view_stok_mutasi'
  | 'view_pemakaian_harian'
  | 'view_penjualan'
  | 'view_piutang'
  | 'view_operasional'
  | 'view_laba_rugi'
  // Action Permissions (Melakukan tindakan apa saja)
  | 'action_tambah_bahan'
  | 'action_hapus_bahan'
  | 'action_stok_masuk'
  | 'action_stok_keluar'
  | 'action_tambah_penjualan'
  | 'action_edit_penjualan'
  | 'action_hapus_penjualan'
  | 'action_tambah_operasional'
  | 'action_hapus_operasional'
  | 'action_atur_target'
  | 'action_cetak_laporan'
  | 'action_ekspor_backup'
  | 'action_kelola_akses';

export type RolePermissionMap = Record<PermissionKey, boolean>;

export type SystemPermissions = Record<UserRole, RolePermissionMap>;

export type StatusPersetujuanAkun = 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK';

export interface UserAccount {
  id: string;
  nama: string;
  username: string; // Username akun login (Nomor WhatsApp / ID Login)
  noHp: string; // Nomer HP WhatsApp aktif
  password: string; // Password login akun
  role: UserRole;
  statusPersetujuan: StatusPersetujuanAkun; // Menunggu konfirmasi admin pusat
  disetujuiOleh?: string;
  disetujuiPada?: string;
  isVerified: boolean; // Terverifikasi via OTP WA
  createdAt: string;
  lastOtp?: string;
  otpExpiresAt?: number;
}


