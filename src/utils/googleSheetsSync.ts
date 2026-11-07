import { BahanBaku, MutasiStok, PenjualanMie, BiayaOperasional, UserAccount, SystemPermissions } from '../types';

export interface SheetsSyncConfig {
  webAppUrl: string;
  spreadsheetUrl?: string;
  autoSyncEnabled: boolean;
  lastSyncTime?: string;
  lastSyncStatus: 'idle' | 'success' | 'error' | 'syncing';
  lastSyncMessage?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'push' | 'pull' | 'ping' | 'init' | 'auto';
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: string;
}

const CONFIG_STORAGE_KEY = 'sulamjari_sheets_sync_config_v1';
const LOGS_STORAGE_KEY = 'sulamjari_sheets_sync_logs_v1';

export const DEFAULT_SHEETS_CONFIG: SheetsSyncConfig = {
  webAppUrl: '',
  spreadsheetUrl: '',
  autoSyncEnabled: true,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'Belum dikonfigurasikan',
};

// Ready-to-deploy Google Apps Script Code template
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT DATABASE BACKEND - PABRIK MIE SULAMJARI
 * ==============================================================================
 * Versi: 2.0 - Full CRUD, Auto Schema Setup, Auto Formatting & Multi-Table Sync
 * 
 * CARA MEMASANG:
 * 1. Buat Google Spreadsheet baru di https://sheets.new
 * 2. Beri nama Spreadsheet: "Database Pabrik Mie Sulamjari"
 * 3. Klik menu: Extensions (Ekstensi) > Apps Script
 * 4. Hapus semua teks di editor, tempelkan SELURUH KODE INI
 * 5. Klik icon Simpan (Ctrl+S / Cmd+S)
 * 6. Klik tombol "Deploy" (Terapkan) > "New deployment" (Penerapan baru)
 * 7. Pilih tipe: "Web app" (Aplikasi web)
 * 8. Konfigurasi:
 *    - Description: "Sulamjari DB API v2"
 *    - Execute as: "Me" (Email Google Anda)
 *    - Who has access: "Anyone" (Siapa saja - penting agar aplikasi bisa akses)
 * 9. Klik "Deploy", beri izin akses Google (Advanced > Go to script), lalu salin "Web App URL"
 * 10. Tempelkan URL tersebut ke aplikasi Pabrik Mie Sulamjari!
 * ==============================================================================
 */

// Konstanta Nama Sheet / Tabel
const TABLES = {
  BAHAN_BAKU: 'BahanBaku',
  MUTASI_STOK: 'MutasiStok',
  PENJUALAN: 'PenjualanMie',
  OPERASIONAL: 'BiayaOperasional',
  TARGET_PRODUKSI: 'TargetProduksi',
  USERS: 'AkunPengguna',
  HAK_AKSES: 'PengaturanAkses',
  LOGS: 'LogAktivitas'
};

// Struktur Header Kolom untuk Setiap Tabel
const SCHEMAS = {
  [TABLES.BAHAN_BAKU]: [
    'ID Bahan', 'Nama Bahan', 'Kategori', 'Satuan', 'Merk', 
    'Harga Satuan (Rp)', 'Stok Tersedia', 'Batas Min Stok', 'Terakhir Diperbarui'
  ],
  [TABLES.MUTASI_STOK]: [
    'ID Mutasi', 'Tanggal (YYYY-MM-DD)', 'ID Bahan', 'Nama Bahan', 'Tipe (MASUK/KELUAR)', 
    'Jumlah', 'Satuan', 'Harga Satuan (Rp)', 'Total Biaya (Rp)', 'Supplier / Keterangan', 'Waktu Dicatat'
  ],
  [TABLES.PENJUALAN]: [
    'ID Penjualan', 'Tanggal (YYYY-MM-DD)', 'Nama Pelanggan', 'No HP / WhatsApp', 
    'Jenis Produk Mie', 'Jumlah (Kg)', 'Harga per Kg (Rp)', 'Total Omset (Rp)', 
    'Status Pembayaran', 'Metode Pembayaran', 'Catatan Pesanan'
  ],
  [TABLES.OPERASIONAL]: [
    'ID Biaya', 'Tanggal (YYYY-MM-DD)', 'Kategori Operasional', 'Deskripsi Pengeluaran', 
    'Nominal (Rp)', 'Penanggung Jawab', 'Bukti Nota / Dokumen'
  ],
  [TABLES.TARGET_PRODUKSI]: [
    'Target Harian (Kg)', 'Terakhir Diperbarui', 'Keterangan Sistem'
  ],
  [TABLES.USERS]: [
    'ID Pengguna', 'Nama Lengkap', 'Username Login', 'Password Akun', 'Nomor WhatsApp', 
    'Role Model', 'Status Persetujuan', 'Status Terverifikasi (OTP)', 'Kode OTP Terakhir', 
    'Tanggal Pendaftaran', 'Disetujui Oleh'
  ],
  [TABLES.HAK_AKSES]: [
    'Role Model', 'Konfigurasi Izin Akses (JSON)', 'Terakhir Diperbarui'
  ],
  [TABLES.LOGS]: [
    'Waktu Aktivitas', 'Jenis Aksi', 'User Penanggung Jawab', 'Status', 'Rincian Aktivitas'
  ]
};

