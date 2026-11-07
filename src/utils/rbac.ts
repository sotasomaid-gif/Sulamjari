import { UserRole, PermissionKey, SystemPermissions, RoleDefinition } from '../types';

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin_pusat: {
    id: 'admin_pusat',
    title: 'Admin Pusat',
    subtitle: 'Pemilik / Kantor Pusat',
    description: 'Memiliki otoritas penuh atas seluruh laporan keuangan, stok bahan baku, audit biaya, dan konfigurasi sistem.',
    badgeColor: 'bg-red-100 text-red-800 border-red-300',
    avatarBg: 'bg-red-600',
    textColor: 'text-red-700',
  },
  admin_pabrik: {
    id: 'admin_pabrik',
    title: 'Admin Pabrik',
    subtitle: 'Staf Administrasi & Kasir',
    description: 'Mengelola input transaksi order penjualan harian, nota operasional pabrik, stok masuk dan mutasi keluar.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    avatarBg: 'bg-blue-600',
    textColor: 'text-blue-700',
  },
  kepala_pabrik: {
    id: 'kepala_pabrik',
    title: 'Kepala Pabrik',
    subtitle: 'Supervisor & Mandor Produksi',
    description: 'Bertanggung jawab atas jalannya mesin giling, pemakaian bahan baku, target produksi harian, dan perawatan alat.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    avatarBg: 'bg-amber-600',
    textColor: 'text-amber-700',
  },
};

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  description: string;
  category: 'view' | 'action';
  affectsBlur: boolean;
}

export const PERMISSION_LIST: PermissionMeta[] = [
  // --- KATEGORI 1: HAK MELIHAT DATA (VIEW & BLUR) ---
  {
    key: 'view_dashboard',
    label: 'Melihat Ringkasan Dashboard',
    description: 'Akses ke halaman utama dashboard ringkasan operasional pabrik.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_omset_keuangan',
    label: 'Melihat Omset, Pendapatan & Saldo',
    description: 'Melihat angka rupiah omset harian, pendapatan kotor, piutang, dan saldo laba bersih. Jika nonaktif, angka akan DI-BLUR.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'lihat_keuangan',
    label: 'Melihat Ringkasan Keuangan (Omset & Operasional)',
    description: 'Melihat widget ringkasan total revenue (pendapatan/omset) dan total biaya operasional pabrik di Dashboard. Jika nonaktif, angka keuangan akan DI-BLUR.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_harga_beli_bahan',
    label: 'Melihat Harga Beli Bahan Baku',
    description: 'Melihat nilai rupiah kulakan per kg di Master Bahan & Mutasi Stok. Jika nonaktif, harga beli akan DI-BLUR.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_master_bahan',
    label: 'Melihat Master Bahan Baku',
    description: 'Akses ke daftar stok barang dan batas minimum bahan baku di gudang.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_stok_mutasi',
    label: 'Melihat Riwayat Mutasi Stok',
    description: 'Akses ke riwayat pencatatan barang masuk dan barang keluar.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_pemakaian_harian',
    label: 'Melihat Pemakaian Harian',
    description: 'Akses ke laporan perbandingan pemakaian bahan dengan mie yang dihasilkan.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_penjualan',
    label: 'Melihat Riwayat Penjualan Mie',
    description: 'Melihat daftar pesanan pelanggan mie basah, kulit pangsit, dll.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_piutang',
    label: 'Melihat Data Piutang Pelanggan',
    description: 'Melihat status pelanggan tempo dan rincian piutang yang belum terbayar. Jika nonaktif, data piutang akan DI-BLUR.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_operasional',
    label: 'Melihat Biaya Operasional Pabrik',
    description: 'Melihat catatan pengeluaran rutin listrik, gas LPG, transport, gaji, dan servis mesin.',
    category: 'view',
    affectsBlur: true,
  },
  {
    key: 'view_laba_rugi',
    label: 'Melihat Laporan Laba Rugi Komprehensif',
    description: 'Melihat analisis margin keuntungan, HPP mie, dan laporan keuangan komprehensif.',
    category: 'view',
    affectsBlur: true,
  },

  // --- KATEGORI 2: HAK MELAKUKAN TINDAKAN (ACTION) ---
  {
    key: 'action_tambah_bahan',
    label: 'Tambah / Edit Master Bahan Baku',
    description: 'Dapat menambahkan jenis bahan baru atau mengubah spesifikasi dan stok awal.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_hapus_bahan',
    label: 'Hapus Data Master Bahan',
    description: 'Dapat menghapus item bahan baku dari sistem.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_stok_masuk',
    label: 'Input Kulakan / Stok Masuk',
    description: 'Mencatat faktur pembelian bahan baku dari supplier.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_stok_keluar',
    label: 'Input Pemakaian Bahan Produksi',
    description: 'Mencatat pengeluaran karung tepung, butir telur, dan bumbu ke mesin giling.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_tambah_penjualan',
    label: 'Input Order Penjualan Mie (Kasir)',
    description: 'Mencatat pesanan mie pelanggan baru atau repeat order toko mie.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_edit_penjualan',
    label: 'Edit Order & Lunaskan Piutang',
    description: 'Dapat mengubah status pembayaran menjadi LUNAS atau mengedit rincian order.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_hapus_penjualan',
    label: 'Hapus Riwayat Penjualan',
    description: 'Dapat membatalkan atau menghapus transaksi penjualan dari database.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_tambah_operasional',
    label: 'Catat Pengeluaran Operasional',
    description: 'Input biaya listrik, gas LPG, transport, dll.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_hapus_operasional',
    label: 'Hapus Biaya Operasional',
    description: 'Dapat menghapus bukti biaya operasional.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_atur_target',
    label: 'Atur Target Produksi Harian (Kg)',
    description: 'Mengubah sasaran target gilingan mie harian pabrik.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_cetak_laporan',
    label: 'Cetak Laporan / PDF Struk',
    description: 'Mencetak struk order, rekap stok, atau laporan operasional.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_ekspor_backup',
    label: 'Ekspor File CSV & Cadangan Data',
    description: 'Mengunduh laporan tabel ke Excel/CSV atau mencadangkan JSON sistem.',
    category: 'action',
    affectsBlur: false,
  },
  {
    key: 'action_kelola_akses',
    label: 'Mengatur Hak Akses Pengguna',
    description: 'Dapat mengubah checklist izin untuk seluruh peran (Admin Pusat, Admin Pabrik, Kepala Pabrik).',
    category: 'action',
    affectsBlur: false,
  },
];

