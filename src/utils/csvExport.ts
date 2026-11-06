import { BahanBaku, PenjualanMie, MutasiStok, BiayaOperasional } from '../types';

/**
 * Utility helper to download a 2D array as a CSV file.
 * Automatically adds UTF-8 BOM (\uFEFF) so Microsoft Excel opens it correctly with Indonesian regional settings.
 */
export const downloadCSV = (
  filename: string,
  rows: (string | number)[][],
  delimiter: ';' | ',' = ';'
): void => {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        let stringVal = val === null || val === undefined ? '' : String(val);
        // Replace inner double quotes with double double-quotes per RFC 4180
        stringVal = stringVal.replace(/"/g, '""');
        // Wrap in quotes if it contains delimiter, quotes, or newlines
        if (
          stringVal.includes(delimiter) ||
          stringVal.includes('"') ||
          stringVal.includes('\n') ||
          stringVal.includes('\r')
        ) {
          stringVal = `"${stringVal}"`;
        }
        return stringVal;
      })
      .join(delimiter);
  };

  const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 1. Utility function to export Raw Materials (Bahan Baku) data into Excel-ready CSV.
 */
export const exportBahanBakuCSV = (
  bahanList: BahanBaku[],
  options?: { filename?: string; delimiter?: ';' | ',' }
): void => {
  const delimiter = options?.delimiter || ';';
  const today = new Date().toISOString().split('T')[0];
  const filename = options?.filename || `Data_Bahan_Baku_Pabrik_Mie_Sulamjari_${today}`;

  // Column Headers
  const headers = [
    'No',
    'ID Bahan',
    'Kategori',
    'Nama Bahan Baku',
    'Merk / Produsen',
    'Satuan',
    'Harga Satuan Terakhir (Rp)',
    'Stok Fisik Tersedia',
    'Batas Minimum Stok',
    'Status Stok Gudang',
    'Estimasi Nilai Aset Stok (Rp)',
    'Terakhir Diperbarui',
  ];

  let totalNilaiAsetStok = 0;

  // Data Rows
  const rows: (string | number)[][] = bahanList.map((item, index) => {
    const nilaiAset = item.stokTersedia * item.hargaSatuan;
    totalNilaiAsetStok += nilaiAset;
    const statusStok = item.stokTersedia <= item.minStok ? 'Kritis / Menipis' : 'Aman';

    return [
      index + 1,
      item.id,
      item.kategori,
      item.nama,
      item.merk || '-',
      item.satuan,
      item.hargaSatuan,
      item.stokTersedia,
      item.minStok,
      statusStok,
      nilaiAset,
      item.terakhirDiperbarui,
    ];
  });

  // Summary Footer Row for Excel
  rows.push([
    'TOTAL',
    '',
    `${bahanList.length} Macam Bahan`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalNilaiAsetStok,
    '',
  ]);

  downloadCSV(filename, [headers, ...rows], delimiter);
};

/**
 * 2. Utility function to export Customer Sales Orders (Penjualan Mie) data into Excel-ready CSV.
 */
export const exportPenjualanCSV = (
  penjualanList: PenjualanMie[],
  options?: { filename?: string; delimiter?: ';' | ',' }
): void => {
  const delimiter = options?.delimiter || ';';
  const today = new Date().toISOString().split('T')[0];
  const filename = options?.filename || `Data_Penjualan_Mie_Sulamjari_${today}`;

  // Column Headers
  const headers = [
    'No',
    'ID Order',
    'Tanggal Transaksi',
    'Nama Pelanggan / Warung',
    'Nomor Telepon',
    'Jenis Produk Mie',
    'Jumlah Order (Kg)',
    'Harga per Kg (Rp)',
    'Total Omset (Rp)',
    'Status Pembayaran',
    'Metode Pembayaran',
    'Catatan Khusus',
  ];

  let totalKg = 0;
  let totalOmset = 0;
  let totalLunas = 0;
  let totalPiutang = 0;

  // Data Rows
  const rows: (string | number)[][] = penjualanList.map((item, index) => {
    totalKg += item.jumlahKg;
    totalOmset += item.totalOmset;
    if (item.statusPembayaran === 'LUNAS') {
      totalLunas += item.totalOmset;
    } else {
      totalPiutang += item.totalOmset;
    }

    return [
      index + 1,
      item.id,
      item.tanggal,
      item.namaPelanggan,
      item.telepon || '-',
      item.jenisProduk,
      item.jumlahKg,
      item.hargaPerKg,
      item.totalOmset,
      item.statusPembayaran,
      item.metodePembayaran,
      item.catatan || '-',
    ];
  });

  // Summary Footer Row for Excel
  rows.push([
    'TOTAL',
    '',
    `${penjualanList.length} Transaksi`,
    '',
    '',
    '',
    totalKg,
    '',
    totalOmset,
    `Lunas: Rp ${totalLunas.toLocaleString('id-ID')} | Piutang: Rp ${totalPiutang.toLocaleString('id-ID')}`,
    '',
    '',
  ]);

  downloadCSV(filename, [headers, ...rows], delimiter);
};

