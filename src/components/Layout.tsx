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
  Palette,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from './LogoBelajarKhot';
import { LogoTemaCustomizer } from './LogoTemaCustomizer';

interface NavItem {
  key: string;
  label: string;
  shortLabel?: string;
  adminPath: string;
  guruPath?: string;
  icon: React.FC<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Beranda',
    adminPath: '/admin/dashboard',
    guruPath: '/guru/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'santri',
    label: 'Data Santri',
    shortLabel: 'Santri',
    adminPath: '/admin/santri',
    guruPath: '/guru/santri',
    icon: Users,
  },
  {
    key: 'kelas',
    label: 'Kelas & Kelompok',
    shortLabel: 'Kelas',
    adminPath: '/admin/kelas',
    guruPath: '/guru/kelas',
    icon: BookOpen,
  },
  {
    key: 'jurnal',
    label: 'Jurnal Pembelajaran',
    shortLabel: 'Jurnal',
    adminPath: '/admin/jurnal',
    guruPath: '/guru/jurnal',
    icon: FileText,
  },
  {
    key: 'absensi',
    label: 'Absensi Santri',
    shortLabel: 'Absensi',
    adminPath: '/admin/absensi',
    guruPath: '/guru/absensi',
    icon: ClipboardCheck,
  },
  {
    key: 'penilaian',
    label: 'Penilaian Santri',
    shortLabel: 'Penilaian',
    adminPath: '/admin/penilaian',
    guruPath: '/guru/penilaian',
    icon: Award,
  },
  {
    key: 'rekap-nilai',
    label: 'Rekap Nilai',
    shortLabel: 'Rekap',
    adminPath: '/admin/rekap-nilai',
    guruPath: '/guru/rekap-nilai',
    icon: BarChart3,
  },
  {
    key: 'rapor-harian',
    label: 'Rapor Harian',
    shortLabel: 'Rapor Harian',
    adminPath: '/admin/rapor-harian',
    guruPath: '/guru/rapor-harian',
    icon: FileCheck,
  },
  {
    key: 'rapor-bulanan',
    label: 'Rapor Bulanan',
    shortLabel: 'Rapor',
    adminPath: '/admin/rapor-bulanan',
    guruPath: '/guru/rapor',
    icon: ScrollText,
  },
  {
    key: 'rubrik',
    label: 'Rubrik Penilaian',
    shortLabel: 'Rubrik',
    adminPath: '/admin/rubrik',
    icon: Sliders,
    adminOnly: true,
  },
  {
    key: 'guru',
    label: 'Data Guru',
    shortLabel: 'Guru',
    adminPath: '/admin/guru',
    icon: UserCheck,
    adminOnly: true,
  },
  {
    key: 'riwayat-aktivitas',
    label: 'Riwayat Aktivitas',
    shortLabel: 'Log',
    adminPath: '/admin/riwayat-aktivitas',
    icon: History,
    adminOnly: true,
  },
  {
    key: 'pengaturan',
    label: 'Pengaturan',
    shortLabel: 'Pengaturan',
    adminPath: '/admin/pengaturan',
    icon: Settings,
    adminOnly: true,
  },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    db,
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
  const [logoModalOpen, setLogoModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const primaryColor = db.pengaturan.temaConfig?.warnaUtama || '#19432D';
  const secondaryColor = db.pengaturan.temaConfig?.warnaGradasi || '#315B43';
  const accentColor = db.pengaturan.temaConfig?.warnaAksen || '#A3D1B3';

  const filteredNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const isActiveItem = (item: NavItem) => {
    const target = isAdmin ? item.adminPath : item.guruPath || item.adminPath;
    if (currentPath === target) return true;
    if (item.key === 'santri' && currentPath.includes('/santri/')) return true;
    if (item.key === 'jurnal' && currentPath.includes('/jurnal/')) return true;
    if (
      item.key === 'rapor-bulanan' &&
      (currentPath.includes('/rapor-bulanan') || currentPath === '/guru/rapor')
    ) {
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

  // Bottom bar quick items for mobile (HP)
  const mobileQuickKeys = ['dashboard', 'jurnal', 'absensi', 'penilaian', 'rapor-bulanan'];
  const mobileBottomItems = filteredNav.filter((item) => mobileQuickKeys.includes(item.key));

  return (
    <div className="min-h-screen flex bg-[#FAFCF9] dark:bg-[#0D1510] text-[#26332A] dark:text-[#ECF3EE]">
      {/* Desktop Sidebar */}
      <aside
        aria-label="Navigasi Utama"
        className={`no-print hidden lg:flex flex-col shrink-0 border-r border-[#E3EAE3] dark:border-[#24382C] bg-[#FFFFFF] dark:bg-[#142019] transition-all duration-200 sticky top-0 h-screen ${
          sidebarCollapsed ? 'w-20' : 'w-68'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-3.5 flex items-center justify-between gap-2 border-b border-[#E3EAE3] dark:border-[#24382C]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate(`${rolePrefix}/dashboard`)}
                className="text-left focus:outline-none min-w-0 flex-1"
              >
                <LogoBelajarKhot size="sm" subtitle="Jurnal Akademik" />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setLogoModalOpen(true)}
                  title="Edit / Upload Logo & Tema Portal"
                  aria-label="Edit Logo dan Tema Portal"
                  className="p-1.5 rounded-lg text-[#6B776D] dark:text-[#A3D1B3] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] transition-colors shrink-0"
                >
                  <Palette className="w-4 h-4" />
                </button>
              )}
            </div>
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
            className="p-1.5 rounded-lg text-[#6B776D] dark:text-[#A3D1B3] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] transition-colors shrink-0"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
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
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      }
                    : undefined
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'text-white shadow-xs'
                    : 'text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-white' : 'text-[#6B776D] dark:text-[#A3D1B3]/80'
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
            <div className="px-2 py-1">
              <p className="text-xs font-semibold text-[#26332A] dark:text-[#ECF3EE] truncate">
                {currentUser.namaLengkap}
              </p>
              <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80 truncate">
                {currentUser.role === 'ADMIN' ? 'Administrator Lembaga' : 'Guru Pengajar Khot'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#26332A] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] transition-colors shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#A3D1B3]" />
              ) : (
                <Moon className="w-4 h-4 text-[#19432D]" />
              )}
              {!sidebarCollapsed && <span>{theme === 'dark' ? 'Terang' : 'Gelap'}</span>}
            </button>
            <button
              type="button"
              onClick={handleLogoutClick}
              aria-label="Logout"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#B44238] dark:text-[#F87171] bg-[#B44238]/10 hover:bg-[#B44238]/20 transition-colors whitespace-nowrap"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-76 max-w-[86vw] bg-[#FFFFFF] dark:bg-[#142019] h-full flex flex-col border-r border-[#E3EAE3] dark:border-[#24382C] z-10 shadow-2xl">
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#E3EAE3] dark:border-[#24382C]">
              <LogoBelajarKhot size="sm" subtitle="Jurnal Akademik" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup Menu"
                className="p-2 rounded-xl text-[#6B776D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAdmin && (
              <div className="px-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLogoModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[#19432D] dark:text-[#A3D1B3] flex items-center justify-center gap-2"
                >
                  <Palette className="w-4 h-4" />
                  <span>Ubah / Upload Logo &amp; Tema Portal</span>
                </button>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active = isActiveItem(item);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavClick(item)}
                    style={
                      active
                        ? {
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                          }
                        : undefined
                    }
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'text-white shadow-xs'
                        : 'text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-[#6B776D]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-3">
              {currentUser && (
                <div className="px-1">
                  <p className="text-xs font-bold text-[#26332A] dark:text-[#ECF3EE] truncate">
                    {currentUser.namaLengkap}
                  </p>
                  <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80">
                    {currentUser.role === 'ADMIN' ? 'Administrator Lembaga' : 'Guru Pengajar Khot'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] flex items-center justify-center gap-2"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'Terang' : 'Gelap'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#B44238] bg-[#B44238]/10 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Responsive on HP & PC */}
        <header className="no-print h-16 px-3.5 sm:px-6 lg:px-8 border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#FFFFFF]/95 dark:bg-[#142019]/95 backdrop-blur-xs flex items-center justify-between gap-3 sm:gap-6 sticky top-0 z-30">
          {/* Zone 1: Mobile Menu Trigger + Contextual Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka Menu Navigasi"
              className="lg:hidden p-2 rounded-xl text-[#26332A] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden shrink-0">
              <LogoBelajarKhot size="sm" showText={false} />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-[#19432D] dark:text-[#ECF3EE] truncate">
              {activeNavItem?.label || 'Jurnal Akademik'}
            </span>
          </div>

          {/* Zone 2: Concise Single-Line Navigation Links on Desktop */}
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

          {/* Zone 3: Quick Actions (Edit Logo/Tema + Tambah Jurnal) */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setLogoModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E3EAE3] dark:border-[#24382C] bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Ubah / Upload Logo & Warna Tema Portal"
              >
                <Palette className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                <span className="hidden sm:inline">Logo &amp; Tema</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/jurnal/add`)}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Tambah Jurnal</span>
            </button>
          </div>
        </header>

        {/* Page Viewport with comfortable bottom padding for mobile nav */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (HP Friendly Touch Targets) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFFFF]/95 dark:bg-[#142019]/95 backdrop-blur-md border-t border-[#E3EAE3] dark:border-[#24382C] px-2 py-1.5 grid grid-cols-6 gap-1 shadow-lg"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveItem(item);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-semibold transition-colors ${
                active
                  ? 'text-[#19432D] dark:text-[#A3D1B3] bg-[#F3F7F2] dark:bg-[#1B2B22]'
                  : 'text-[#6B776D] dark:text-[#ECF3EE]/70'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="truncate max-w-full">{item.shortLabel || item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-semibold text-[#6B776D] dark:text-[#ECF3EE]/70"
        >
          <Menu className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate max-w-full">Menu</span>
        </button>
      </nav>

      {/* Modal Kustomisasi Logo & Tema Portal */}
      {logoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logo-tema-modal-title"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-[#FAFCF9] dark:bg-[#0D1510] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 bg-[#FFFFFF] dark:bg-[#142019] border-b border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Palette className="w-5 h-5 text-[#19432D] dark:text-[#A3D1B3] shrink-0" />
                <h2
                  id="logo-tema-modal-title"
                  className="text-base sm:text-lg font-bold text-[#26332A] dark:text-[#ECF3EE] truncate"
                >
                  Kustomisasi &amp; Upload Logo serta Warna Tema Portal
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLogoModalOpen(false)}
                aria-label="Tutup Modal Kustomisasi Logo"
                className="p-2 rounded-xl text-[#6B776D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <LogoTemaCustomizer onSaved={() => setLogoModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Stack */}
      <div
        aria-live="polite"
        className="no-print fixed bottom-20 lg:bottom-5 right-4 sm:right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] shadow-lg"
          >
            {t.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-[#3B7551] shrink-0 mt-0.5" />
            )}
            {t.type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-[#A06A18] shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <XCircle className="w-5 h-5 text-[#B44238] shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="w-5 h-5 text-[#19432D] dark:text-[#A3D1B3] shrink-0 mt-0.5" />
            )}
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
            <h3
              id="confirm-dialog-title"
              className="text-lg font-bold text-[#26332A] dark:text-[#ECF3EE]"
            >
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