export const DEFAULT_SYSTEM_PERMISSIONS: SystemPermissions = {
  admin_pusat: {
    view_dashboard: true,
    view_omset_keuangan: true,
    lihat_keuangan: true,
    view_harga_beli_bahan: true,
    view_master_bahan: true,
    view_stok_mutasi: true,
    view_pemakaian_harian: true,
    view_penjualan: true,
    view_piutang: true,
    view_operasional: true,
    view_laba_rugi: true,
    action_tambah_bahan: true,
    action_hapus_bahan: true,
    action_stok_masuk: true,
    action_stok_keluar: true,
    action_tambah_penjualan: true,
    action_edit_penjualan: true,
    action_hapus_penjualan: true,
    action_tambah_operasional: true,
    action_hapus_operasional: true,
    action_atur_target: true,
    action_cetak_laporan: true,
    action_ekspor_backup: true,
    action_kelola_akses: true,
  },
  admin_pabrik: {
    view_dashboard: true,
    view_omset_keuangan: true,
    lihat_keuangan: true,
    view_harga_beli_bahan: false, // Disembunyikan (blur) dari admin pabrik
    view_master_bahan: true,
    view_stok_mutasi: true,
    view_pemakaian_harian: true,
    view_penjualan: true,
    view_piutang: true,
    view_operasional: true,
    view_laba_rugi: false, // Disembunyikan (blur) dari admin pabrik
    action_tambah_bahan: false,
    action_hapus_bahan: false,
    action_stok_masuk: true,
    action_stok_keluar: true,
    action_tambah_penjualan: true,
    action_edit_penjualan: true,
    action_hapus_penjualan: false,
    action_tambah_operasional: true,
    action_hapus_operasional: false,
    action_atur_target: false,
    action_cetak_laporan: true,
    action_ekspor_backup: true,
    action_kelola_akses: false,
  },
  kepala_pabrik: {
    view_dashboard: true,
    view_omset_keuangan: false, // Disembunyikan (blur) dari kepala pabrik
    lihat_keuangan: false, // Disembunyikan (blur) dari kepala pabrik: omset & biaya operasional
    view_harga_beli_bahan: false, // Disembunyikan (blur)
    view_master_bahan: true,
    view_stok_mutasi: true,
    view_pemakaian_harian: true,
    view_penjualan: true, // Bisa lihat kg order mie untuk panduan gilingan
    view_piutang: false, // Disembunyikan (blur)
    view_operasional: false, // Biaya operasional nominal rupiah disembunyikan (blur)
    view_laba_rugi: false, // Disembunyikan (blur)
    action_tambah_bahan: true,
    action_hapus_bahan: false,
    action_stok_masuk: true,
    action_stok_keluar: true,
    action_tambah_penjualan: false,
    action_edit_penjualan: false,
    action_hapus_penjualan: false,
    action_tambah_operasional: true,
    action_hapus_operasional: false,
    action_atur_target: true, // Kepala pabrik boleh atur target produksi
    action_cetak_laporan: true,
    action_ekspor_backup: false,
    action_kelola_akses: false,
  },
};

