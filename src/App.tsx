import React, { useState, useEffect } from 'react';
import { Navbar, TabId } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { MasterBahanTab } from './components/MasterBahanTab';
import { StokMutasiTab } from './components/StokMutasiTab';
import { PemakaianHarianTab } from './components/PemakaianHarianTab';
import { PenjualanTab } from './components/PenjualanTab';
import { OperasionalTab } from './components/OperasionalTab';
import { LaporanKeuanganTab } from './components/LaporanKeuanganTab';
import { PengaturanHakAksesTab } from './components/PengaturanHakAksesTab';
import {
  ModalBahan,
  ModalStokMasuk,
  ModalStokKeluar,
  ModalPenjualan,
  ModalOperasional,
  ModalPrint,
  ModalBackup,
} from './components/Modals';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ModalGoogleSheetsSync } from './components/ModalGoogleSheetsSync';
import {
  BahanBaku,
  MutasiStok,
  PenjualanMie,
  BiayaOperasional,
  StatusPembayaran,
  UserRole,
  SystemPermissions,
  UserAccount,
} from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getStoredUsers,
  saveStoredUsers,
  approveUserAndGenerateOtp,
  rejectUserRegistration,
  deleteUserAccount,
  OtpSimulationMessage,
  fetchUsersFromServer,
  approveUserOnServer,
  rejectUserOnServer,
} from './utils/auth';
import {
  loadStoredPermissions,
  saveStoredPermissions,
  loadActiveRole,
  saveActiveRole,
  DEFAULT_SYSTEM_PERMISSIONS,
} from './utils/rbac';
import {
  getStoredSheetsConfig,
  saveStoredSheetsConfig,
  fetchSheetsConfigFromServer,
  fetchAllFromSheets,
  pushSingleRecordToSheets,
  pushAllToSheets,
  syncUsersToSpreadsheet,
  updateUserStatusInSheets,
  TABLES,
  SheetsSyncConfig,
} from './utils/googleSheetsSync';
import { WhatsAppChatModal } from './components/WhatsAppChatModal';
import {
  loadStoredData,
  saveBahanData,
  saveMutasiData,
  savePenjualanData,
  saveOperasionalData,
  resetAllData,
  formatRupiah,
} from './utils/storage';