/**
 * Handle HTTP GET Request
 * Mendukung uji koneksi (ping) dan penarikan data (getAllData / getTable)
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'ping';

    if (action === 'ping') {
      setupDatabaseIfMissing();
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        message: 'Koneksi ke Google Spreadsheet Pabrik Mie Sulamjari berhasil aktif!',
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        timestamp: new Date().toISOString(),
        tables: Object.keys(TABLES).map(k => TABLES[k])
      });
    }

    if (action === 'getAllData') {
      const allData = fetchAllDatabaseData();
      return jsonResponse({
        success: true,
        message: 'Berhasil menarik semua data dari Google Spreadsheet',
        timestamp: new Date().toISOString(),
        data: allData
      });
    }

    return jsonResponse({
      success: false,
      message: 'Aksi GET tidak dikenali: ' + action
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Handle HTTP POST Request
 * Menerima payload JSON untuk sinkronisasi penuh, penambahan record, atau reset skema
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (pErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || 'syncAll';
    setupDatabaseIfMissing();

    if (action === 'setupDatabase' || action === 'init') {
      setupDatabase(true);
      return jsonResponse({
        success: true,
        message: 'Struktur sheet dan database Google Spreadsheet berhasil diinisialisasi ulang!',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'syncAll') {
      const data = payload.data || {};
      syncAllDataToSpreadsheet(data);
      appendLogEntry('SINKRONISASI_PENUH', payload.user || 'Sistem', 'SUKSES', 'Semua data modul berhasil disinkronkan ke Google Sheet');
      
      return jsonResponse({
        success: true,
        message: 'Semua data berhasil disimpan dan diperbarui di Google Spreadsheet!',
        timestamp: new Date().toISOString(),
        counts: {
          bahan: (data.bahanList || []).length,
          mutasi: (data.mutasiList || []).length,
          penjualan: (data.penjualanList || []).length,
          operasional: (data.operasionalList || []).length,
          users: (data.users || []).length
        }
      });
    }

    if (action === 'insertRecord') {
      const table = payload.table;
      const record = payload.record;
      if (!table || !record) {
        throw new Error('Parameter table dan record wajib diisi');
      }
      insertSingleRecord(table, record);
      appendLogEntry('TAMBAH_DATA', payload.user || 'Sistem', 'SUKSES', 'Menambahkan baris baru ke tabel ' + table);

      return jsonResponse({
        success: true,
        message: 'Data berhasil ditambahkan ke tabel ' + table,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'syncUsers') {
      const users = payload.users || [];
      const sheet = getOrCreateSheet(ss, TABLES.USERS, SCHEMAS[TABLES.USERS]);
      clearSheetDataKeepHeader(sheet);
      if (users.length > 0) {
        const rows = users.map(u => [
          u.id || '',
          u.nama || '',
          u.username ? "'" + u.username : (u.noHp ? "'" + u.noHp : ''),
          u.password || '',
          u.noHp ? "'" + u.noHp : '',
          u.role || 'admin_pabrik',
          u.statusPersetujuan || 'DISETUJUI',
          u.isVerified ? 'TERVERIFIKASI' : 'BELUM',
          u.lastOtp || '',
          u.createdAt || '',
          u.disetujuiOleh || ''
        ]);
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      appendLogEntry('SINKRONISASI_USER', payload.user || 'Sistem', 'SUKSES', 'Menyimpan ' + users.length + ' data akun pegawai ke Google Sheet');
      return jsonResponse({
        success: true,
        message: 'Data akun pegawai berhasil disimpan ke Google Spreadsheet!',
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({
      success: false,
      message: 'Aksi POST tidak dikenali: ' + action
    });

  } catch (err) {
    appendLogEntry('ERROR_SISTEM', 'API', 'GAGAL', err.toString());
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Sinkronisasi Semua Modul ke Sheet Masing-Masing
 */
function syncAllDataToSpreadsheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Bahan Baku
  if (data.bahanList && Array.isArray(data.bahanList)) {
    const sheet = getOrCreateSheet(ss, TABLES.BAHAN_BAKU, SCHEMAS[TABLES.BAHAN_BAKU]);
    clearSheetDataKeepHeader(sheet);
    if (data.bahanList.length > 0) {
      const rows = data.bahanList.map(b => [
        b.id || '',
        b.nama || '',
        b.kategori || '',
        b.satuan || '',
        b.merk || '',
        Number(b.hargaSatuan) || 0,
        Number(b.stokTersedia) || 0,
        Number(b.minStok) || 0,
        b.terakhirDiperbarui || ''
      ]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      // Format number and currency
      sheet.getRange(2, 6, rows.length, 1).setNumberFormat('Rp #,##0');
      sheet.getRange(2, 7, rows.length, 2).setNumberFormat('#,##0.00');
    }
  }

  // 2. Mutasi Stok
  if (data.mutasiList && Array.isArray(data.mutasiList)) {
    const sheet = getOrCreateSheet(ss, TABLES.MUTASI_STOK, SCHEMAS[TABLES.MUTASI_STOK]);
    clearSheetDataKeepHeader(sheet);
    if (data.mutasiList.length > 0) {
      const rows = data.mutasiList.map(m => [
        m.id || '',
        m.tanggal || '',
        m.bahanId || '',
        m.namaBahan || '',
        m.tipe || 'MASUK',
        Number(m.jumlah) || 0,
        m.satuan || '',
        Number(m.hargaSatuan) || 0,
        Number(m.totalBiaya) || 0,
        m.supplierOrKeterangan || '',
        m.createdAt || new Date().toISOString()
      ]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      sheet.getRange(2, 8, rows.length, 2).setNumberFormat('Rp #,##0');
    }
  }

  // 3. Penjualan Mie
  if (data.penjualanList && Array.isArray(data.penjualanList)) {
    const sheet = getOrCreateSheet(ss, TABLES.PENJUALAN, SCHEMAS[TABLES.PENJUALAN]);
    clearSheetDataKeepHeader(sheet);
    if (data.penjualanList.length > 0) {
      const rows = data.penjualanList.map(p => [
        p.id || '',
        p.tanggal || '',
        p.namaPelanggan || '',
        p.telepon || '',
        p.jenisProduk || '',
        Number(p.jumlahKg) || 0,
        Number(p.hargaPerKg) || 0,
        Number(p.totalOmset) || 0,
        p.statusPembayaran || 'LUNAS',
        p.metodePembayaran || 'Tunai',
        p.catatan || ''
      ]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      sheet.getRange(2, 6, rows.length, 1).setNumberFormat('#,##0.00');
      sheet.getRange(2, 7, rows.length, 2).setNumberFormat('Rp #,##0');
    }
  }

  // 4. Biaya Operasional
  if (data.operasionalList && Array.isArray(data.operasionalList)) {
    const sheet = getOrCreateSheet(ss, TABLES.OPERASIONAL, SCHEMAS[TABLES.OPERASIONAL]);
    clearSheetDataKeepHeader(sheet);
    if (data.operasionalList.length > 0) {
      const rows = data.operasionalList.map(o => [
        o.id || '',
        o.tanggal || '',
        o.kategori || '',
        o.deskripsi || '',
        Number(o.nominal) || 0,
        o.penanggungJawab || '',
        o.buktiNota || ''
      ]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      sheet.getRange(2, 5, rows.length, 1).setNumberFormat('Rp #,##0');
    }
  }

  // 5. Target Produksi
  if (data.targetProduksiKg !== undefined) {
    const sheet = getOrCreateSheet(ss, TABLES.TARGET_PRODUKSI, SCHEMAS[TABLES.TARGET_PRODUKSI]);
    clearSheetDataKeepHeader(sheet);
    sheet.getRange(2, 1, 1, 3).setValues([[
      Number(data.targetProduksiKg) || 150,
      new Date().toISOString(),
      'Target produksi harian mie basah Pabrik Sulamjari'
    ]]);
    sheet.getRange(2, 1, 1, 1).setNumberFormat('#,##0 "Kg"');
  }

  // 6. Users (Akun Pengguna)
  if (data.users && Array.isArray(data.users)) {
    const sheet = getOrCreateSheet(ss, TABLES.USERS, SCHEMAS[TABLES.USERS]);
    clearSheetDataKeepHeader(sheet);
    if (data.users.length > 0) {
      const rows = data.users.map(u => [
        u.id || '',
        u.nama || '',
        u.username ? "'" + u.username : (u.noHp ? "'" + u.noHp : ''),
        u.password || '',
        u.noHp ? "'" + u.noHp : '',
        u.role || 'admin_pabrik',
        u.statusPersetujuan || 'DISETUJUI',
        u.isVerified ? 'TERVERIFIKASI' : 'BELUM',
        u.lastOtp || '',
        u.createdAt || '',
        u.disetujuiOleh || ''
      ]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }

  // 7. Hak Akses (Role Permissions)
  if (data.permissions) {
    const sheet = getOrCreateSheet(ss, TABLES.HAK_AKSES, SCHEMAS[TABLES.HAK_AKSES]);
    clearSheetDataKeepHeader(sheet);
    const roles = Object.keys(data.permissions);
    if (roles.length > 0) {
      const rows = roles.map(role => [
        role,
        JSON.stringify(data.permissions[role]),
        new Date().toISOString()
      ]);
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}

/**
 * Menambahkan 1 Record Secara Langsung
 */
function insertSingleRecord(tableName, record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    setupDatabaseIfMissing();
  }

  const targetSheet = ss.getSheetByName(tableName);
  if (!targetSheet) {
    throw new Error('Sheet ' + tableName + ' tidak ditemukan');
  }

  let rowValues = [];
  if (tableName === TABLES.BAHAN_BAKU) {
    rowValues = [
      record.id || Utilities.getUuid(),
      record.nama || '',
      record.kategori || '',
      record.satuan || '',
      record.merk || '',
      Number(record.hargaSatuan) || 0,
      Number(record.stokTersedia) || 0,
      Number(record.minStok) || 0,
      record.terakhirDiperbarui || new Date().toISOString().split('T')[0]
    ];
  } else if (tableName === TABLES.MUTASI_STOK) {
    rowValues = [
      record.id || Utilities.getUuid(),
      record.tanggal || new Date().toISOString().split('T')[0],
      record.bahanId || '',
      record.namaBahan || '',
      record.tipe || 'MASUK',
      Number(record.jumlah) || 0,
      record.satuan || '',
      Number(record.hargaSatuan) || 0,
      Number(record.totalBiaya) || 0,
      record.supplierOrKeterangan || '',
      record.createdAt || new Date().toISOString()
    ];
  } else if (tableName === TABLES.PENJUALAN) {
    rowValues = [
      record.id || Utilities.getUuid(),
      record.tanggal || new Date().toISOString().split('T')[0],
      record.namaPelanggan || '',
      record.telepon || '',
      record.jenisProduk || '',
      Number(record.jumlahKg) || 0,
      Number(record.hargaPerKg) || 0,
      Number(record.totalOmset) || 0,
      record.statusPembayaran || 'LUNAS',
      record.metodePembayaran || 'Tunai',
      record.catatan || ''
    ];
  } else if (tableName === TABLES.OPERASIONAL) {
    rowValues = [
      record.id || Utilities.getUuid(),
      record.tanggal || new Date().toISOString().split('T')[0],
      record.kategori || '',
      record.deskripsi || '',
      Number(record.nominal) || 0,
      record.penanggungJawab || '',
      record.buktiNota || ''
    ];
  } else if (tableName === TABLES.USERS) {
    rowValues = [
      record.id || Utilities.getUuid(),
      record.nama || '',
      record.username ? "'" + record.username : (record.noHp ? "'" + record.noHp : ''),
      record.password || '',
      record.noHp ? "'" + record.noHp : '',
      record.role || 'admin_pabrik',
      record.statusPersetujuan || 'MENUNGGU_PERSETUJUAN',
      record.isVerified ? 'TERVERIFIKASI' : 'BELUM',
      record.lastOtp || '',
      record.createdAt || new Date().toISOString().split('T')[0],
      record.disetujuiOleh || ''
    ];
  } else {
    rowValues = Object.keys(record).map(k => record[k]);
  }

  targetSheet.appendRow(rowValues);
}

/**
 * Menarik Semua Data dari Seluruh Sheet untuk Sinkronisasi ke Web App
 */
function fetchAllDatabaseData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {
    bahanList: [],
    mutasiList: [],
    penjualanList: [],
    operasionalList: [],
    targetProduksiKg: 150,
    users: [],
    permissions: null
  };

  // Bahan
  const bSheet = ss.getSheetByName(TABLES.BAHAN_BAKU);
  if (bSheet && bSheet.getLastRow() > 1) {
    const data = bSheet.getRange(2, 1, bSheet.getLastRow() - 1, 9).getValues();
    result.bahanList = data.map(r => ({
      id: String(r[0]),
      nama: String(r[1]),
      kategori: r[2],
      satuan: r[3],
      merk: String(r[4] || ''),
      hargaSatuan: Number(r[5]) || 0,
      stokTersedia: Number(r[6]) || 0,
      minStok: Number(r[7]) || 0,
      terakhirDiperbarui: formatDateVal(r[8])
    }));
  }

  // Mutasi
  const mSheet = ss.getSheetByName(TABLES.MUTASI_STOK);
  if (mSheet && mSheet.getLastRow() > 1) {
    const data = mSheet.getRange(2, 1, mSheet.getLastRow() - 1, 11).getValues();
    result.mutasiList = data.map(r => ({
      id: String(r[0]),
      tanggal: formatDateVal(r[1]),
      bahanId: String(r[2]),
      namaBahan: String(r[3]),
      tipe: r[4],
      jumlah: Number(r[5]) || 0,
      satuan: r[6],
      hargaSatuan: Number(r[7]) || 0,
      totalBiaya: Number(r[8]) || 0,
      supplierOrKeterangan: String(r[9] || ''),
      createdAt: String(r[10] || '')
    }));
  }

  // Penjualan
  const pSheet = ss.getSheetByName(TABLES.PENJUALAN);
  if (pSheet && pSheet.getLastRow() > 1) {
    const data = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, 11).getValues();
    result.penjualanList = data.map(r => ({
      id: String(r[0]),
      tanggal: formatDateVal(r[1]),
      namaPelanggan: String(r[2]),
      telepon: String(r[3] || ''),
      jenisProduk: String(r[4]),
      jumlahKg: Number(r[5]) || 0,
      hargaPerKg: Number(r[6]) || 0,
      totalOmset: Number(r[7]) || 0,
      statusPembayaran: r[8],
      metodePembayaran: r[9],
      catatan: String(r[10] || '')
    }));
  }

  // Operasional
  const oSheet = ss.getSheetByName(TABLES.OPERASIONAL);
  if (oSheet && oSheet.getLastRow() > 1) {
    const data = oSheet.getRange(2, 1, oSheet.getLastRow() - 1, 7).getValues();
    result.operasionalList = data.map(r => ({
      id: String(r[0]),
      tanggal: formatDateVal(r[1]),
      kategori: r[2],
      deskripsi: String(r[3]),
      nominal: Number(r[4]) || 0,
      penanggungJawab: String(r[5] || ''),
      buktiNota: String(r[6] || '')
    }));
  }

  // Target Produksi
  const tSheet = ss.getSheetByName(TABLES.TARGET_PRODUKSI);
  if (tSheet && tSheet.getLastRow() > 1) {
    const val = tSheet.getRange(2, 1).getValue();
    if (val) result.targetProduksiKg = Number(val) || 150;
  }

  // Users
  const uSheet = ss.getSheetByName(TABLES.USERS);
  if (uSheet && uSheet.getLastRow() > 1) {
    const data = uSheet.getRange(2, 1, uSheet.getLastRow() - 1, 11).getValues();
    result.users = data.map(r => ({
      id: String(r[0]),
      nama: String(r[1]),
      username: String(r[2] || '').replace(/^'/, ''),
      password: String(r[3] || ''),
      noHp: String(r[4] || '').replace(/^'/, ''),
      role: r[5],
      statusPersetujuan: r[6] || 'DISETUJUI',
      isVerified: r[7] === 'TERVERIFIKASI',
      lastOtp: String(r[8] || ''),
      createdAt: formatDateVal(r[9]),
      disetujuiOleh: String(r[10] || '')
    }));
  }

  // Permissions
  const hSheet = ss.getSheetByName(TABLES.HAK_AKSES);
  if (hSheet && hSheet.getLastRow() > 1) {
    const data = hSheet.getRange(2, 1, hSheet.getLastRow() - 1, 2).getValues();
    const permMap = {};
    data.forEach(r => {
      try {
        permMap[r[0]] = JSON.parse(r[1]);
      } catch (e) {}
    });
    if (Object.keys(permMap).length > 0) {
      result.permissions = permMap;
    }
  }

  return result;
}

/**
 * Format tanggal dari objek Date atau teks
 */
function formatDateVal(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val);
}

/**
 * Setup Seluruh Sheet Database Lengkap dengan Desain & Warna Pabrik
 */
function setupDatabase(forceReformat) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const colorPalette = {
    [TABLES.BAHAN_BAKU]: '#d97706', // Amber pabrik
    [TABLES.MUTASI_STOK]: '#0284c7', // Sky blue
    [TABLES.PENJUALAN]: '#059669', // Emerald uang
    [TABLES.OPERASIONAL]: '#dc2626', // Red pengeluaran
    [TABLES.TARGET_PRODUKSI]: '#7c3aed', // Purple target
    [TABLES.USERS]: '#475569', // Slate pegawai
    [TABLES.HAK_AKSES]: '#ea580c', // Orange security
    [TABLES.LOGS]: '#334155' // Charcoal
  };

  Object.keys(TABLES).forEach(key => {
    const name = TABLES[key];
    const headers = SCHEMAS[name];
    let sheet = ss.getSheetByName(name);
    
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }

    if (forceReformat || sheet.getLastRow() === 0) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Styling Header Row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground(colorPalette[name] || '#1e293b');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(10);
      headerRange.setVerticalAlignment('middle');
      sheet.setRowHeight(1, 36);
      sheet.setFrozenRows(1);

      // Auto fit columns
      for (let i = 1; i <= headers.length; i++) {
        sheet.setColumnWidth(i, 160);
      }
    }
  });

  // Hapus sheet default 'Sheet1' jika ada dan sheet lain sudah aktif
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }
}

function setupDatabaseIfMissing() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(TABLES.PENJUALAN) || !ss.getSheetByName(TABLES.BAHAN_BAKU)) {
    setupDatabase(false);
  }
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clearSheetDataKeepHeader(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
}