/**
 * 3. Utility function to export Stock Movements (Mutasi Stok Masuk & Keluar) into Excel-ready CSV.
 */
export const exportMutasiStokCSV = (
  mutasiList: MutasiStok[],
  options?: { filename?: string; delimiter?: ';' | ',' }
): void => {
  const delimiter = options?.delimiter || ';';
  const today = new Date().toISOString().split('T')[0];
  const filename = options?.filename || `Data_Mutasi_Stok_Sulamjari_${today}`;

  const headers = [
    'No',
    'ID Mutasi',
    'Tanggal',
    'Waktu Catat',
    'Tipe Pergerakan',
    'Nama Bahan Baku',
    'Jumlah',
    'Satuan',
    'Harga Satuan (Rp)',
    'Total Nilai (Rp)',
    'Supplier / Keterangan Pemakaian',
  ];

  let totalMasuk = 0;
  let totalKeluar = 0;

  const rows: (string | number)[][] = mutasiList.map((item, index) => {
    if (item.tipe === 'MASUK') {
      totalMasuk += item.totalBiaya;
    } else {
      totalKeluar += item.totalBiaya;
    }

    return [
      index + 1,
      item.id,
      item.tanggal,
      item.createdAt.split(' ')[1] || '-',
      item.tipe === 'MASUK' ? 'MASUK (Kulakan)' : 'KELUAR (Produksi)',
      item.namaBahan,
      item.jumlah,
      item.satuan,
      item.hargaSatuan,
      item.totalBiaya,
      item.supplierOrKeterangan,
    ];
  });

  rows.push([
    'TOTAL',
    '',
    `${mutasiList.length} Catatan Mutasi`,
    '',
    '',
    '',
    '',
    '',
    `Masuk: Rp ${totalMasuk.toLocaleString('id-ID')}`,
    `Keluar: Rp ${totalKeluar.toLocaleString('id-ID')}`,
    '',
  ]);

  downloadCSV(filename, [headers, ...rows], delimiter);
};

/**
 * 4. Utility function to export Daily Material Consumption (Laporan Pemakaian Harian) into Excel-ready CSV.
 */
export const exportPemakaianHarianCSV = (
  rekapItems: Array<{
    bahanId: string;
    namaBahan: string;
    kategori: string;
    satuan: string;
    merk: string;
    hargaSatuan: number;
    jumlahTerpakai: number;
    totalPengeluaran: number;
    keteranganList: string[];
  }>,
  tanggal: string,
  totalBiaya: number,
  options?: { filename?: string; delimiter?: ';' | ',' }
): void => {
  const delimiter = options?.delimiter || ';';
  const filename = options?.filename || `Laporan_Pemakaian_Bahan_Harian_${tanggal}`;

  const headers = [
    'No',
    'Tanggal Laporan',
    'Kategori Bahan',
    'Nama Bahan Baku',
    'Merk',
    'Satuan',
    'Harga Satuan Terakhir (Rp)',
    'Jumlah Terpakai',
    'Total Biaya Bahan Terpakai (Rp)',
    'Keterangan / Peruntukan Produksi',
  ];

  const rows: (string | number)[][] = rekapItems.map((item, index) => [
    index + 1,
    tanggal,
    item.kategori,
    item.namaBahan,
    item.merk,
    item.satuan,
    item.hargaSatuan,
    item.jumlahTerpakai,
    item.totalPengeluaran,
    item.keteranganList.join('; '),
  ]);

  rows.push([
    'TOTAL BIAYA BAHAN HARI INI',
    tanggal,
    '',
    `${rekapItems.length} Macam Bahan`,
    '',
    '',
    '',
    '',
    totalBiaya,
    'HPP Bahan Terpakai',
  ]);

  downloadCSV(filename, [headers, ...rows], delimiter);
};

/**
 * 5. Utility function to export Operational Costs (Biaya Operasional) into Excel-ready CSV.
 */
