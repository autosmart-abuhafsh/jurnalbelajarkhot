import React, { useState } from 'react';
import {
  Save,
  Database,
  RefreshCw,
  Copy,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PengaturanAkademik } from '../types';
import { CODE_GS_SOURCE, SETUP_GS_SOURCE } from '../utils/gasTemplates';

export const PengaturanPage: React.FC = () => {
  const {
    db,
    dbStatus,
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
      message: 'Seluruh data demonstrasi (BK-00001 s.d. BK-00006, jurnal, absensi, nilai) akan dikembalikan ke kondisi awal.',
      confirmLabel: 'Ya, Reset Data Demo',
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        await resetDemoDatabase();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Pengaturan Sistem &amp; Integrasi Database
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Kelola identitas lembaga Belajar Khot, batas predikat nilai, serta integrasi Google Sheets &amp; Google Apps Script
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 self-start"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Seluruh Pengaturan</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Identitas Lembaga & Parameter Akademik */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
            <h2 className="text-base font-bold">1. Identitas Resmi Lembaga Pendidikan</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Lembaga</label>
                <input
                  type="text"
                  value={form.namaLembaga}
                  onChange={(e) => setForm({ ...form, namaLembaga: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Sub-Judul / Deskripsi Lembaga</label>
                <input
                  type="text"
                  value={form.subJudulLembaga}
                  onChange={(e) => setForm({ ...form, subJudulLembaga: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Alamat Lengkap Lembaga</label>
                <input
                  type="text"
                  value={form.alamatLembaga}
                  onChange={(e) => setForm({ ...form, alamatLembaga: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Kepala / Pengelola Lembaga</label>
                <input
                  type="text"
                  value={form.kepalaLembaga}
                  onChange={(e) => setForm({ ...form, kepalaLembaga: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Nomor Induk / NIY Kepala Lembaga</label>
                <input
                  type="text"
                  value={form.nipKepalaLembaga}
                  onChange={(e) => setForm({ ...form, nipKepalaLembaga: e.target.value })}
                  className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Kota Penerbitan Rapor</label>
                <input
                  type="text"
                  value={form.kotaPenerbitan}
                  onChange={(e) => setForm({ ...form, kotaPenerbitan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Periode Pembelajaran Aktif</label>
                <input
                  type="text"
                  value={form.periodeAktif}
                  onChange={(e) => setForm({ ...form, periodeAktif: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
            </div>
          </div>

          {/* Batas Predikat Nilai */}
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
            <h2 className="text-base font-bold">2. Skala Nilai &amp; Batas Predikat Rapor</h2>
            <div className="grid grid-cols-3 gap-4 text-xs">
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
                  className="w-full px-3 py-2 font-mono font-bold rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
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
                  className="w-full px-3 py-2 font-mono font-bold rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
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
                  className="w-full px-3 py-2 font-mono font-bold rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
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
                  className="w-4 h-4 accent-[#19432D]"
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
                  className="w-4 h-4 accent-[#19432D]"
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder="Tambah program baru (misal: Khot Farisi)..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <button
                  type="button"
                  onClick={handleAddProgram}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  + Tambah Program
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Integrasi Google Sheets & Google Apps Script */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3]" />
                <span>3. Integrasi Google Sheets &amp; GAS</span>
              </h2>
              <span className="text-xs font-mono font-semibold text-[#3B7551] dark:text-[#A3D1B3]">
                Status DB: {dbStatus === 'connected' ? 'Terhubung' : dbStatus === 'syncing' ? 'Sinkronisasi...' : 'Offline Fallback'}
              </span>
            </div>

            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 leading-relaxed">
              Hubungkan aplikasi dengan spreadsheet aplikasi Member Belajar Khot menggunakan Google Apps Script Web App. Skrip inisialisasi tidak pernah menjalankan <code className="font-mono">clear()</code> sehingga seluruh data lama tetap aman.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Google Apps Script Web App URL (<code className="font-mono">exec</code>)
                </label>
                <input
                  type="url"
                  value={form.gasWebAppUrl}
                  onChange={(e) => setForm({ ...form, gasWebAppUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">ID Spreadsheet Master</label>
                <input
                  type="text"
                  value={form.spreadsheetId}
                  onChange={(e) => setForm({ ...form, spreadsheetId: e.target.value })}
                  className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => syncWithGoogleSheets(form.gasWebAppUrl)}
                  className="flex-1 py-2 px-3 rounded-lg font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan ke Google Sheets</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="py-2 px-3 rounded-lg font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data Demo</span>
                </button>
              </div>
            </div>

            {/* File Code.gs & Setup.gs Viewer/Downloader */}
            <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-3">
              <p className="text-xs font-semibold">
                File Backend Google Apps Script (<code className="font-mono">Setup.gs</code> &amp; <code className="font-mono">Code.gs</code>):
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveScriptTab((t) => (t === 'setup' ? 'none' : 'setup'))
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  {activeScriptTab === 'setup' ? 'Tutup Setup.gs' : 'Lihat Setup.gs'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveScriptTab((t) => (t === 'code' ? 'none' : 'code'))
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  {activeScriptTab === 'code' ? 'Tutup Code.gs' : 'Lihat Code.gs'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScript(SETUP_GS_SOURCE, 'Setup.gs')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Setup.gs</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScript(CODE_GS_SOURCE, 'Code.gs')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
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
