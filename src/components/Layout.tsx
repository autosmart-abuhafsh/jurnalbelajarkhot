import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  ClipboardCheck,
  Award,
  BarChart3,
  FileCheck,
  ScrollText,
  Sliders,
  UserCheck,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from './LogoBelajarKhot';

interface NavItem {
  key: string;
  label: string;
  adminPath: string;
  guruPath?: string;
  icon: React.FC<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    adminPath: '/admin/dashboard',
    guruPath: '/guru/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'santri',
    label: 'Data Santri',
    adminPath: '/admin/santri',
    guruPath: '/guru/santri',
    icon: Users,
  },
  {
    key: 'kelas',
    label: 'Kelas & Kelompok',
    adminPath: '/admin/kelas',
    guruPath: '/guru/kelas',
    icon: BookOpen,
  },
  {
    key: 'jurnal',
    label: 'Jurnal Pembelajaran',
    adminPath: '/admin/jurnal',
    guruPath: '/guru/jurnal',
    icon: FileText,
  },
  {
    key: 'absensi',
    label: 'Absensi Santri',
    adminPath: '/admin/absensi',
    guruPath: '/guru/absensi',
    icon: ClipboardCheck,
  },
  {
    key: 'penilaian',
    label: 'Penilaian Santri',
    adminPath: '/admin/penilaian',
    guruPath: '/guru/penilaian',
    icon: Award,
  },
  {
    key: 'rekap-nilai',
    label: 'Rekap Nilai',
    adminPath: '/admin/rekap-nilai',
    guruPath: '/guru/rekap-nilai',
    icon: BarChart3,
  },
  {
    key: 'rapor-harian',
    label: 'Rapor Harian',
    adminPath: '/admin/rapor-harian',
    guruPath: '/guru/rapor-harian',
    icon: FileCheck,
  },
  {
    key: 'rapor-bulanan',
    label: 'Rapor Bulanan',
    adminPath: '/admin/rapor-bulanan',
    guruPath: '/guru/rapor',
    icon: ScrollText,
  },
  {
    key: 'rubrik',
    label: 'Rubrik Penilaian',
    adminPath: '/admin/rubrik',
    icon: Sliders,
    adminOnly: true,
  },
  {
    key: 'guru',
    label: 'Data Guru',
    adminPath: '/admin/guru',
    icon: UserCheck,
    adminOnly: true,
  },
  {
    key: 'riwayat-aktivitas',
    label: 'Riwayat Aktivitas',
    adminPath: '/admin/riwayat-aktivitas',
    icon: History,
    adminOnly: true,
  },
  {
    key: 'pengaturan',
    label: 'Pengaturan',
    adminPath: '/admin/pengaturan',
    icon: Settings,
    adminOnly: true,
  },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    currentPath,
    navigate,
    logout,
    theme,
    toggleTheme,
    toasts,
    dismissToast,
    confirmDialog,
    closeConfirm,
    askConfirm,
  } = useApp();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const filteredNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const isActiveItem = (item: NavItem) => {
    const target = isAdmin ? item.adminPath : item.guruPath || item.adminPath;
    if (currentPath === target) return true;
    if (item.key === 'santri' && currentPath.includes('/santri/')) return true;
    if (item.key === 'jurnal' && currentPath.includes('/jurnal/')) return true;
    if (item.key === 'rapor-bulanan' && (currentPath.includes('/rapor-bulanan') || currentPath === '/guru/rapor')) {
      return true;
    }
    return false;
  };

  const activeNavItem = filteredNav.find((i) => isActiveItem(i)) || filteredNav[0];

  const handleNavClick = (item: NavItem) => {
    const target = isAdmin ? item.adminPath : item.guruPath || item.adminPath;
    navigate(target);
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    askConfirm({
      title: 'Keluar dari Sistem Akademik',
      message: 'Apakah Anda yakin ingin mengakhiri sesi login saat ini?',
      confirmLabel: 'Ya, Logout',
      danger: true,
      onConfirm: () => {
        closeConfirm();
        logout();
      },
    });
  };

  return (
    <div className="min-h-screen flex bg-[#FAFCF9] dark:bg-[#0D1510] text-[#26332A] dark:text-[#ECF3EE]">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Navigasi Utama"
        className={`no-print hidden lg:flex flex-col shrink-0 border-r border-[#E3EAE3] dark:border-[#24382C] bg-[#FFFFFF] dark:bg-[#142019] transition-all duration-200 ${
          sidebarCollapsed ? 'w-20' : 'w-68'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E3EAE3] dark:border-[#24382C]">
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/dashboard`)}
              className="text-left focus:outline-none"
            >
              <LogoBelajarKhot size="sm" subtitle="Jurnal Akademik" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/dashboard`)}
              className="mx-auto focus:outline-none"
              aria-label="Beranda Belajar Khot"
            >
              <LogoBelajarKhot size="sm" showText={false} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            className="p-1.5 rounded-lg text-[#6B776D] dark:text-[#A3D1B3] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = isActiveItem(item);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#19432D] text-white dark:bg-[#315B43] dark:text-white'
                    : 'text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#A3D1B3]' : 'text-[#6B776D] dark:text-[#A3D1B3]/80'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Footer + Logout */}
        <div className="p-3 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-2">
          {!sidebarCollapsed && currentUser && (
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold text-[#26332A] dark:text-[#ECF3EE] truncate">
                {currentUser.namaLengkap}
              </p>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 truncate">
                {currentUser.role === 'ADMIN' ? 'Administrator Lembaga' : 'Guru Pengajar Khot'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#26332A] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#A3D1B3]" /> : <Moon className="w-4 h-4 text-[#19432D]" />}
              {!sidebarCollapsed && <span>{theme === 'dark' ? 'Terang' : 'Gelap'}</span>}
            </button>
            <button
              type="button"
              onClick={handleLogoutClick}
              aria-label="Logout"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#B44238] dark:text-[#F87171] bg-[#B44238]/10 hover:bg-[#B44238]/20 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] bg-[#FFFFFF] dark:bg-[#142019] h-full flex flex-col border-r border-[#E3EAE3] dark:border-[#24382C] z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#E3EAE3] dark:border-[#24382C]">
              <LogoBelajarKhot size="sm" subtitle="Jurnal Akademik" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup Menu"
                className="p-2 rounded-lg text-[#6B776D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active = isActiveItem(item);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#19432D] text-white'
                        : 'text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[#A3D1B3]' : 'text-[#6B776D]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-[#F3F7F2] dark:bg-[#1B2B22] flex items-center gap-2"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
              </button>
              <button
                type="button"
                onClick={handleLogoutClick}
                className="px-3 py-2 rounded-lg text-xs font-medium text-[#B44238] bg-[#B44238]/10 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: 3 Zones separated by gap-8 */}
        <header className="no-print h-16 px-4 lg:px-8 border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#FFFFFF] dark:bg-[#142019] flex items-center justify-between gap-8 sticky top-0 z-30">
          {/* Zone 1: Brand / Contextual Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka Menu Navigasi"
              className="lg:hidden p-2 rounded-lg text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-bold tracking-tight text-[#19432D] dark:text-[#ECF3EE] whitespace-nowrap shrink-0">
              {activeNavItem?.label || 'Jurnal Akademik'}
            </span>
          </div>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Akses Cepat Akademik"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6B776D] dark:text-[#A3D1B3]/80"
          >
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/jurnal`)}
              className="hover:text-[#19432D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Jurnal
            </button>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/absensi`)}
              className="hover:text-[#19432D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Absensi
            </button>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/penilaian`)}
              className="hover:text-[#19432D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Penilaian
            </button>
            <button
              type="button"
              onClick={() => navigate(isAdmin ? '/admin/rapor-bulanan' : '/guru/rapor')}
              className="hover:text-[#19432D] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Rapor Bulanan
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/jurnal/add`)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#19432D] hover:bg-[#315B43] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jurnal</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Toast Notification Stack */}
      <div
        aria-live="polite"
        className="no-print fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] shadow-lg"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#3B7551] shrink-0 mt-0.5" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#A06A18] shrink-0 mt-0.5" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-[#B44238] shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-[#19432D] dark:text-[#A3D1B3] shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#26332A] dark:text-[#ECF3EE]">{t.title}</p>
              {t.message && (
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Tutup Notifikasi"
              className="text-[#6B776D] hover:text-[#26332A] dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-[#26332A] dark:text-[#ECF3EE]">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-[#6B776D] dark:text-[#A3D1B3]/90 mt-2 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#26332A] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                  confirmDialog.danger
                    ? 'bg-[#B44238] hover:bg-[#99352c]'
                    : 'bg-[#19432D] hover:bg-[#315B43]'
                }`}
              >
                {confirmDialog.confirmLabel || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