export const exportOperasionalCSV = (
  operasionalList: BiayaOperasional[],
  options?: { filename?: string; delimiter?: ';' | ',' }
): void => {
  const delimiter = options?.delimiter || ';';
  const today = new Date().toISOString().split('T')[0];
  const filename = options?.filename || `Data_Biaya_Operasional_Sulamjari_${today}`;

  const headers = [
    'No',
    'ID Pengeluaran',
    'Tanggal',
    'Kategori Beban',
    'Deskripsi Pengeluaran',
    'Nominal Biaya (Rp)',
    'Penanggung Jawab',
    'No. Bukti / Nota / Kuitansi',
  ];

  let totalNominal = 0;

  const rows: (string | number)[][] = operasionalList.map((item, index) => {
    totalNominal += item.nominal;
    return [
      index + 1,
      item.id,
      item.tanggal,
      item.kategori,
      item.deskripsi,
      item.nominal,
      item.penanggungJawab,
      item.buktiNota || '-',
    ];
  });

  rows.push([
    'TOTAL BIAYA OPERASIONAL',
    '',
    `${operasionalList.length} Transaksi`,
    '',
    '',
    totalNominal,
    '',
    '',
  ]);

  downloadCSV(filename, [headers, ...rows], delimiter);
};

/**
 * 6. Utility function to export Executive Financial & P&L Statement into Excel-ready CSV.
 */
export const exportLaporanKeuanganCSV = (
  pnlData: {
    startDate: string;
    endDate: string;
    totalOmset: number;
    totalKgMie: number;
    totalBiayaBahan: number;
    totalBiayaOps: number;
    labaKotor: number;
    estimasiLabaBersih: number;
    marginLabaKotor: number;
    marginLabaBersih: number;
    totalPiutang: number;
    totalKulakanBaru: number;
    opsByCategory: Record<string, number>;
  },
  options?: { filename?: string; delimiter?: ';' | ',' }
): void => {
  const delimiter = options?.delimiter || ';';
  const filename =
    options?.filename || `Laporan_Laba_Rugi_Sulamjari_${pnlData.startDate}_sd_${pnlData.endDate}`;

  const headers = ['No', 'Komponen Laporan Keuangan (P&L)', 'Nilai Angka (Rp)', 'Keterangan / Catatan'];

  const rows: (string | number)[][] = [
    [1, 'Periode Analisis', '', `${pnlData.startDate} s/d ${pnlData.endDate}`],
    [2, 'Total Volume Penjualan Mie (Kg)', pnlData.totalKgMie, 'Kilogram'],
    [3, '1. TOTAL PENDAPATAN OMSET PENJUALAN MIE', pnlData.totalOmset, 'Penerimaan Kas & Piutang'],
    [
      4,
      '   - Penerimaan Kas / Transfer Lunas',
      pnlData.totalOmset - pnlData.totalPiutang,
      'Kas Masuk Nyata',
    ],
    [5, '   - Piutang / Tempo Pelanggan', pnlData.totalPiutang, 'Tagihan Belum Lunas'],
    [
      6,
      '2. BEBAN POKOK PRODUKSI (HPP BAHAN BAKU TERPAKAI)',
      pnlData.totalBiayaBahan,
      'Tepung, Telur, Kansui, Minyak, dll',
    ],
    [
      7,
      '3. LABA KOTOR (GROSS PROFIT)',
      pnlData.labaKotor,
      `Margin Laba Kotor: ${pnlData.marginLabaKotor.toFixed(1)}%`,
    ],
    [8, '4. TOTAL BEBAN BIAYA OPERASIONAL PABRIK', pnlData.totalBiayaOps, 'Beban Usaha'],
  ];

  let subIndex = 1;
  for (const [kategori, nominal] of Object.entries(pnlData.opsByCategory)) {
    rows.push([
      `4.${subIndex++}`,
      `   - Beban ${kategori}`,
      nominal,
      'Rincian Beban Operasional',
    ]);
  }

  rows.push([
    9,
    '5. ESTIMASI LABA BERSIH (NET PROFIT)',
    pnlData.estimasiLabaBersih,
    `Net Margin: ${pnlData.marginLabaBersih.toFixed(1)}%`,
  ]);

  rows.push([
    10,
    'Pembelian Stok Bahan Masuk Periode Ini (Kulakan)',
    pnlData.totalKulakanBaru,
    'Arus Kas Keluar Pembelian Bahan',
  ]);

  downloadCSV(filename, [headers, ...rows], delimiter);
};
