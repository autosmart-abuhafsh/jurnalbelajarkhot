import React, { useState } from 'react';
import {
  Save,
  Database,
  RefreshCw,
  Copy,
  Download,
  RotateCcw,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PengaturanAkademik } from '../types';
import { CODE_GS_SOURCE, SETUP_GS_SOURCE } from '../utils/gasTemplates';
import { LogoTemaCustomizer } from '../components/LogoTemaCustomizer';

export const PengaturanPage: React.FC = () => {
  const {
    db,
    dbStatus,
    isEnvGasConfigured,
    effectiveGasUrl,
    savePengaturan,
    syncWithGoogleSheets,
    resetDemoDatabase,
    askConfirm,
    closeConfirm,
    showToast,
  } = useApp();

  const [form, setForm] = useState<PengaturanAkademik>(() => db.pengaturan);
  const [newProgramName, setNewProgramName] = useState('');
  const [activeScriptTab, setActiveScriptTab] = useState<'none' | 'setup' | 'code'>('none');

  React.useEffect(() => {
    setForm(db.pengaturan);
  }, [db.pengaturan]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePengaturan(form);
  };

  const handleAddProgram = () => {
    if (!newProgramName.trim()) return;
    if (form.programs.includes(newProgramName.trim())) return;
    setForm((prev) => ({
      ...prev,
      programs: [...prev.programs, newProgramName.trim()],
    }));
    setNewProgramName('');
  };

  const handleCopyScript = (source: string, name: string) => {
    navigator.clipboard.writeText(source);
    showToast('success', `${name} Disalin`, `Kode ${name} telah disalin ke clipboard.`);
  };

  const handleDownloadScript = (source: string, filename: string) => {
    const blob = new Blob([source], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDemo = () => {
    askConfirm({
      title: 'Reset Data Demonstrasi ke Awal?',
      message:
        'Seluruh data demonstrasi (BK-00001 s.d. BK-00006, jurnal, absensi, nilai) akan dikembalikan ke kondisi awal.',
      confirmLabel: 'Ya, Reset Data Demo',
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        await resetDemoDatabase();
      },
    });
  };

  const primaryColor = db.pengaturan.temaConfig?.warnaUtama || '#19432D';
  const secondaryColor = db.pengaturan.temaConfig?.warnaGradasi || '#315B43';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Pengaturan Sistem, Kustomisasi Logo &amp; Integrasi Database
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Kelola logo portal (vektor &amp; upload gambar), tema warna, identitas lembaga Belajar Khot, serta integrasi Vercel.app, GitHub.io &amp; Google Sheets
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 self-stretch sm:self-start shadow-xs"
        >
          <Save className="w-4 h-4 shrink-0" />
          <span>Simpan Seluruh Pengaturan</span>
        </button>
      </div>

      {/* Kustomisasi Logo (Vektor & Upload Gambar) & Tema Warna Portal */}
      <LogoTemaCustomizer compact />

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Identitas Lembaga & Parameter Akademik */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold">1. Identitas Resmi Lembaga Pendidikan</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Lembaga</label>
                <input
                  type="text"
                  value={form.namaLembaga}
                  onChange={(e) => setForm({ ...form, namaLembaga: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Sub-Judul / Deskripsi Lembaga</label>
                <input
                  type="text"
                  value={form.subJudulLembaga}
                  onChange={(e) => setForm({ ...form, subJudulLembaga: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Alamat Lengkap Lembaga</label>
                <input
                  type="text"
                  value={form.alamatLembaga}
                  onChange={(e) => setForm({ ...form, alamatLembaga: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Kepala / Pengelola Lembaga</label>
                <input
                  type="text"
                  value={form.kepalaLembaga}
                  onChange={(e) => setForm({ ...form, kepalaLembaga: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nomor Induk / NIY Kepala Lembaga</label>
                <input
                  type="text"
                  value={form.nipKepalaLembaga}
                  onChange={(e) => setForm({ ...form, nipKepalaLembaga: e.target.value })}
                  className="w-full px-3 py-2.5 font-mono rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Kota Penerbitan Rapor</label>
                <input
                  type="text"
                  value={form.kotaPenerbitan}
                  onChange={(e) => setForm({ ...form, kotaPenerbitan: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Periode Pembelajaran Aktif</label>
                <input
                  type="text"
                  value={form.periodeAktif}
                  onChange={(e) => setForm({ ...form, periodeAktif: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
            </div>
          </div>

          {/* Batas Predikat Nilai */}
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold">2. Skala Nilai &amp; Batas Predikat Rapor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Batas Minimal Predikat A</label>
                <input
                  type="number"
                  value={form.batasPredikat.A}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batasPredikat: { ...form.batasPredikat, A: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2.5 font-mono font-bold rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <span className="text-[11px] text-[#6B776D]">Default: 90–100</span>
              </div>
              <div>
                <label className="block font-semibold mb-1">Batas Minimal Predikat B</label>
                <input
                  type="number"
                  value={form.batasPredikat.B}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batasPredikat: { ...form.batasPredikat, B: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2.5 font-mono font-bold rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <span className="text-[11px] text-[#6B776D]">Default: 80–89</span>
              </div>
              <div>
                <label className="block font-semibold mb-1">Batas Minimal Predikat C</label>
                <input
                  type="number"
                  value={form.batasPredikat.C}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batasPredikat: { ...form.batasPredikat, C: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2.5 font-mono font-bold rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <span className="text-[11px] text-[#6B776D]">Di bawah ini = D</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-2.5 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.izinkanGuruCetakRapor}
                  onChange={(e) =>
                    setForm({ ...form, izinkanGuruCetakRapor: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#19432D] shrink-0"
                />
                <span className="font-medium">
                  Izinkan Guru / Pengajar mencetak dan mengunduh rapor santri di kelasnya
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tampilkanDataDemo}
                  onChange={(e) =>
                    setForm({ ...form, tampilkanDataDemo: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#19432D] shrink-0"
                />
                <span className="font-medium">
                  Tampilkan Data Demonstrasi (BK-00001 s.d. BK-00006)
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-[#E3EAE3] dark:border-[#24382C]">
              <label className="block text-xs font-semibold mb-1.5">
                Daftar Program Khot ({form.programs.join(', ')})
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder="Tambah program baru (misal: Khot Farisi)..."
                  className="min-w-0 flex-1 px-3 py-2 text-xs rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <button
                  type="button"
                  onClick={handleAddProgram}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] shrink-0"
                >
                  + Tambah Program
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Integrasi Google Sheets, Vercel.app & GitHub Pages */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3] shrink-0" />
                <span>3. Integrasi Google Sheets, Vercel &amp; GitHub.io</span>
              </h2>
              <span className="text-xs font-mono font-semibold text-[#3B7551] dark:text-[#A3D1B3]">
                Status DB:{' '}
                {dbStatus === 'connected'
                  ? 'Terhubung'
                  : dbStatus === 'syncing'
                  ? 'Sinkronisasi...'
                  : 'Offline Fallback'}
              </span>
            </div>

            {/* Deployment Readiness Status (GitHub.io & Vercel.app) */}
            <div className="p-3.5 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 text-[#19432D] dark:text-[#A3D1B3]">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>Status Integrasi Hosting &amp; Auto-Sync</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#3B7551]/15 text-[#3B7551] dark:text-[#A3D1B3]">
                  Auto-Sync Aktif
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C]">
                  <p className="font-bold text-[#26332A] dark:text-[#ECF3EE] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7551] shrink-0" />
                    <span>GitHub Pages (github.io)</span>
                  </p>
                  <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    Path relatif (<code className="font-mono">./</code>), <code className="font-mono">404.html</code> &amp; GitHub Actions siap (anti layar putih).
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C]">
                  <p className="font-bold text-[#26332A] dark:text-[#ECF3EE] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7551] shrink-0" />
                    <span>Vercel (vercel.app)</span>
                  </p>
                  <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    {isEnvGasConfigured
                      ? 'Terhubung otomatis dari Environment Variable Vercel.'
                      : 'Serverless API (/api) & Environment Variable siap.'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 leading-relaxed">
              Setiap perubahan data otomatis tersinkron ke Google Sheets apabila URL Web App Google Apps Script diisi di bawah ini atau dipasang langsung pada <strong>Environment Variables Vercel.app</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">
                    Google Apps Script Web App URL (<code className="font-mono">exec</code>)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyScript('VITE_GAS_WEB_APP_URL', 'Nama Env Variable VITE_GAS_WEB_APP_URL')
                    }
                    className="text-[11px] font-mono text-[#19432D] dark:text-[#A3D1B3] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>VITE_GAS_WEB_APP_URL</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={form.gasWebAppUrl || effectiveGasUrl}
                  onChange={(e) => setForm({ ...form, gasWebAppUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2.5 font-mono rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold">ID Spreadsheet Master</label>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyScript('VITE_GAS_SPREADSHEET_ID', 'Nama Env Variable VITE_GAS_SPREADSHEET_ID')
                    }
                    className="text-[11px] font-mono text-[#19432D] dark:text-[#A3D1B3] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>VITE_GAS_SPREADSHEET_ID</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={form.spreadsheetId}
                  onChange={(e) => setForm({ ...form, spreadsheetId: e.target.value })}
                  className="w-full px-3 py-2.5 font-mono rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              {db.pengaturan.lastSyncAt && (
                <p className="text-[11px] font-mono text-[#3B7551] dark:text-[#A3D1B3]">
                  Sinkronisasi Terakhir: {new Date(db.pengaturan.lastSyncAt).toLocaleString('id-ID')}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => syncWithGoogleSheets(form.gasWebAppUrl || effectiveGasUrl)}
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}
                  className="py-2.5 px-3 rounded-xl font-semibold text-white flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Sinkronkan ke Sheets</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Reset Data Demo</span>
                </button>
              </div>
            </div>

            {/* File Code.gs & Setup.gs Viewer/Downloader */}
            <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-3">
              <p className="text-xs font-semibold">
                File Backend Google Apps Script (<code className="font-mono">Setup.gs</code> &amp;{' '}
                <code className="font-mono">Code.gs</code>):
              </p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveScriptTab((t) => (t === 'setup' ? 'none' : 'setup'))
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  {activeScriptTab === 'setup' ? 'Tutup Setup.gs' : 'Lihat Setup.gs'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveScriptTab((t) => (t === 'code' ? 'none' : 'code'))
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  {activeScriptTab === 'code' ? 'Tutup Code.gs' : 'Lihat Code.gs'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScript(SETUP_GS_SOURCE, 'Setup.gs')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Setup.gs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScript(CODE_GS_SOURCE, 'Code.gs')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Code.gs</span>
                </button>
              </div>

              {activeScriptTab !== 'none' && (
                <div className="p-3 rounded-xl bg-[#0D1510] text-[#ECF3EE] border border-[#24382C]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#A3D1B3]">
                      {activeScriptTab === 'setup' ? 'Setup.gs' : 'Code.gs'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyScript(
                          activeScriptTab === 'setup' ? SETUP_GS_SOURCE : CODE_GS_SOURCE,
                          activeScriptTab === 'setup' ? 'Setup.gs' : 'Code.gs'
                        )
                      }
                      className="text-xs flex items-center gap-1 text-[#A3D1B3] hover:underline"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                    {activeScriptTab === 'setup' ? SETUP_GS_SOURCE : CODE_GS_SOURCE}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

