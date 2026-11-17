import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SantriPage } from './pages/SantriPage';
import { KelasPage } from './pages/KelasPage';
import { JurnalPage } from './pages/JurnalPage';
import { AbsensiPage } from './pages/AbsensiPage';
import { PenilaianPage } from './pages/PenilaianPage';
import { RekapNilaiPage } from './pages/RekapNilaiPage';
import { RaporHarianPage } from './pages/RaporHarianPage';
import { RaporBulananPage } from './pages/RaporBulananPage';
import { RubrikPage } from './pages/RubrikPage';
import { GuruPage } from './pages/GuruPage';
import { AktivitasPage } from './pages/AktivitasPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { PrintDocumentView } from './pages/PrintDocumentView';

const AppRouter: React.FC = () => {
  const { currentUser, currentPath } = useApp();

  // Protect all internal routes behind authentication
  if (!currentUser || currentPath === '/login') {
    return <LoginPage />;
  }

  // Dedicated Print Views (/print/jurnal/:id, /print/absensi/:id, /print/rapor-harian/:id, /print/rapor-bulanan/:id)
  if (currentPath.startsWith('/print/')) {
    const parts = currentPath.split('/').filter(Boolean); // ['print', type, id]
    const docType = (parts[1] || 'jurnal') as
      | 'jurnal'
      | 'absensi'
      | 'rapor-harian'
      | 'rapor-bulanan';
    const targetId = parts[2] || '';
    return <PrintDocumentView docType={docType} targetId={targetId} />;
  }

  const isAdmin = currentUser.role === 'ADMIN';

  const renderPage = () => {
    // Santri detail (/admin/santri/:id or /guru/santri/:id)
    const santriDetailMatch = currentPath.match(/^\/(admin|guru)\/santri\/([^/]+)$/);
    if (santriDetailMatch) {
      return <SantriPage selectedSantriIdFromRoute={santriDetailMatch[2]} />;
    }

    // Jurnal add (/admin/jurnal/add or /guru/jurnal/add)
    if (currentPath === '/admin/jurnal/add' || currentPath === '/guru/jurnal/add') {
      return <JurnalPage modeFromRoute="add" />;
    }

    // Jurnal detail (/admin/jurnal/:id or /guru/jurnal/:id)
    const jurnalDetailMatch = currentPath.match(/^\/(admin|guru)\/jurnal\/([^/]+)$/);
    if (jurnalDetailMatch) {
      return <JurnalPage modeFromRoute="detail" jurnalIdFromRoute={jurnalDetailMatch[2]} />;
    }

    // Standard module routes
    if (currentPath.endsWith('/santri')) return <SantriPage />;
    if (currentPath.endsWith('/kelas')) return <KelasPage />;
    if (currentPath.endsWith('/jurnal')) return <JurnalPage modeFromRoute="list" />;
    if (currentPath.endsWith('/absensi')) return <AbsensiPage />;
    if (currentPath.endsWith('/penilaian')) return <PenilaianPage />;
    if (currentPath.endsWith('/rekap-nilai')) return <RekapNilaiPage />;
    if (currentPath.endsWith('/rapor-harian')) return <RaporHarianPage />;
    if (currentPath.endsWith('/rapor-bulanan') || currentPath === '/guru/rapor') {
      return <RaporBulananPage />;
    }

    // Admin-only routes
    if (currentPath === '/admin/rubrik') {
      return isAdmin ? <RubrikPage /> : <DashboardPage />;
    }
    if (currentPath === '/admin/guru') {
      return isAdmin ? <GuruPage /> : <DashboardPage />;
    }
    if (currentPath === '/admin/riwayat-aktivitas') {
      return isAdmin ? <AktivitasPage /> : <DashboardPage />;
    }
    if (currentPath === '/admin/pengaturan') {
      return isAdmin ? <PengaturanPage /> : <DashboardPage />;
    }

    return <DashboardPage />;
  };

  return <Layout>{renderPage()}</Layout>;
};

export function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