const STORAGE_KEY_PERMISSIONS = 'sulamjari_system_permissions_v1';
const STORAGE_KEY_ACTIVE_ROLE = 'sulamjari_active_role_v1';

export const loadStoredPermissions = (): SystemPermissions => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERMISSIONS);
    if (!raw) return DEFAULT_SYSTEM_PERMISSIONS;
    const parsed = JSON.parse(raw);
    // Merge with defaults to ensure all keys exist even if new keys are added
    return {
      admin_pusat: { ...DEFAULT_SYSTEM_PERMISSIONS.admin_pusat, ...(parsed.admin_pusat || {}) },
      admin_pabrik: { ...DEFAULT_SYSTEM_PERMISSIONS.admin_pabrik, ...(parsed.admin_pabrik || {}) },
      kepala_pabrik: { ...DEFAULT_SYSTEM_PERMISSIONS.kepala_pabrik, ...(parsed.kepala_pabrik || {}) },
    };
  } catch (e) {
    console.error('Error loading stored permissions:', e);
    return DEFAULT_SYSTEM_PERMISSIONS;
  }
};

export const saveStoredPermissions = (perms: SystemPermissions) => {
  try {
    localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(perms));
    window.dispatchEvent(new CustomEvent('sulamjari-permissions-updated', { detail: perms }));
  } catch (e) {
    console.warn('Failed to save stored permissions:', e);
  }
};

export const fetchPermissionsFromServer = async (): Promise<SystemPermissions | null> => {
  try {
    const res = await fetch('/api/permissions');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.permissions) {
        saveStoredPermissions(data.permissions);
        return data.permissions;
      }
    }
  } catch (err) {
    console.warn('fetchPermissionsFromServer fallback to local:', err);
  }
  return null;
};

export const savePermissionsToServer = async (
  perms: SystemPermissions,
  actor?: string
): Promise<boolean> => {
  try {
    const res = await fetch('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissions: perms,
        actor: actor || 'Admin Pusat',
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('savePermissionsToServer failed:', err);
    return false;
  }
};

export const loadActiveRole = (): UserRole => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_ROLE) as UserRole | null;
    if (raw && (raw === 'admin_pusat' || raw === 'admin_pabrik' || raw === 'kepala_pabrik')) {
      return raw;
    }
    return 'admin_pusat';
  } catch {
    return 'admin_pusat';
  }
};

export const saveActiveRole = (role: UserRole) => {
  localStorage.setItem(STORAGE_KEY_ACTIVE_ROLE, role);
};
