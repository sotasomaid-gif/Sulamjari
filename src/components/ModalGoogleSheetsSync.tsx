import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Code2,
  Check,
  Copy,
  RefreshCw,
  ArrowUpRight,
  Database,
  CloudCheck,
  CloudOff,
  AlertCircle,
  Table,
  Layers,
  History,
  Send,
  Download,
  Info,
  CheckCircle2,
  Wifi,
  WifiOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SheetsSyncConfig,
  GOOGLE_APPS_SCRIPT_CODE,
  testSheetsConnection,
  pushAllToSheets,
  fetchAllFromSheets,
  getStoredSyncLogs,
  SyncLogEntry,
  saveStoredSheetsConfig,
} from '../utils/googleSheetsSync';
import { BahanBaku, MutasiStok, PenjualanMie, BiayaOperasional, UserAccount, SystemPermissions } from '../types';

interface ModalGoogleSheetsSyncProps {
  isOpen: boolean;
  onClose: () => void;
  config: SheetsSyncConfig;
  onUpdateConfig: (config: SheetsSyncConfig) => void;
  bahanList: BahanBaku[];
  mutasiList: MutasiStok[];
  penjualanList: PenjualanMie[];
  operasionalList: BiayaOperasional[];
  targetProduksiKg: number;
  users: UserAccount[];
  permissions: SystemPermissions;
  currentUserName: string;
  onDataPulledFromSheets: (pulledData: {
    bahanList?: BahanBaku[];
    mutasiList?: MutasiStok[];
    penjualanList?: PenjualanMie[];
    operasionalList?: BiayaOperasional[];
    targetProduksiKg?: number;
    users?: UserAccount[];
    permissions?: SystemPermissions;
  }) => void;
  showToast: (msg: string) => void;
}

type SyncTab = 'sync' | 'guide' | 'schema' | 'logs';