export default function App() {
  // Navigation & Date State
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Main Data States with LocalStorage Initializer
  const [bahanList, setBahanList] = useState<BahanBaku[]>([]);
  const [mutasiList, setMutasiList] = useState<MutasiStok[]>([]);
  const [penjualanList, setPenjualanList] = useState<PenjualanMie[]>([]);
  const [operasionalList, setOperasionalList] = useState<BiayaOperasional[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modal States
  const [modalBahanOpen, setModalBahanOpen] = useState(false);
  const [editingBahan, setEditingBahan] = useState<BahanBaku | null>(null);

  const [modalMasukOpen, setModalMasukOpen] = useState(false);
  const [modalKeluarOpen, setModalKeluarOpen] = useState(false);

  const [modalPenjualanOpen, setModalPenjualanOpen] = useState(false);
  const [editingPenjualan, setEditingPenjualan] = useState<PenjualanMie | null>(null);

  const [modalOperasionalOpen, setModalOperasionalOpen] = useState(false);
  const [modalPrintOpen, setModalPrintOpen] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [modalBackupOpen, setModalBackupOpen] = useState(false);
  const [modalSheetsOpen, setModalSheetsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Google Spreadsheet & Apps Script Config State
  const [sheetsConfig, setSheetsConfig] = useState<SheetsSyncConfig>(getStoredSheetsConfig);

  // Hydrate sheetsConfig from server on mount so all devices/clients share the connection URL
  useEffect(() => {
    fetchSheetsConfigFromServer().then((cfg) => {
      if (cfg && cfg.webAppUrl) {
        setSheetsConfig(cfg);
      }
    });

    const handleSheetsConfigUpdated = (e: any) => {
      if (e.detail) {
        setSheetsConfig(e.detail);
      } else {
        setSheetsConfig(getStoredSheetsConfig());
      }
    };

    window.addEventListener('sulamjari-sheets-config-updated', handleSheetsConfigUpdated);
    window.addEventListener('storage', handleSheetsConfigUpdated);
    return () => {
      window.removeEventListener('sulamjari-sheets-config-updated', handleSheetsConfigUpdated);
      window.removeEventListener('storage', handleSheetsConfigUpdated);
    };
  }, []);

  // Daily Production Target (in Kg)
  const [targetProduksiKg, setTargetProduksiKg] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sulamjari_target_produksi_kg');
      return saved ? Number(saved) : 150;
    } catch {
      return 150;
    }
  });

  const triggerAutoSync = (table: string, record: any) => {
    if (sheetsConfig.webAppUrl && sheetsConfig.autoSyncEnabled) {
      pushSingleRecordToSheets(sheetsConfig.webAppUrl, table, record, currentUser?.nama);
    }
  };

  const handleUpdateTargetProduksi = (newTarget: number) => {
    const validTarget = Math.max(1, Number(newTarget) || 150);
    setTargetProduksiKg(validTarget);
    localStorage.setItem('sulamjari_target_produksi_kg', String(validTarget));
    showToast(`🎯 Target produksi harian berhasil diatur menjadi ${validTarget} Kg`);
    if (sheetsConfig.webAppUrl && sheetsConfig.autoSyncEnabled) {
      pushSingleRecordToSheets(sheetsConfig.webAppUrl, 'TargetProduksi', {
        targetHarianKg: validTarget,
        updatedAt: new Date().toISOString(),
      }, currentUser?.nama);
    }
  };

  const handleTriggerTargetToast = (currentKg: number, targetKg: number) => {
    if (currentKg >= targetKg) {
      showToast(
        `🎉 TARGET TERCAPAI! Penjualan hari ini ${currentKg} Kg berhasil melampaui target harian ${targetKg} Kg!`
      );
    } else {
      const sisa = targetKg - currentKg;
      const pct = Math.round((currentKg / targetKg) * 100);
      showToast(
        `🎯 Progres Target: ${currentKg}/${targetKg} Kg (${pct}%). Butuh ${sisa} Kg lagi untuk mencapai target!`
      );
    }
  };

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Access Control & Active Role State
  const [systemPermissions, setSystemPermissions] = useState<SystemPermissions>(loadStoredPermissions);
  const [activeRole, setActiveRole] = useState<UserRole>(loadActiveRole);

  // User Authentication State
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(getCurrentUser);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // User Accounts & Registration Approval State
  const [usersList, setUsersList] = useState<UserAccount[]>(getStoredUsers);
  const [activeWaMessage, setActiveWaMessage] = useState<OtpSimulationMessage | null>(null);
  const [showWaModal, setShowWaModal] = useState<boolean>(false);

  // Keep users synchronized reactively from server and storage across all devices
  useEffect(() => {
    // Initial fetch from server
    fetchUsersFromServer().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setUsersList(fresh);
      }
    });

    const handleUserSync = () => {
      setUsersList(getStoredUsers());
    };

    window.addEventListener('sulamjari-users-updated', handleUserSync);
    window.addEventListener('storage', handleUserSync);

    // Real-time server polling every 4 seconds to catch new registrations from other devices
    const pollInterval = setInterval(() => {
      fetchUsersFromServer().then((fresh) => {
        if (fresh && fresh.length > 0) {
          setUsersList(fresh);
        }
      });
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('sulamjari-users-updated', handleUserSync);
      window.removeEventListener('storage', handleUserSync);
    };
  }, []);

  const handleApproveUser = async (userId: string) => {
    const adminName = currentUser?.nama || 'Admin Pusat';
    const res = await approveUserOnServer(userId, adminName);
    if (res.success) {
      const freshUsers = getStoredUsers();
      setUsersList(freshUsers);

      // Automatically sync updated user database to Google Spreadsheet
      if (sheetsConfig.webAppUrl) {
        if (res.user) {
          updateUserStatusInSheets(sheetsConfig.webAppUrl, res.user, adminName);
        }
        syncUsersToSpreadsheet(sheetsConfig.webAppUrl, freshUsers, adminName);
      }

      if (res.waPayload) {
        setActiveWaMessage(res.waPayload);
        setShowWaModal(true);
      }
      showToast(res.message);
    } else {
      showToast('❌ ' + res.message);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Tolak permohonan pendaftaran akun pegawai ini?')) return;
    const adminName = currentUser?.nama || 'Admin Pusat';
    const res = await rejectUserOnServer(userId, adminName);
    if (res.success) {
      const freshUsers = getStoredUsers();
      setUsersList(freshUsers);

      if (sheetsConfig.webAppUrl) {
        syncUsersToSpreadsheet(sheetsConfig.webAppUrl, freshUsers, adminName);
      }
      showToast(res.message);
    } else {
      showToast('❌ ' + res.message);
    }
  };

  const handleDeleteUser = (userId: string, nama: string) => {
    if (!confirm(`Hapus akun pegawai "${nama}" secara permanen dari database?`)) return;
    const ok = deleteUserAccount(userId);
    if (ok) {
      const freshUsers = getStoredUsers();
      setUsersList(freshUsers);
      window.dispatchEvent(new CustomEvent('sulamjari-users-updated'));

      if (sheetsConfig.webAppUrl) {
        syncUsersToSpreadsheet(sheetsConfig.webAppUrl, freshUsers, currentUser?.nama || 'Admin Pusat');
      }
      showToast(`Akun "${nama}" berhasil dihapus dari database.`);
    } else {
      showToast('Akun Admin Pusat utama tidak dapat dihapus.');
    }
  };

  const handleUpdatePermissions = (newPerms: SystemPermissions) => {
    setSystemPermissions(newPerms);
    saveStoredPermissions(newPerms);
    showToast('✅ Pengaturan Hak Akses berhasil disimpan.');
  };

  const handleSwitchRole = (newRole: UserRole) => {
    setActiveRole(newRole);
    saveActiveRole(newRole);
    const roleTitles: Record<UserRole, string> = {
      admin_pusat: 'Admin Pusat (Otoritas Penuh)',
      admin_pabrik: 'Admin Pabrik (Kasir & Administrasi)',
      kepala_pabrik: 'Kepala Pabrik (Supervisor & Mandor)',
    };
    showToast(`🔄 Beralih peran ke: ${roleTitles[newRole]}`);
  };

  const handleResetPermissions = () => {
    setSystemPermissions(DEFAULT_SYSTEM_PERMISSIONS);
    saveStoredPermissions(DEFAULT_SYSTEM_PERMISSIONS);
    showToast('🔄 Hak Akses berhasil dikembalikan ke standar bawaan pabrik.');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUserState(user);
    setCurrentUser(user);
    const freshUsers = getStoredUsers();
    setUsersList(freshUsers);
    window.dispatchEvent(new CustomEvent('sulamjari-users-updated'));
    // Otomatis saat login hanya bisa menikmati fitur sesuai dengan role model yang dipilih pendaftar!
    handleSwitchRole(user.role);
    setAuthModalOpen(false);
    if (user.role !== 'admin_pusat' && activeTab === 'hak-akses') {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUserState(null);
    setCurrentUser(null);
    setAuthModalOpen(true);
    if (activeTab === 'hak-akses') {
      setActiveTab('dashboard');
    }
    showToast('Sesi telah keluar. Silakan masuk kembali dengan nomor WhatsApp dan password Anda.');
  };

  const handleNavigateTab = (tab: TabId) => {
    // STRICT ACCESS CONTROL: Fitur Hak Akses hanya bisa dilihat dan di edit oleh Admin Pusat
    if (tab === 'hak-akses' && activeRole !== 'admin_pusat') {
      showToast('⛔ Akses Ditolak: Fitur Hak Akses hanya dapat dilihat dan diedit oleh Admin Pusat.');
      return;
    }
    setActiveTab(tab);
  };

  // Guard against non-admin_pusat on 'hak-akses' tab
  useEffect(() => {
    if (activeTab === 'hak-akses' && activeRole !== 'admin_pusat') {
      setActiveTab('dashboard');
    }
  }, [activeRole, activeTab]);

  const currentRolePermissions = systemPermissions[activeRole];

  // Load Initial Data on Mount
  useEffect(() => {
    const loaded = loadStoredData();
    setBahanList(loaded.bahan);
    setMutasiList(loaded.mutasi);
    setPenjualanList(loaded.penjualan);
    setOperasionalList(loaded.operasional);
    setIsLoaded(true);
  }, []);

  // Save changes to localStorage
  const updateBahanList = (newList: BahanBaku[]) => {
    setBahanList(newList);
    saveBahanData(newList);
  };

  const updateMutasiList = (newList: MutasiStok[]) => {
    setMutasiList(newList);
    saveMutasiData(newList);
  };

  const updatePenjualanList = (newList: PenjualanMie[]) => {
    setPenjualanList(newList);
    savePenjualanData(newList);
  };

  const updateOperasionalList = (newList: BiayaOperasional[]) => {
    setOperasionalList(newList);
    saveOperasionalData(newList);
  };

  // -------------------------------------------------------------
  // GOOGLE SPREADSHEET SYNC DATA PULL HANDLER
  // -------------------------------------------------------------
  const handleDataPulledFromSheets = (pulledData: {
    bahanList?: BahanBaku[];
    mutasiList?: MutasiStok[];
    penjualanList?: PenjualanMie[];
    operasionalList?: BiayaOperasional[];
    targetProduksiKg?: number;
    users?: UserAccount[];
    permissions?: SystemPermissions;
  }) => {
    if (pulledData.bahanList && Array.isArray(pulledData.bahanList) && pulledData.bahanList.length > 0) {
      updateBahanList(pulledData.bahanList);
    }
    if (pulledData.mutasiList && Array.isArray(pulledData.mutasiList) && pulledData.mutasiList.length > 0) {
      updateMutasiList(pulledData.mutasiList);
    }
    if (pulledData.penjualanList && Array.isArray(pulledData.penjualanList) && pulledData.penjualanList.length > 0) {
      updatePenjualanList(pulledData.penjualanList);
    }
    if (pulledData.operasionalList && Array.isArray(pulledData.operasionalList) && pulledData.operasionalList.length > 0) {
      updateOperasionalList(pulledData.operasionalList);
    }
    if (pulledData.targetProduksiKg) {
      setTargetProduksiKg(pulledData.targetProduksiKg);
      localStorage.setItem('sulamjari_target_produksi_kg', String(pulledData.targetProduksiKg));
    }
    if (pulledData.permissions) {
      setSystemPermissions(pulledData.permissions);
      saveStoredPermissions(pulledData.permissions);
    }
    if (pulledData.users && Array.isArray(pulledData.users) && pulledData.users.length > 0) {
      saveStoredUsers(pulledData.users);
      setUsersList(pulledData.users);
      window.dispatchEvent(new CustomEvent('sulamjari-users-updated'));
    }
  };

  // Real-time automatic background sync from Google Sheets (No manual "Tarik Data" required)
  useEffect(() => {
    if (
      !sheetsConfig.webAppUrl ||
      !sheetsConfig.webAppUrl.trim().startsWith('http') ||
      !sheetsConfig.autoSyncEnabled
    ) {
      return;
    }

    let isSyncing = false;
    const runAutoSheetsPull = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const res = await fetchAllFromSheets(sheetsConfig.webAppUrl);
        if (res.success && res.data) {
          handleDataPulledFromSheets(res.data);
          setSheetsConfig((prev) => ({
            ...prev,
            lastSyncStatus: 'success',
            lastSyncTime: new Date().toISOString(),
            lastSyncMessage: 'Realtime sync otomatis aktif',
          }));
        }
      } catch (err) {
        // quiet background fail
      } finally {
        isSyncing = false;
      }
    };

    // Initial pull after 2 seconds
    const timer = setTimeout(runAutoSheetsPull, 2000);
    // Recurring auto-sync every 8 seconds
    const interval = setInterval(runAutoSheetsPull, 8000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [sheetsConfig.webAppUrl, sheetsConfig.autoSyncEnabled]);

  // -------------------------------------------------------------
  // MUTASI STOK HANDLERS (AUTOMATIC STOCK ADJUSTMENT)
  // -------------------------------------------------------------
  const handleSaveMutasiMasuk = (newMutasi: MutasiStok) => {
    // 1. Add to mutasi list
    const updatedMutasi = [newMutasi, ...mutasiList];
    updateMutasiList(updatedMutasi);

    // 2. Automatically INCREASE stock for this material
    const updatedBahan = bahanList.map((b) => {
      if (b.id === newMutasi.bahanId) {
        return {
          ...b,
          stokTersedia: b.stokTersedia + newMutasi.jumlah,
          hargaSatuan: newMutasi.hargaSatuan || b.hargaSatuan,
          terakhirDiperbarui: newMutasi.tanggal,
        };
      }
      return b;
    });
    updateBahanList(updatedBahan);
    showToast(`Stok Masuk tersimpan: +${newMutasi.jumlah} ${newMutasi.satuan} ${newMutasi.namaBahan}`);

    // Auto-sync to Google Sheets
    triggerAutoSync('MutasiStok', newMutasi);
  };

  const handleSaveMutasiKeluar = (newMutasi: MutasiStok) => {
    // 1. Add to mutasi list
    const updatedMutasi = [newMutasi, ...mutasiList];
    updateMutasiList(updatedMutasi);

    // 2. Automatically DECREASE stock for this material
    const updatedBahan = bahanList.map((b) => {
      if (b.id === newMutasi.bahanId) {
        return {
          ...b,
          stokTersedia: Math.max(0, b.stokTersedia - newMutasi.jumlah),
          terakhirDiperbarui: newMutasi.tanggal,
        };
      }
      return b;
    });
    updateBahanList(updatedBahan);
    showToast(`Pemakaian produksi dicatat: -${newMutasi.jumlah} ${newMutasi.satuan} ${newMutasi.namaBahan}`);

    // Auto-sync to Google Sheets
    triggerAutoSync('MutasiStok', newMutasi);
  };

  const handleDeleteMutasi = (id: string) => {
    const item = mutasiList.find((m) => m.id === id);
    if (!item) return;

    if (confirm(`Batalkan / hapus catatan mutasi ini? Stok ${item.namaBahan} akan dikembalikan.`)) {
      // Reverse stock effect
      const updatedBahan = bahanList.map((b) => {
        if (b.id === item.bahanId) {
          if (item.tipe === 'MASUK') {
            return { ...b, stokTersedia: Math.max(0, b.stokTersedia - item.jumlah) };
          } else {
            return { ...b, stokTersedia: b.stokTersedia + item.jumlah };
          }
        }
        return b;
      });
      updateBahanList(updatedBahan);

      const updatedMutasi = mutasiList.filter((m) => m.id !== id);
      updateMutasiList(updatedMutasi);
      showToast('Catatan mutasi berhasil dibatalkan.');
    }
  };

  // -------------------------------------------------------------
  // MASTER BAHAN BAKU HANDLERS
  // -------------------------------------------------------------
  const handleSaveBahan = (bahan: BahanBaku) => {
    const existingIndex = bahanList.findIndex((b) => b.id === bahan.id);
    if (existingIndex >= 0) {
      const updated = [...bahanList];
      updated[existingIndex] = bahan;
      updateBahanList(updated);
      showToast(`Bahan baku "${bahan.nama}" berhasil diperbarui.`);
    } else {
      updateBahanList([...bahanList, bahan]);
      showToast(`Bahan baku baru "${bahan.nama}" berhasil ditambahkan.`);
    }
    // Auto-sync to Google Sheets
    triggerAutoSync('BahanBaku', bahan);
  };

  const handleDeleteBahan = (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus bahan baku "${nama}"? Data riwayat terdahulu akan tetap ada.`)) {
      updateBahanList(bahanList.filter((b) => b.id !== id));
      showToast(`Bahan baku "${nama}" telah dihapus.`);
    }
  };

  // -------------------------------------------------------------
  // PENJUALAN MIE HANDLERS
  // -------------------------------------------------------------
  const handleSavePenjualan = (order: PenjualanMie) => {
    const existingIndex = penjualanList.findIndex((p) => p.id === order.id);
    let updatedList: PenjualanMie[];
    if (existingIndex >= 0) {
      updatedList = [...penjualanList];
      updatedList[existingIndex] = order;
    } else {
      updatedList = [order, ...penjualanList];
    }
    updatePenjualanList(updatedList);

    // Calculate total daily sales in Kg for this order's date
    const daySalesKg = updatedList
      .filter((p) => p.tanggal === order.tanggal)
      .reduce((sum, p) => sum + p.jumlahKg, 0);

    if (daySalesKg >= targetProduksiKg) {
      showToast(
        `🎉 LUAR BIASA! Penjualan ${daySalesKg} Kg telah MENCAPAI TARGET produksi harian (${targetProduksiKg} Kg)! 🚀`
      );
    } else {
      const sisa = targetProduksiKg - daySalesKg;
      showToast(
        `Order "${order.namaPelanggan}" (${order.jumlahKg} Kg) dicatat. Progres: ${daySalesKg}/${targetProduksiKg} Kg (Sisa ${sisa} Kg).`
      );
    }

    // Auto-sync to Google Sheets
    triggerAutoSync('PenjualanMie', order);
  };

  const handleDeletePenjualan = (id: string, customer: string) => {
    if (confirm(`Hapus data order penjualan dari "${customer}"?`)) {
      updatePenjualanList(penjualanList.filter((p) => p.id !== id));
      showToast('Order penjualan berhasil dihapus.');
    }
  };

  const handleUpdatePaymentStatus = (id: string, status: StatusPembayaran) => {
    const updated = penjualanList.map((p) => (p.id === id ? { ...p, statusPembayaran: status } : p));
    updatePenjualanList(updated);
    showToast(`Status pembayaran diubah menjadi "${status}".`);
    const found = updated.find((p) => p.id === id);
    if (found) {
      triggerAutoSync('PenjualanMie', found);
    }
  };

  // -------------------------------------------------------------
  // BIAYA OPERASIONAL HANDLERS
  // -------------------------------------------------------------
  const handleSaveOperasional = (biaya: BiayaOperasional) => {
    updateOperasionalList([biaya, ...operasionalList]);
    showToast(`Biaya operasional "${biaya.deskripsi}" (${formatRupiah(biaya.nominal)}) dicatat.`);
    // Auto-sync to Google Sheets
    triggerAutoSync('BiayaOperasional', biaya);
  };

  const handleDeleteOperasional = (id: string, deskripsi: string) => {
    if (confirm(`Hapus catatan biaya "${deskripsi}"?`)) {
      updateOperasionalList(operasionalList.filter((o) => o.id !== id));
      showToast('Catatan biaya operasional berhasil dihapus.');
    }
  };

  // -------------------------------------------------------------
  // RESTORE & BACKUP HANDLER
  // -------------------------------------------------------------
  const handleRestoreBackup = (data: any) => {
    setBahanList(data.bahan || []);
    setMutasiList(data.mutasi || []);
    setPenjualanList(data.penjualan || []);
    setOperasionalList(data.operasional || []);
    saveBahanData(data.bahan || []);
    saveMutasiData(data.mutasi || []);
    savePenjualanData(data.penjualan || []);
    saveOperasionalData(data.operasional || []);
    showToast('Seluruh data berhasil dipulihkan dari cadangan.');
  };

  // Derived counts for navbar badges
  const lowStockCount = bahanList.filter((b) => b.stokTersedia <= b.minStok).length;
  const piutangCount = penjualanList.filter((p) => p.statusPembayaran !== 'LUNAS').length;

  // Open modal generic helper
  const handleOpenModal = (
    type: 'masuk' | 'keluar' | 'penjualan' | 'operasional' | 'bahan' | 'print' | 'backup'
  ) => {
    if (type === 'masuk') setModalMasukOpen(true);
    if (type === 'keluar') setModalKeluarOpen(true);
    if (type === 'penjualan') {
      setEditingPenjualan(null);
      setModalPenjualanOpen(true);
    }
    if (type === 'operasional') setModalOperasionalOpen(true);
    if (type === 'bahan') {
      setEditingBahan(null);
      setModalBahanOpen(true);
    }
    if (type === 'backup') setModalBackupOpen(true);
    if (type === 'print') {
      // Default to today for quick print
      const today = new Date().toISOString().split('T')[0];
      const todaySales = penjualanList.filter((p) => p.tanggal === today);
      const todayUsage = mutasiList.filter((m) => m.tanggal === today && m.tipe === 'KELUAR');
      const todayOps = operasionalList.filter((o) => o.tanggal === today);

      const totalOmset = todaySales.reduce((acc, curr) => acc + curr.totalOmset, 0);
      const totalKgMie = todaySales.reduce((acc, curr) => acc + curr.jumlahKg, 0);
      const totalBiayaBahan = todayUsage.reduce((acc, curr) => acc + curr.totalBiaya, 0);
      const totalBiayaOps = todayOps.reduce((acc, curr) => acc + curr.nominal, 0);
      const labaKotor = totalOmset - totalBiayaBahan;
      const estimasiLabaBersih = labaKotor - totalBiayaOps;

      const opsByCategory: Record<string, number> = {};
      todayOps.forEach((op) => {
        opsByCategory[op.kategori] = (opsByCategory[op.kategori] || 0) + op.nominal;
      });

      setPrintData({
        startDate: today,
        endDate: today,
        totalOmset,
        totalKgMie,
        totalBiayaBahan,
        totalBiayaOps,
        labaKotor,
        estimasiLabaBersih,
        marginLabaKotor: totalOmset > 0 ? (labaKotor / totalOmset) * 100 : 0,
        marginLabaBersih: totalOmset > 0 ? (estimasiLabaBersih / totalOmset) * 100 : 0,
        totalPiutang: todaySales
          .filter((p) => p.statusPembayaran !== 'LUNAS')
          .reduce((acc, curr) => acc + curr.totalOmset, 0),
        opsByCategory,
        penjualanCount: todaySales.length,
        pemakaianCount: todayUsage.length,
      });
      setModalPrintOpen(true);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 text-sm">
        Memuat Sistem Pabrik Mie Sulamjari...
      </div>
    );
  }

  // WAJIB LOGIN DULU: Tidak bisa membuka dan melihat apapun sebelum login atau daftar
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center selection:bg-red-500 selection:text-white">
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>{toastMessage}</span>
          </div>
        )}
        <AuthModal
          isOpen={true}
          isMandatory={true}
          currentUser={null}
          onLoginSuccess={handleLoginSuccess}
          showToast={showToast}
          onUserRegistered={(newUser) => {
            const fresh = getStoredUsers();
            setUsersList(fresh);
            if (sheetsConfig.webAppUrl) {
              syncUsersToSpreadsheet(sheetsConfig.webAppUrl, fresh, 'Pendaftaran Online Pegawai');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-red-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Responsive Navigation Bar with Profile Modal & Google Sheets DB */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        onOpenModal={handleOpenModal}
        onOpenSheetsModal={() => {
          if (activeRole === 'admin_pusat') {
            setModalSheetsOpen(true);
          } else {
            showToast('⚠️ Pengaturan database Google Sheets hanya dapat diakses oleh Admin Pusat.');
          }
        }}
        sheetsConnected={sheetsConfig.lastSyncStatus === 'success' && !!sheetsConfig.webAppUrl}
        lowStockCount={lowStockCount}
        piutangCount={piutangCount}
        activeRole={activeRole}
        rolePermissions={currentRolePermissions}
        currentUser={currentUser}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardTab
            bahanList={bahanList}
            mutasiList={mutasiList}
            penjualanList={penjualanList}
            operasionalList={operasionalList}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onNavigateTab={setActiveTab}
            onOpenModal={handleOpenModal}
            onOpenSheetsModal={activeRole === 'admin_pusat' ? () => setModalSheetsOpen(true) : undefined}
            targetProduksiKg={targetProduksiKg}
            onUpdateTargetProduksi={handleUpdateTargetProduksi}
            onTriggerTargetToast={handleTriggerTargetToast}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            usersList={usersList}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            currentUser={currentUser}
            onUserRegistered={(newUser) => {
              const fresh = getStoredUsers();
              setUsersList(fresh);
              if (sheetsConfig.webAppUrl) {
                syncUsersToSpreadsheet(sheetsConfig.webAppUrl, fresh, 'Pendaftaran Online Pegawai');
              }
            }}
          />
        )}

        {activeTab === 'master-bahan' && (
          <MasterBahanTab
            bahanList={bahanList}
            onOpenAddModal={() => {
              setEditingBahan(null);
              setModalBahanOpen(true);
            }}
            onOpenEditModal={(bahan) => {
              setEditingBahan(bahan);
              setModalBahanOpen(true);
            }}
            onDeleteBahan={handleDeleteBahan}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'stok-mutasi' && (
          <StokMutasiTab
            mutasiList={mutasiList}
            bahanList={bahanList}
            onOpenModalMasuk={() => setModalMasukOpen(true)}
            onOpenModalKeluar={() => setModalKeluarOpen(true)}
            onDeleteMutasi={handleDeleteMutasi}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'pemakaian' && (
          <PemakaianHarianTab
            mutasiList={mutasiList}
            bahanList={bahanList}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenModalKeluar={() => setModalKeluarOpen(true)}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'penjualan' && (
          <PenjualanTab
            penjualanList={penjualanList}
            onOpenAddModal={() => {
              setEditingPenjualan(null);
              setModalPenjualanOpen(true);
            }}
            onOpenEditModal={(order) => {
              setEditingPenjualan(order);
              setModalPenjualanOpen(true);
            }}
            onDeleteOrder={handleDeletePenjualan}
            onUpdateStatus={handleUpdatePaymentStatus}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'operasional' && (
          <OperasionalTab
            operasionalList={operasionalList}
            onOpenAddModal={() => setModalOperasionalOpen(true)}
            onDeleteOperasional={handleDeleteOperasional}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'laba-rugi' && (
          <LaporanKeuanganTab
            penjualanList={penjualanList}
            mutasiList={mutasiList}
            operasionalList={operasionalList}
            bahanList={bahanList}
            onOpenPrintModal={(data) => {
              setPrintData(data);
              setModalPrintOpen(true);
            }}
            activeRole={activeRole}
            rolePermissions={currentRolePermissions}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'hak-akses' && (
          <PengaturanHakAksesTab
            permissions={systemPermissions}
            activeRole={activeRole}
            onUpdatePermissions={handleUpdatePermissions}
            onSwitchRole={handleSwitchRole}
            onResetPermissions={handleResetPermissions}
            showToast={showToast}
            usersList={usersList}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onDeleteUser={handleDeleteUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-slate-800">Pabrik Mie Sulamjari</strong> — Sistem Manajemen Operasional, Stok &amp; Keuangan UMKM.
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Penyimpanan Lokal Browser Aktif (localStorage)</span>
            <span>•</span>
            <button
              onClick={() => handleOpenModal('backup')}
              className="text-red-600 font-semibold hover:underline"
            >
              Cadangan / Ekspor
            </button>
          </div>
        </div>
      </footer>

      {/* Modals Collection */}
      <ModalBahan
        isOpen={modalBahanOpen}
        onClose={() => {
          setModalBahanOpen(false);
          setEditingBahan(null);
        }}
        onSave={handleSaveBahan}
        initialData={editingBahan}
      />

      <ModalStokMasuk
        isOpen={modalMasukOpen}
        onClose={() => setModalMasukOpen(false)}
        bahanList={bahanList}
        onSave={handleSaveMutasiMasuk}
      />

      <ModalStokKeluar
        isOpen={modalKeluarOpen}
        onClose={() => setModalKeluarOpen(false)}
        bahanList={bahanList}
        onSave={handleSaveMutasiKeluar}
      />

      <ModalPenjualan
        isOpen={modalPenjualanOpen}
        onClose={() => {
          setModalPenjualanOpen(false);
          setEditingPenjualan(null);
        }}
        onSave={handleSavePenjualan}
        initialData={editingPenjualan}
      />

      <ModalOperasional
        isOpen={modalOperasionalOpen}
        onClose={() => setModalOperasionalOpen(false)}
        onSave={handleSaveOperasional}
      />

      <ModalPrint
        isOpen={modalPrintOpen}
        onClose={() => {
          setModalPrintOpen(false);
          setPrintData(null);
        }}
        printData={printData}
      />

      <ModalBackup
        isOpen={modalBackupOpen}
        onClose={() => setModalBackupOpen(false)}
        allData={{
          bahan: bahanList,
          mutasi: mutasiList,
          penjualan: penjualanList,
          operasional: operasionalList,
        }}
        onRestore={handleRestoreBackup}
        onReset={resetAllData}
      />

      {/* Google Spreadsheet & Apps Script Database Modal (Khusus Admin Pusat) */}
      <ModalGoogleSheetsSync
        isOpen={modalSheetsOpen && activeRole === 'admin_pusat'}
        onClose={() => setModalSheetsOpen(false)}
        config={sheetsConfig}
        onUpdateConfig={setSheetsConfig}
        bahanList={bahanList}
        mutasiList={mutasiList}
        penjualanList={penjualanList}
        operasionalList={operasionalList}
        targetProduksiKg={targetProduksiKg}
        users={usersList}
        permissions={systemPermissions}
        currentUserName={currentUser?.nama || 'Admin Pusat'}
        onDataPulledFromSheets={handleDataPulledFromSheets}
        showToast={showToast}
      />

      {/* User Complete Profile & Permissions Information Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        activeRole={activeRole}
        permissions={systemPermissions}
        onLogout={handleLogout}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenSheetsModal={() => {
          if (activeRole === 'admin_pusat') {
            setModalSheetsOpen(true);
          } else {
            showToast('⚠️ Pengaturan database Google Sheets hanya dapat diakses oleh Admin Pusat.');
          }
        }}
        onNavigateTab={handleNavigateTab}
      />

      {/* User Login & Register with WA OTP Modal */}
      <AuthModal
        isOpen={authModalOpen || !currentUser}
        onClose={() => setAuthModalOpen(false)}
        isMandatory={!currentUser}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        showToast={showToast}
        onUserRegistered={(newUser) => {
          const fresh = getStoredUsers();
          setUsersList(fresh);
          if (sheetsConfig.webAppUrl) {
            syncUsersToSpreadsheet(sheetsConfig.webAppUrl, fresh, 'Pendaftaran Online Pegawai');
          }
        }}
      />

      {/* WhatsApp Chat Simulation Modal for OTP Verification */}
      <WhatsAppChatModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        message={activeWaMessage}
      />
    </div>
  );
}
