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
  Smartphone,
  FileCode2,
  Share2,
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
    pullFromGoogleSheets,
    resetDemoDatabase,
    askConfirm,
    closeConfirm,
    showToast,
  } = useApp();

  const [form, setForm] = useState<PengaturanAkademik>(() => db.pengaturan);
  const [newProgramName, setNewProgramName] = useState('');
  const [activeScriptTab, setActiveScriptTab] = useState<'none' | 'setup' | 'code'>('setup');

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

  const handleCopyDevicePairingLink = () => {
    const activeGas = (form.gasWebAppUrl || effectiveGasUrl || '').trim();
    if (!activeGas || !activeGas.startsWith('https://script.google.com/')) {
      showToast(
        'warning',
        'Isi URL Web App GAS Terlebih Dahulu',
        'Masukkan URL Google Apps Script (https://script.google.com/macros/s/.../exec) agar link sinkron HP & PC dapat dibuat.'
      );
      return;
    }
    const baseUrl = window.location.origin + window.location.pathname;
    const pairingUrl = `${baseUrl}?gas=${encodeURIComponent(activeGas)}`;
    navigator.clipboard.writeText(pairingUrl);
    showToast(
      'success',
      'Link Sinkronisasi HP & PC Disalin',
      'Buka link ini di browser HP atau PC lain agar otomatis terhubung ke Google Sheets yang sama.'
    );
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
            Pengaturan Sistem, Kustomisasi Logo &amp; Database Google Sheets
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Integrasi 2 File Apps Script (<code className="font-mono">Setup.gs</code> &amp; <code className="font-mono">Code.gs</code>), sinkronisasi real-time HP &amp; PC, serta publikasi Vercel.app &amp; GitHub.io
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
        <div className="lg:col-span-6 space-y-6 min-w-0">
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

        {/* Right: Integrasi Google Sheets (2 Kode: Setup.gs & Code.gs), Sinkronisasi HP & PC, Vercel & GitHub.io */}
        <div className="lg:col-span-6 space-y-6 min-w-0">
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3] shrink-0" />
                <span>3. Database Google Sheets (Setup.gs &amp; Code.gs)</span>
              </h2>
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-[#3B7551]/15 text-[#3B7551] dark:text-[#A3D1B3]">
                {dbStatus === 'connected'
                  ? 'Sinkron HP & PC Aktif'
                  : dbStatus === 'syncing'
                  ? 'Menyinkronkan...'
                  : 'Mode Lokal'}
              </span>
            </div>

            {/* Deployment Readiness Status (GitHub.io, Vercel.app & Multi-Device HP/PC) */}
            <div className="p-3.5 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5 text-[#19432D] dark:text-[#A3D1B3]">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>Status Hosting &amp; Sinkronisasi Lintas Perangkat</span>
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#19432D] text-white">
                  2-Way Auto-Sync
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C]">
                  <p className="font-bold text-[#26332A] dark:text-[#ECF3EE] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7551] shrink-0" />
                    <span>GitHub.io</span>
                  </p>
                  <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    Anti blank/putih di sub-path repository (<code className="font-mono">./</code> &amp; <code className="font-mono">#/</code>).
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C]">
                  <p className="font-bold text-[#26332A] dark:text-[#ECF3EE] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7551] shrink-0" />
                    <span>Vercel.app</span>
                  </p>
                  <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    {isEnvGasConfigured
                      ? 'Terhubung dari Env Variable Vercel.'
                      : 'API Serverless (/api) & Env siap.'}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C]">
                  <p className="font-bold text-[#26332A] dark:text-[#ECF3EE] flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#3B7551] shrink-0" />
                    <span>Sinkron HP &amp; PC</span>
                  </p>
                  <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    Isi di HP langsung muncul di PC &amp; 12 Sheet Google Sheets.
                  </p>
                </div>
              </div>
            </div>

            {/* Form URL Google Apps Script */}
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="font-semibold">
                    URL Web App Google Apps Script (<code className="font-mono">.../exec</code>)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyScript('VITE_GAS_WEB_APP_URL', 'Nama Env Variable VITE_GAS_WEB_APP_URL')
                    }
                    className="text-[11px] font-mono text-[#19432D] dark:text-[#A3D1B3] hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin Nama Env: VITE_GAS_WEB_APP_URL</span>
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
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="font-semibold">ID / Nama Spreadsheet Google Sheets</label>
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
                  Sinkronisasi Terakhir (HP &amp; PC): {new Date(db.pengaturan.lastSyncAt).toLocaleString('id-ID')}
                </p>
              )}

              {/* Tombol Aksi Sinkronisasi 2 Arah & Pairing HP-PC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await savePengaturan(form);
                    await syncWithGoogleSheets(form.gasWebAppUrl || effectiveGasUrl);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}
                  className="py-2.5 px-3 rounded-xl font-semibold text-white flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Kirim &amp; Buat Sheet di Google Sheets</span>
                </button>

                <button
                  type="button"
                  onClick={() => pullFromGoogleSheets(form.gasWebAppUrl || effectiveGasUrl)}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  <span>Tarik Data Terbaru (HP / PC)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDevicePairingLink}
                  className="py-2.5 px-3 rounded-xl font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Salin Link Pairing HP &amp; PC</span>
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

            {/* Panduan & 2 Kode Google Apps Script: Setup.gs dan Code.gs */}
            <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold flex items-center gap-1.5 text-[#19432D] dark:text-[#A3D1B3]">
                  <FileCode2 className="w-4 h-4 shrink-0" />
                  <span>2 Kode Database Google Apps Script (Setup.gs &amp; Code.gs)</span>
                </p>
                <span className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80">
                  Otomatis membentuk 12 Sheet di Google Sheets
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[11px] space-y-1 text-[#26332A] dark:text-[#ECF3EE]">
                <p className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">
                  Cara Pasang di Google Sheets agar HP &amp; PC Sinkron:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-[#6B776D] dark:text-[#A3D1B3]/85">
                  <li>Buka Google Sheets Anda, klik menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Buat 2 file script: tempelkan kode <strong>Setup.gs</strong> dan <strong>Code.gs</strong> di bawah ini.</li>
                  <li>Klik tombol <strong>Run</strong> pada fungsi <code className="font-mono">setupJurnalAkademikDatabase</code> (12 sheet otomatis muncul di Google Sheets).</li>
                  <li>Klik <strong>Deploy &gt; New deployment &gt; Web app</strong> (Execute as: <em>Me</em>, Who has access: <em>Anyone / Siapa saja</em>).</li>
                  <li>Tempelkan URL Web App (<code className="font-mono">.../exec</code>) ke kolom di atas lalu klik <strong>Kirim &amp; Buat Sheet</strong>.</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('setup')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeScriptTab === 'setup'
                      ? 'bg-[#19432D] text-white border-[#19432D]'
                      : 'bg-[#F3F7F2] dark:bg-[#1B2B22] border-[#E3EAE3] dark:border-[#24382C]'
                  }`}
                >
                  1. Kode Setup.gs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('code')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeScriptTab === 'code'
                      ? 'bg-[#19432D] text-white border-[#19432D]'
                      : 'bg-[#F3F7F2] dark:bg-[#1B2B22] border-[#E3EAE3] dark:border-[#24382C]'
                  }`}
                >
                  2. Kode Code.gs
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScript(SETUP_GS_SOURCE, 'Setup.gs')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Unduh Setup.gs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScript(CODE_GS_SOURCE, 'Code.gs')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Unduh Code.gs</span>
                </button>
              </div>

              {activeScriptTab !== 'none' && (
                <div className="p-3.5 rounded-xl bg-[#0D1510] text-[#ECF3EE] border border-[#24382C]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#A3D1B3]">
                      {activeScriptTab === 'setup'
                        ? 'File 1: Setup.gs (Pembuat 12 Sheet Otomatis di Google Sheets)'
                        : 'File 2: Code.gs (API Sinkronisasi 2 Arah HP & PC)'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyScript(
                          activeScriptTab === 'setup' ? SETUP_GS_SOURCE : CODE_GS_SOURCE,
                          activeScriptTab === 'setup' ? 'Setup.gs' : 'Code.gs'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#19432D] text-xs font-semibold flex items-center gap-1 text-white hover:opacity-90"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin {activeScriptTab === 'setup' ? 'Setup.gs' : 'Code.gs'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed">
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

