import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PenjualanMie, MutasiStok, BiayaOperasional, UserRole } from '../types';
import { formatRupiah, formatNumber, formatDateIndo } from './storage';

export interface LaporanKeuanganPDFParams {
  startDate: string;
  endDate: string;
  periodeLabel?: string;
  totalOmset: number;
  totalKgMie: number;
  totalBiayaBahan: number;
  totalBiayaOps: number;
  labaKotor: number;
  estimasiLabaBersih: number;
  marginLabaKotor: number;
  marginLabaBersih: number;
  totalPiutang: number;
  opsByCategory: Record<string, number>;
  penjualanList: PenjualanMie[];
  pemakaianList: MutasiStok[];
  operasionalList: BiayaOperasional[];
  activeRole?: UserRole;
  pencetakNama?: string;
}

export const exportLaporanKeuanganPDF = (params: LaporanKeuanganPDFParams): void => {
  const {
    startDate,
    endDate,
    periodeLabel,
    totalOmset,
    totalKgMie,
    totalBiayaBahan,
    totalBiayaOps,
    labaKotor,
    estimasiLabaBersih,
    marginLabaKotor,
    marginLabaBersih,
    totalPiutang,
    opsByCategory,
    penjualanList,
    activeRole = 'admin_pusat',
    pencetakNama,
  } = params;

  // Initialize jsPDF document (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Role labels
  const roleLabels: Record<UserRole, string> = {
    admin_pusat: 'Admin Pusat / Keuangan',
    admin_pabrik: 'Admin Kasir Pabrik',
    kepala_pabrik: 'Kepala Pabrik / Mandor',
  };

  const formattedCreatedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const periodDisplay = periodeLabel || `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
  const docNumber = `LK-SJ/${startDate.replace(/-/g, '').slice(0, 6)}/${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(185, 28, 28); // Crimson red
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Company Letterhead (Kop Surat Resmi)
  let currentY = 12;

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(185, 28, 28);
  doc.text('PABRIK MIE BASAH SULAM JARI', margin, currentY);

  // Subtitle / Tagline
  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Sentra Produksi Mie Basah, Mie Keriting Pangsit & Olahan Tepung Segar', margin, currentY);

  currentY += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Kawasan Industri Sentra Pangan Blok B-12 • Telp: (031) 8829-1002 / WA: 0812-8899-2341', margin, currentY);

  // Right Side: Document Metadata Box
  const metaBoxWidth = 62;
  const metaBoxHeight = 18;
  const metaBoxX = pageWidth - margin - metaBoxWidth;
  const metaBoxY = 8;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, metaBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  doc.text('DOKUMEN KEUANGAN RESMI', metaBoxX + 4, metaBoxY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(`No: ${docNumber}`, metaBoxX + 4, metaBoxY + 8.5);
  doc.text(`Tgl Cetak: ${formattedCreatedDate}`, metaBoxX + 4, metaBoxY + 12);
  doc.text('Tujuan: Pemilik Pabrik (Owner)', metaBoxX + 4, metaBoxY + 15.5);

  // Horizontal divider
  currentY += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // 3. Document Title Banner
  currentY += 5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN LABA RUGI & REKAPITULASI OPERASIONAL', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periode Laporan: ${periodDisplay}  |  Mata Uang: Rupiah (IDR)`, margin + 4, currentY + 9.5);

  currentY += 15;

  // 4. Section 1: Ikhtisar Laba Rugi (P&L Table)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. IKHTISAR LABA RUGI OPERASIONAL (PROFIT & LOSS STATEMENT)', margin, currentY);

  const hppPercent = totalOmset > 0 ? (totalBiayaBahan / totalOmset) * 100 : 0;
  const opsPercent = totalOmset > 0 ? (totalBiayaOps / totalOmset) * 100 : 0;

  const pnlRows = [
    [
      'A. Pendapatan Omset Penjualan Mie',
      formatRupiah(totalOmset),
      '100.0%',
      `Volume: ${formatNumber(totalKgMie)} Kg Mie (${penjualanList.length} pesanan)`,
    ],
    [
      'B. Beban Pokok Produksi (HPP Bahan Terpakai)',
      `(${formatRupiah(totalBiayaBahan)})`,
      `-${hppPercent.toFixed(1)}%`,
      'Biaya tepung, telur, minyak, kansui & packaging',
    ],
    [
      'LABA KOTOR PABRIK (GROSS PROFIT)',
      formatRupiah(labaKotor),
      `${marginLabaKotor.toFixed(1)}%`,
      'Omset dikurangi HPP bahan langsung',
    ],
    [
      'C. Beban Operasional Pabrik',
      `(${formatRupiah(totalBiayaOps)})`,
      `-${opsPercent.toFixed(1)}%`,
      'Listrik, gas boiler, upah tenaga & armada',
    ],
    [
      'ESTIMASI LABA BERSIH (NET PROFIT)',
      formatRupiah(estimasiLabaBersih),
      `${marginLabaBersih.toFixed(1)}%`,
      estimasiLabaBersih >= 0
        ? 'Performa Menguntungkan (Net Surplus)'
        : 'Perhatian: Mengalami Defisit Operasional',
    ],
  ];

  autoTable(doc, {
    startY: currentY + 2.5,
    margin: { left: margin, right: margin },
    head: [['Komponen Keuangan', 'Nominal (Rp)', 'Rasio Omset', 'Keterangan Analisis']],
    body: pnlRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 'auto', fontStyle: 'normal' },
    },
    didParseCell: (data) => {
      // Highlight Laba Kotor
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 1) {
          data.cell.styles.textColor = [15, 23, 42];
        }
      }
      // Highlight Laba Bersih
      if (data.row.index === 4) {
        if (estimasiLabaBersih >= 0) {
          data.cell.styles.fillColor = [236, 253, 245];
          data.cell.styles.textColor = [4, 120, 87];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 5. Section 2: Rincian Biaya Operasional & Arus Kas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. ALOKASI BEBAN OPERASIONAL PABRIK', margin, currentY);

  const opsEntries = Object.entries(opsByCategory).sort((a, b) => b[1] - a[1]);
  const opsRows = opsEntries.map(([kategori, nominal], index) => {
    const p = totalBiayaOps > 0 ? (nominal / totalBiayaOps) * 100 : 0;
    return [
      String(index + 1),
      kategori,
      formatRupiah(nominal),
      `${p.toFixed(1)}%`,
      p > 35 ? 'Beban Utama Pabrik' : 'Pengeluaran Rutin',
    ];
  });

  if (opsRows.length === 0) {
    opsRows.push(['1', 'Tidak ada data pengeluaran', 'Rp 0', '0%', '-']);
  }

  // Add subtotal row
  opsRows.push(['', 'TOTAL BIAYA OPERASIONAL', formatRupiah(totalBiayaOps), '100.0%', 'Terverifikasi']);

  autoTable(doc, {
    startY: currentY + 2.5,
    margin: { left: margin, right: margin },
    head: [['No', 'Kategori Pengeluaran', 'Realisasi Biaya (Rp)', 'Porsi Beban', 'Status Kontrol']],
    body: opsRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 'auto', fontStyle: 'normal' },
    },
    didParseCell: (data) => {
      // Last row is total
      if (data.row.index === opsRows.length - 1) {
        data.cell.styles.fillColor = [248, 250, 252];
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 2) {
          data.cell.styles.textColor = [190, 18, 60];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 6. Section 3: Ringkasan Produk Terjual & Arus Kas Piutang
  // Group sales by product
  const productSummaryMap = new Map<string, { kg: number; omset: number }>();
  penjualanList.forEach((p) => {
    const curr = productSummaryMap.get(p.jenisProduk) || { kg: 0, omset: 0 };
    curr.kg += p.jumlahKg;
    curr.omset += p.totalOmset;
    productSummaryMap.set(p.jenisProduk, curr);
  });

  const productRows = Array.from(productSummaryMap.entries())
    .sort((a, b) => b[1].omset - a[1].omset)
    .map(([nama, data], idx) => {
      const avgPrice = data.kg > 0 ? Math.round(data.omset / data.kg) : 0;
      const share = totalOmset > 0 ? (data.omset / totalOmset) * 100 : 0;
      return [
        String(idx + 1),
        nama,
        `${formatNumber(data.kg)} Kg`,
        formatRupiah(avgPrice),
        formatRupiah(data.omset),
        `${share.toFixed(1)}%`,
      ];
    });

  if (productRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('3. KONTRIBUSI PENJUALAN PER KATEGORI PRODUK MIE', margin, currentY);

    autoTable(doc, {
      startY: currentY + 2.5,
      margin: { left: margin, right: margin },
      head: [['No', 'Varian Produk Mie', 'Volume Terjual', 'Harga Rata2 / Kg', 'Total Omset', 'Kontribusi']],
      body: productRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 55, fontStyle: 'bold' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 'auto', halign: 'center' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // 7. Cashflow & Receivables Note
  const penerimaanKas = totalOmset - totalPiutang;
  const cashflowBoxHeight = 11;

  // Check if we need page break before signatures
  if (currentY + cashflowBoxHeight + 35 > pageHeight - 15) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFillColor(totalPiutang > 0 ? 254 : 240, totalPiutang > 0 ? 243 : 253, totalPiutang > 0 ? 199 : 244);
  doc.setDrawColor(totalPiutang > 0 ? 245 : 167, totalPiutang > 0 ? 158 : 243, totalPiutang > 0 ? 11 : 208);
  doc.roundedRect(margin, currentY, contentWidth, cashflowBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(totalPiutang > 0 ? 146 : 6, totalPiutang > 0 ? 64 : 95, totalPiutang > 0 ? 14 : 70);
  doc.text('CATATAN ARUS KAS & PENAGIHAN PIUTANG:', margin + 3, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(
    `Kas & Transfer Realisasi: ${formatRupiah(penerimaanKas)} (${totalOmset > 0 ? ((penerimaanKas / totalOmset) * 100).toFixed(1) : 0}%). ` +
      `Sisa Piutang Berjalan (Tempo): ${formatRupiah(totalPiutang)}. ` +
      (totalPiutang > 0
        ? 'Perlu pengawalan jadwal penagihan oleh bagian kasir/sales sebelum jatuh tempo.'
        : 'Seluruh tagihan penjualan periode ini telah terbayar lunas.'),
    margin + 3,
    currentY + 8
  );

  currentY += cashflowBoxHeight + 6;

  // 8. Lembar Tanda Tangan & Pengesahan Resmi (Official Signatures)
  // Ensure enough space
  if (currentY + 36 > pageHeight - 12) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('LEMBAR PENGESAHAN LAPORAN KEUANGAN RESMI', margin, currentY);

  currentY += 4;
  const colWidth = contentWidth / 3;

  // Column 1: Dibuat Oleh (Penyusun / Kasir)
  const col1X = margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Dibuat & Dihitung Oleh:', col1X + 2, currentY + 3);
  doc.text(roleLabels[activeRole] || 'Admin Keuangan', col1X + 2, currentY + 6.5);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(col1X + 2, currentY + 22, col1X + colWidth - 8, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(pencetakNama || 'Staff Keuangan Pabrik', col1X + 2, currentY + 25.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pabrik Mie Sulam Jari', col1X + 2, currentY + 28.5);

  // Column 2: Diperiksa Oleh (Kepala Pabrik / Mandor)
  const col2X = margin + colWidth;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Diperiksa & Diverifikasi Oleh:', col2X + 2, currentY + 3);
  doc.text('Kepala Operasional Pabrik', col2X + 2, currentY + 6.5);

  doc.line(col2X + 2, currentY + 22, col2X + colWidth - 8, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bpk. H. Ahmad Subandi', col2X + 2, currentY + 25.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Supervisor & Kepala Produksi', col2X + 2, currentY + 28.5);

  // Column 3: Disetujui Oleh (Pemilik Pabrik / Direktur)
  const col3X = margin + colWidth * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Disetujui & Diterima Oleh:', col3X + 2, currentY + 3);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('PEMILIK PABRIK (OWNER)', col3X + 2, currentY + 6.5);

  doc.setDrawColor(185, 28, 28);
  doc.line(col3X + 2, currentY + 22, col3X + colWidth - 4, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('H. Sulam Jari & Rekan', col3X + 2, currentY + 25.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pemilik Pabrik / Direktur', col3X + 2, currentY + 28.5);

  // 9. Page Numbering & Bottom Footer for all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    // Footer divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

    doc.text(
      'Pabrik Mie Basah Sulam Jari — Dokumen Internal & Laporan Resmi Pemilik Pabrik (Kerahasiaan Terjaga)',
      margin,
      pageHeight - 5
    );
    doc.text(`Hal ${i} dari ${totalPages}`, pageWidth - margin - 15, pageHeight - 5);
  }

  // Direct download trigger (client-side safe)
  const filename = `Laporan_Laba_Rugi_SulamJari_${startDate}_sd_${endDate}.pdf`;
  doc.save(filename);
};