function appendLogEntry(action, user, status, detail) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(TABLES.LOGS);
    if (sheet) {
      sheet.appendRow([
        new Date().toISOString(),
        action,
        user,
        status,
        detail
      ]);
    }
  } catch(e) {}
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

// Helper Storage
export const getStoredSheetsConfig = (): SheetsSyncConfig => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_SHEETS_CONFIG;
    return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SHEETS_CONFIG;
  }
};

export const saveStoredSheetsConfig = (config: SheetsSyncConfig) => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('sulamjari-sheets-config-updated', { detail: config }));
    // Asynchronously save to server so all devices share this configuration
    fetch('/api/sheets-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch((err) => {
      console.warn('Failed to persist sheets config to server:', err);
    });
  } catch (e) {
    console.error('Failed to save sheets config:', e);
  }
};

export const fetchSheetsConfigFromServer = async (): Promise<SheetsSyncConfig> => {
  try {
    const res = await fetch('/api/sheets-config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        const local = getStoredSheetsConfig();
        const merged: SheetsSyncConfig = {
          ...local,
          ...data.config,
          webAppUrl: data.config.webAppUrl || local.webAppUrl,
          spreadsheetUrl: data.config.spreadsheetUrl || local.spreadsheetUrl,
        };
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.warn('fetchSheetsConfigFromServer fallback to localStorage:', err);
  }
  return getStoredSheetsConfig();
};

export const getStoredSyncLogs = (): SyncLogEntry[] => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const appendSyncLog = (entry: Omit<SyncLogEntry, 'id' | 'timestamp'>) => {
  try {
    const logs = getStoredSyncLogs();
    const newEntry: SyncLogEntry = {
      ...entry,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...logs].slice(0, 50); // keep last 50
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (e) {
    console.error('Failed to append sync log:', e);
    return null;
  }
};

/**
 * Tes koneksi ke Google Apps Script Web App
 */
export const testSheetsConnection = async (
  url: string
): Promise<{ success: boolean; message: string; details?: any }> => {
  if (!url || !url.trim().startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script tidak valid. Pastikan diawali https://script.google.com/...',
    };
  }

  const cleanUrl = url.trim();
  const pingUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=ping` : `${cleanUrl}?action=ping`;

  try {
    const res = await fetch(pingUrl, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP Error status: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (data.success) {
      appendSyncLog({
        type: 'ping',
        status: 'success',
        message: 'Tes koneksi berhasil',
        details: data.spreadsheetName ? `Spreadsheet: ${data.spreadsheetName}` : undefined,
      });
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Spreadsheet berhasil aktif!',
        details: data,
      };
    } else {
      throw new Error(data.message || data.error || 'Respon Apps Script menunjukkan kegagalan');
    }
  } catch (err: any) {
    // If CORS or redirect issue happens in browser preview, we test with POST fallback
    try {
      const postFallback = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'setupDatabase' }),
      });
      if (postFallback.ok) {
        const pData = await postFallback.json();
        appendSyncLog({
          type: 'ping',
          status: 'success',
          message: 'Koneksi aktif via endpoint POST',
        });
        return {
          success: true,
          message: 'Koneksi ke Google Apps Script berhasil tersambung!',
          details: pData,
        };
      }
    } catch (e2) {
      // ignore secondary error
    }

    appendSyncLog({
      type: 'ping',
      status: 'error',
      message: 'Gagal terhubung ke Apps Script: ' + (err.message || 'Jaringan bermasalah'),
    });

    return {
      success: false,
      message: `Gagal terhubung: ${err.message || 'Periksa apakah Web App telah di-deploy dengan akses "Anyone" (Siapa saja).'}`
    };
  }
};

/**
 * Tarik Semua Data dari Google Spreadsheet
 */
export const fetchAllFromSheets = async (
  url: string
): Promise<{ success: boolean; data?: any; message: string }> => {
  if (!url) {
    return { success: false, message: 'URL Google Apps Script belum diisi' };
  }

  const cleanUrl = url.trim();
  const getUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=getAllData` : `${cleanUrl}?action=getAllData`;

  try {
    const res = await fetch(getUrl, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data) {
      appendSyncLog({
        type: 'pull',
        status: 'success',
        message: 'Berhasil menarik data lengkap dari Google Spreadsheet',
        details: `Bahan: ${json.data.bahanList?.length || 0}, Penjualan: ${json.data.penjualanList?.length || 0}`,
      });
      return {
        success: true,
        data: json.data,
        message: json.message || 'Data berhasil ditarik dari Google Sheets',
      };
    } else {
      throw new Error(json.message || 'Gagal memproses data spreadsheet');
    }
  } catch (err: any) {
    appendSyncLog({
      type: 'pull',
      status: 'error',
      message: `Gagal menarik data: ${err.message}`,
    });
    return {
      success: false,
      message: err.message || 'Gagal menarik data dari Google Sheets',
    };
  }
};

/**
 * Kirim / Sinkronisasi Semua Data Lokal ke Google Spreadsheet
 */
export const pushAllToSheets = async (
  url: string,
  payloadData: {
    bahanList: BahanBaku[];
    mutasiList: MutasiStok[];
    penjualanList: PenjualanMie[];
    operasionalList: BiayaOperasional[];
    targetProduksiKg: number;
    users?: UserAccount[];
    permissions?: SystemPermissions;
    user?: string;
  }
): Promise<{ success: boolean; message: string; details?: any }> => {
  if (!url || !url.trim().startsWith('http')) {
    return {
      success: false,
      message: 'URL Google Apps Script belum diisi atau tidak valid',
    };
  }

  const cleanUrl = url.trim();

  try {
    const body = {
      action: 'syncAll',
      user: payloadData.user || 'Admin',
      data: {
        bahanList: payloadData.bahanList,
        mutasiList: payloadData.mutasiList,
        penjualanList: payloadData.penjualanList,
        operasionalList: payloadData.operasionalList,
        targetProduksiKg: payloadData.targetProduksiKg,
        users: payloadData.users || [],
        permissions: payloadData.permissions,
      },
    };

    // Note: Use text/plain;charset=utf-8 to prevent pre-flight CORS blocking on Google Apps Script Web Apps
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    if (data.success) {
      appendSyncLog({
        type: 'push',
        status: 'success',
        message: `Sinkronisasi berhasil: ${payloadData.penjualanList.length} pesanan, ${payloadData.bahanList.length} bahan`,
        details: `Waktu: ${new Date().toLocaleTimeString('id-ID')}`,
      });
      return {
        success: true,
        message: data.message || 'Semua data berhasil disimpan ke Google Spreadsheet!',
        details: data,
      };
    } else {
      throw new Error(data.error || data.message || 'Respon Apps Script menunjukkan kegagalan');
    }
  } catch (err: any) {
    appendSyncLog({
      type: 'push',
      status: 'error',
      message: `Gagal sinkronisasi: ${err.message}`,
    });
    return {
      success: false,
      message: `Gagal mengirim data ke Google Sheets: ${err.message || 'Koneksi terputus'}`,
    };
  }
};

/**
 * Kirim 1 Record Spesifik Secara Otomatis ke Google Spreadsheet (Background sync)
 */
export const pushSingleRecordToSheets = async (
  url: string,
  table: string,
  record: any,
  userName?: string
): Promise<boolean> => {
  if (!url || !url.trim().startsWith('http')) return false;

  try {
    const body = {
      action: 'insertRecord',
      table,
      record,
      user: userName || 'Sistem Otomatis',
    };

    const res = await fetch(url.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      appendSyncLog({
        type: 'auto',
        status: 'success',
        message: `Auto-sync: 1 data baru dikirim ke tabel ${table}`,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Auto-sync single record failed (will sync during next full sync):', err);
    return false;
  }
};

export const TABLES = {
  BAHAN_BAKU: 'BahanBaku',
  MUTASI_STOK: 'MutasiStok',
  PENJUALAN: 'PenjualanMie',
  OPERASIONAL: 'BiayaOperasional',
  TARGET_PRODUKSI: 'TargetProduksi',
  USERS: 'AkunPengguna',
  HAK_AKSES: 'PengaturanAkses',
  LOGS: 'LogAktivitas'
};

/**
 * Sinkronisasi Seluruh Daftar Pengguna (AkunPengguna) ke Google Spreadsheet
 */
export const syncUsersToSpreadsheet = async (
  url: string,
  users: UserAccount[],
  userName?: string
): Promise<boolean> => {
  if (!url || !url.trim().startsWith('http')) return false;

  try {
    const body = {
      action: 'syncUsers',
      users,
      user: userName || 'Admin Pusat',
    };

    const res = await fetch(url.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      appendSyncLog({
        type: 'auto',
        status: 'success',
        message: `Database: ${users.length} data akun pegawai berhasil disimpan ke sheet AkunPengguna`,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Sync users to spreadsheet failed:', err);
    return false;
  }
};

/**
 * Sinkronisasi 1 Record Pendaftaran Pengguna ke Google Spreadsheet
 */
export const syncUserRecordToSheets = async (
  user: UserAccount,
  allUsers?: UserAccount[],
  actorName?: string
): Promise<boolean> => {
  const config = getStoredSheetsConfig();
  if (!config.webAppUrl || !config.webAppUrl.trim().startsWith('http')) return false;

  try {
    // Push individual record
    await pushSingleRecordToSheets(config.webAppUrl, TABLES.USERS, user, actorName || 'Pendaftaran Pegawai');
    // If full users list is provided, also sync full sheet for guarantee
    if (allUsers && allUsers.length > 0) {
      await syncUsersToSpreadsheet(config.webAppUrl, allUsers, actorName || 'Pendaftaran Pegawai');
    }
    return true;
  } catch (e) {
    console.warn('syncUserRecordToSheets failed:', e);
    return false;
  }
};