export const ModalGoogleSheetsSync: React.FC<ModalGoogleSheetsSyncProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  bahanList,
  mutasiList,
  penjualanList,
  operasionalList,
  targetProduksiKg,
  users,
  permissions,
  currentUserName,
  onDataPulledFromSheets,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SyncTab>('sync');
  const [inputUrl, setInputUrl] = useState(config.webAppUrl || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  useEffect(() => {
    setInputUrl(config.webAppUrl || '');
    setLogs(getStoredSyncLogs());
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    showToast('📋 Kode Google Apps Script (Code.gs) berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      showToast('⚠️ Silakan masukkan URL Google Apps Script Web App terlebih dahulu.');
      return;
    }

    setIsTesting(true);
    setConnectionMessage('Sedang menguji koneksi ke Google Spreadsheet...');

    const res = await testSheetsConnection(inputUrl.trim());
    setIsTesting(false);

    if (res.success) {
      const updatedConfig: SheetsSyncConfig = {
        ...config,
        webAppUrl: inputUrl.trim(),
        spreadsheetUrl: res.details?.spreadsheetUrl || config.spreadsheetUrl,
        lastSyncStatus: 'success',
        lastSyncMessage: res.message,
      };
      onUpdateConfig(updatedConfig);
      saveStoredSheetsConfig(updatedConfig);
      setConnectionMessage(`🟢 Sukses! Terhubung ke Google Spreadsheet.`);
      setLogs(getStoredSyncLogs());
      showToast('✅ Berhasil terhubung ke Google Spreadsheet!');
    } else {
      const updatedConfig: SheetsSyncConfig = {
        ...config,
        webAppUrl: inputUrl.trim(),
        lastSyncStatus: 'error',
        lastSyncMessage: res.message,
      };
      onUpdateConfig(updatedConfig);
      saveStoredSheetsConfig(updatedConfig);
      setConnectionMessage(`🔴 Gagal: ${res.message}`);
      setLogs(getStoredSyncLogs());
      showToast(`❌ Gagal terhubung: ${res.message}`);
    }
  };

  const handlePushAll = async () => {
    const targetUrl = inputUrl.trim() || config.webAppUrl;
    if (!targetUrl) {
      showToast('⚠️ Masukkan dan simpan URL Web App Apps Script terlebih dahulu.');
      return;
    }

    setIsPushing(true);
    const res = await pushAllToSheets(targetUrl, {
      bahanList,
      mutasiList,
      penjualanList,
      operasionalList,
      targetProduksiKg,
      users,
      permissions,
      user: currentUserName,
    });
    setIsPushing(false);

    if (res.success) {
      const updated: SheetsSyncConfig = {
        ...config,
        webAppUrl: targetUrl,
        lastSyncStatus: 'success',
        lastSyncTime: new Date().toISOString(),
        lastSyncMessage: `Sinkron ${penjualanList.length} pesanan, ${bahanList.length} bahan`,
      };
      onUpdateConfig(updated);
      saveStoredSheetsConfig(updated);
      setLogs(getStoredSyncLogs());
      showToast('🎉 Semua data berhasil dikirim dan tersimpan di Google Spreadsheet!');
    } else {
      showToast(`❌ Gagal sinkronisasi data: ${res.message}`);
      setLogs(getStoredSyncLogs());
    }
  };

  const handlePullAll = async () => {
    const targetUrl = inputUrl.trim() || config.webAppUrl;
    if (!targetUrl) {
      showToast('⚠️ Masukkan dan simpan URL Web App Apps Script terlebih dahulu.');
      return;
    }

    setIsPulling(true);
    const res = await fetchAllFromSheets(targetUrl);
    setIsPulling(false);

    if (res.success && res.data) {
      onDataPulledFromSheets(res.data);
      const updated: SheetsSyncConfig = {
        ...config,
        webAppUrl: targetUrl,
        lastSyncStatus: 'success',
        lastSyncTime: new Date().toISOString(),
        lastSyncMessage: 'Data berhasil ditarik dari Google Spreadsheet',
      };
      onUpdateConfig(updated);
      saveStoredSheetsConfig(updated);
      setLogs(getStoredSyncLogs());
      showToast('📥 Data terbaru dari Google Spreadsheet berhasil ditarik dan diperbarui di aplikasi!');
    } else {
      showToast(`❌ Gagal menarik data: ${res.message}`);
      setLogs(getStoredSyncLogs());
    }
  };

  const handleInitSheets = async () => {
    const targetUrl = inputUrl.trim() || config.webAppUrl;
    if (!targetUrl) {
      showToast('⚠️ Masukkan URL Web App terlebih dahulu.');
      return;
    }

    setIsInitializing(true);
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'setupDatabase' }),
      });
      const data = await res.json();
      setIsInitializing(false);
      if (data.success) {
        showToast('✨ 8 Sheet Google Spreadsheet berhasil dibuat dan diformat otomatis!');
        handlePushAll();
      } else {
        showToast('⚠️ Inisialisasi: ' + (data.message || 'Selesai diproses'));
      }
    } catch (e: any) {
      setIsInitializing(false);
      showToast('Gagal inisialisasi sheet: ' + e.message);
    }
  };

  const handleToggleAutoSync = () => {
    const updated: SheetsSyncConfig = {
      ...config,
      autoSyncEnabled: !config.autoSyncEnabled,
    };
    onUpdateConfig(updated);
    saveStoredSheetsConfig(updated);
    showToast(
      updated.autoSyncEnabled
        ? '⚡ Auto-Sync Aktif: Setiap transaksi baru otomatis dikirim ke Google Sheets.'
        : '⏸️ Auto-Sync Dinonaktifkan: Sinkronisasi hanya berjalan manual.'
    );
  };

  const isConnected = config.lastSyncStatus === 'success' && !!config.webAppUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Koneksi Database Google Spreadsheet & Apps Script</h2>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                  isConnected 
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' 
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                }`}>
                  {isConnected ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Terkoneksi ke Cloud Sheets
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Belum Terhubung
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Sinkronisasi multi-tabel 2-arah untuk Bahan Baku, Mutasi Stok, Penjualan, Biaya, Target, dan Akun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 shrink-0 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isPushing || isPulling ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Koneksi & Sinkronisasi</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Panduan & Salin Script (Code.gs)</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Struktur Database (8 Tabel)</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Log ({logs.length})</span>
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-5">
          
          {/* TAB 1: KONEKSI & SINKRONISASI */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              
              {/* URL Web App Input Box */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    URL Google Apps Script Web App
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Didapat dari Deploy &gt; New deployment &gt; Web app (Anyone)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700 bg-white"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors shrink-0 shadow-xs"
                  >
                    <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Menguji...' : 'Tes Koneksi'}</span>
                  </button>
                </div>

                {connectionMessage && (
                  <p className={`text-xs p-2.5 rounded-lg border ${
                    connectionMessage.includes('🟢')
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : connectionMessage.includes('🔴')
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {connectionMessage}
                  </p>
                )}

                {config.spreadsheetUrl && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Google Spreadsheet Terhubung
                    </span>
                    <a
                      href={config.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 underline underline-offset-2"
                    >
                      Buka Google Sheet di Tab Baru <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Push Card */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Kirim Data ke Spreadsheet (Push)</h4>
                        <p className="text-[11px] text-slate-500">Unggah seluruh data lokal saat ini ke Google Spreadsheet</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      Menyimpan {penjualanList.length} pesanan mie, {bahanList.length} bahan baku, {mutasiList.length} riwayat mutasi stok, dan {operasionalList.length} transaksi biaya.
                    </p>
                  </div>
                  <button
                    onClick={handlePushAll}
                    disabled={isPushing}
                    className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors shadow-xs"
                  >
                    <Send className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                    <span>{isPushing ? 'Mengirim Data...' : 'Kirim Semua Data Sekarang'}</span>
                  </button>
                </div>

                {/* Pull Card */}
                <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Tarik Data dari Spreadsheet (Pull)</h4>
                        <p className="text-[11px] text-slate-500">Perbarui aplikasi dengan baris data dari Google Sheet</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      Sangat berguna jika ada pengurus pabrik lain yang memperbarui data langsung dari Google Sheet di laptop/HP lain.
                    </p>
                  </div>
                  <button
                    onClick={handlePullAll}
                    disabled={isPulling}
                    className="mt-4 w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors shadow-xs"
                  >
                    <Download className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                    <span>{isPulling ? 'Menarik Data...' : 'Tarik Data Terbaru ke Aplikasi'}</span>
                  </button>
                </div>

              </div>

              {/* Data Modul Status Grid */}
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Status 8 Modul Database Pabrik
                  </h4>
                  <button
                    onClick={handleInitSheets}
                    disabled={isInitializing}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200"
                  >
                    <RefreshCw className={`w-3 h-3 ${isInitializing ? 'animate-spin' : ''}`} />
                    <span>Inisialisasi Ulang Desain Sheet</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Bahan Baku</p>
                    <p className="text-base font-bold text-slate-800">{bahanList.length} Item</p>
                    <span className="text-[10px] text-emerald-700 font-medium">Sheet: BahanBaku</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Mutasi Stok</p>
                    <p className="text-base font-bold text-slate-800">{mutasiList.length} Catatan</p>
                    <span className="text-[10px] text-sky-700 font-medium">Sheet: MutasiStok</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Penjualan Mie</p>
                    <p className="text-base font-bold text-slate-800">{penjualanList.length} Order</p>
                    <span className="text-[10px] text-emerald-700 font-medium">Sheet: PenjualanMie</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Biaya Operasional</p>
                    <p className="text-base font-bold text-slate-800">{operasionalList.length} Transaksi</p>
                    <span className="text-[10px] text-rose-700 font-medium">Sheet: BiayaOperasional</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Target Produksi</p>
                    <p className="text-base font-bold text-purple-700">{targetProduksiKg} Kg / Hari</p>
                    <span className="text-[10px] text-purple-700 font-medium">Sheet: TargetProduksi</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Akun Pengguna</p>
                    <p className="text-base font-bold text-slate-800">{users.length} Pegawai</p>
                    <span className="text-[10px] text-slate-700 font-medium">Sheet: AkunPengguna</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Hak Akses</p>
                    <p className="text-base font-bold text-amber-700">3 Role Model</p>
                    <span className="text-[10px] text-amber-700 font-medium">Sheet: PengaturanAkses</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">Log Aktivitas</p>
                    <p className="text-base font-bold text-slate-800">{logs.length} Log</p>
                    <span className="text-[10px] text-slate-600 font-medium">Sheet: LogAktivitas</span>
                  </div>
                </div>

                {/* Auto Sync Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <span className="text-xs text-slate-700 font-medium">
                      Otomatis Sinkron saat Transaksi Baru Ditambahkan
                    </span>
                  </div>
                  <button
                    onClick={handleToggleAutoSync}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      config.autoSyncEnabled
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    {config.autoSyncEnabled ? 'Aktif (Auto)' : 'Manual Saja'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PANDUAN & SALIN SCRIPT */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start space-x-3">
                <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-emerald-900 space-y-1">
                  <p className="font-bold">Langkah Pemasangan Google Apps Script (Hanya Sekali):</p>
                  <p>
                    Google Apps Script bertindak sebagai API server gratis langsung di atas Google Spreadsheet Anda. 
                    Ikuti 5 langkah mudah berikut untuk menghubungkan database:
                  </p>
                </div>
              </div>

              {/* Step by step list */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Buat Google Spreadsheet Baru</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Buka Google Drive Anda atau ketik <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">sheets.new</a> di browser, lalu beri judul spreadsheet misalnya: <strong>Database Pabrik Mie Sulamjari</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Buka Menu Apps Script</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Di halaman Google Spreadsheet, klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Salin & Tempel Kode Script</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Hapus teks bawaan <code>function myFunction() &#123;&#125;</code> di editor Apps Script, lalu klik tombol di bawah ini untuk menyalin seluruh kode:
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={handleCopyScript}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold flex items-center space-x-2 transition-colors shadow-xs"
                      >
                        {copiedScript ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedScript ? 'Tersalin ke Clipboard!' : 'Salin Kode Google Apps Script (Code.gs)'}</span>
                      </button>
                      <button
                        onClick={() => setShowCodePreview(!showCodePreview)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <span>{showCodePreview ? 'Sembunyikan Kode' : 'Lihat Kode'}</span>
                        {showCodePreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {showCodePreview && (
                  <div className="ml-9 p-3 bg-slate-900 rounded-lg border border-slate-700 text-slate-200 text-xs font-mono max-h-56 overflow-y-auto">
                    <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Deploy sebagai Web App</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Simpan file (Ctrl+S). Lalu klik tombol biru <strong>Deploy (Terapkan)</strong> di kanan atas &gt; <strong>New deployment (Penerapan baru)</strong>:
                    </p>
                    <ul className="list-disc list-inside text-xs text-slate-600 mt-1 space-y-0.5">
                      <li>Pilih ikon gear: <strong>Web app</strong></li>
                      <li>Execute as (Jalankan sebagai): <strong>Me (email Anda)</strong></li>
                      <li>Who has access (Siapa yang memiliki akses): <strong className="text-emerald-700">Anyone (Siapa saja)</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <p className="font-bold text-slate-800">Salin Web App URL ke Aplikasi</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Salin <strong>Web App URL</strong> yang dihasilkan (berakhir dengan <code>/exec</code>), kembali ke tab <strong>Koneksi & Sinkronisasi</strong>, tempelkan URL tersebut, lalu klik <strong>Tes Koneksi</strong>. Selesai!
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: STRUKTUR DATABASE */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Arsitektur Database Google Sheets Pabrik Mie Sulamjari
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Setiap modul aplikasi dipetakan secara otomatis ke dalam sheet terpisah dengan header dan format warna khusus:
                </p>

                <div className="space-y-3">
                  
                  <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                        1. Sheet: BahanBaku (Master Bahan Pabrik)
                      </span>
                      <span className="text-[11px] text-amber-800 font-mono">9 Kolom</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 mt-1 font-mono">
                      ID Bahan | Nama Bahan | Kategori | Satuan | Merk | Harga Satuan (Rp) | Stok Tersedia | Batas Min Stok | Terakhir Diperbarui
                    </p>
                  </div>

                  <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                        2. Sheet: MutasiStok (Bahan Masuk & Keluar)
                      </span>
                      <span className="text-[11px] text-sky-800 font-mono">11 Kolom</span>
                    </div>
                    <p className="text-[11px] text-sky-800/80 mt-1 font-mono">
                      ID Mutasi | Tanggal | ID Bahan | Nama Bahan | Tipe | Jumlah | Satuan | Harga Satuan | Total Biaya | Supplier/Ket | Waktu Dicatat
                    </p>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                        3. Sheet: PenjualanMie (Order & Pelanggan)
                      </span>
                      <span className="text-[11px] text-emerald-800 font-mono">11 Kolom</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 mt-1 font-mono">
                      ID Penjualan | Tanggal | Nama Pelanggan | No HP/WA | Jenis Produk | Jumlah (Kg) | Harga/Kg | Total Omset | Status Bayar | Metode | Catatan
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                        4. Sheet: BiayaOperasional (Pengeluaran Pabrik)
                      </span>
                      <span className="text-[11px] text-rose-800 font-mono">7 Kolom</span>
                    </div>
                    <p className="text-[11px] text-rose-800/80 mt-1 font-mono">
                      ID Biaya | Tanggal | Kategori | Deskripsi | Nominal (Rp) | Penanggung Jawab | Bukti Nota/Dokumen
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                        5. Sheet: TargetProduksi (Target Harian)
                      </span>
                      <span className="text-[11px] text-purple-800 font-mono">3 Kolom</span>
                    </div>
                    <p className="text-[11px] text-purple-800/80 mt-1 font-mono">
                      Target Harian (Kg) | Terakhir Diperbarui | Keterangan Sistem
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                        6. Sheet: AkunPengguna (Daftar Pengguna, Kredensial & Persetujuan)
                      </span>
                      <span className="text-[11px] text-slate-700 font-mono">11 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1 font-mono">
                      ID Pengguna | Nama Lengkap | Username Login | Password Akun | Nomor WhatsApp | Role Model | Status Persetujuan | Status Verifikasi | Kode OTP | Tanggal Daftar | Disetujui Oleh
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50/60 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-orange-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                        7. Sheet: PengaturanAkses (Hak Akses RBAC)
                      </span>
                      <span className="text-[11px] text-orange-800 font-mono">3 Kolom</span>
                    </div>
                    <p className="text-[11px] text-orange-800/80 mt-1 font-mono">
                      Role Model | Konfigurasi Izin Akses (JSON) | Terakhir Diperbarui
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800 text-slate-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                        8. Sheet: LogAktivitas (Audit Trail)
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">5 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 font-mono">
                      Waktu Aktivitas | Jenis Aksi | User Penanggung Jawab | Status | Rincian Aktivitas
                    </p>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">Riwayat Aktivitas Sinkronisasi</h4>
                <button
                  onClick={() => setLogs(getStoredSyncLogs())}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Segarkan Log
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  Belum ada catatan riwayat sinkronisasi.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 sm:p-3.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status === 'success' ? 'SUKSES' : 'GAGAL'}
                          </span>
                          <span className="font-semibold text-slate-800">{log.message}</span>
                        </div>
                        {log.details && (
                          <p className="text-slate-500 text-[11px] font-mono">{log.details}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 sm:px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            <span>
              {config.lastSyncTime
                ? `Terakhir sinkron: ${new Date(config.lastSyncTime).toLocaleTimeString('id-ID')}`
                : 'Belum pernah disinkronkan'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              Tutup
            </button>
            <button
              onClick={handlePushAll}
              disabled={isPushing}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
              <span>{isPushing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
