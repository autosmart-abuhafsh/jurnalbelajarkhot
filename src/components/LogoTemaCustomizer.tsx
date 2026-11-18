import React, { useState, useRef } from 'react';
import {
  Upload,
  Palette,
  RotateCcw,
  Check,
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from './LogoBelajarKhot';
import { LogoConfig, TemaConfig } from '../types';

export interface ThemePreset {
  id: string;
  name: string;
  warnaUtama: string;
  warnaGradasi: string;
  warnaAksen: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'hijau-hutan',
    name: 'Hijau Hutan & Matcha',
    warnaUtama: '#19432D',
    warnaGradasi: '#315B43',
    warnaAksen: '#A3D1B3',
  },
  {
    id: 'zamrud-nabawi',
    name: 'Zamrud Nabawi',
    warnaUtama: '#064E3B',
    warnaGradasi: '#047857',
    warnaAksen: '#6EE7B7',
  },
  {
    id: 'biru-andalusia',
    name: 'Biru Malam Andalusia',
    warnaUtama: '#1E3A5F',
    warnaGradasi: '#2563EB',
    warnaAksen: '#93C5FD',
  },
  {
    id: 'merah-kiswah',
    name: 'Merah Marun Kiswah',
    warnaUtama: '#4A1525',
    warnaGradasi: '#881337',
    warnaAksen: '#FDA4AF',
  },
  {
    id: 'hitam-emas',
    name: 'Hitam & Emas Kiswah',
    warnaUtama: '#272118',
    warnaGradasi: '#785A28',
    warnaAksen: '#FDE047',
  },
  {
    id: 'toska-cordoba',
    name: 'Toska Kubah Cordoba',
    warnaUtama: '#134E4A',
    warnaGradasi: '#0D9488',
    warnaAksen: '#5EEAD4',
  },
];

interface LogoTemaCustomizerProps {
  onSaved?: () => void;
  compact?: boolean;
}

export const LogoTemaCustomizer: React.FC<LogoTemaCustomizerProps> = ({
  onSaved,
  compact = false,
}) => {
  const { db, savePengaturan, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [namaLembaga, setNamaLembaga] = useState(
    db.pengaturan.namaLembaga || 'BELAJAR KHOT'
  );
  const [subJudul, setSubJudul] = useState(
    db.pengaturan.subJudulLembaga || 'Lembaga Pendidikan & Pembinaan Kaligrafi Islam'
  );

  const [logoCfg, setLogoCfg] = useState<LogoConfig>(() => ({
    mode: db.pengaturan.logoConfig?.mode || 'vector',
    imageUrl: db.pengaturan.logoConfig?.imageUrl || '',
    arabicSymbol: db.pengaturan.logoConfig?.arabicSymbol || 'خ',
    nibColor: db.pengaturan.logoConfig?.nibColor || '#E5B84B',
    showStarAndBook: db.pengaturan.logoConfig?.showStarAndBook !== false,
    frameShape: db.pengaturan.logoConfig?.frameShape || 'rounded',
  }));

  const [temaCfg, setTemaCfg] = useState<TemaConfig>(() => ({
    presetId: db.pengaturan.temaConfig?.presetId || 'hijau-hutan',
    warnaUtama: db.pengaturan.temaConfig?.warnaUtama || '#19432D',
    warnaGradasi: db.pengaturan.temaConfig?.warnaGradasi || '#315B43',
    warnaAksen: db.pengaturan.temaConfig?.warnaAksen || '#A3D1B3',
  }));

  const [uploading, setUploading] = useState(false);

  const handleSelectPreset = (preset: ThemePreset) => {
    setTemaCfg({
      presetId: preset.id,
      warnaUtama: preset.warnaUtama,
      warnaGradasi: preset.warnaGradasi,
      warnaAksen: preset.warnaAksen,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Format File Tidak Didukung', 'Silakan pilih file gambar (PNG, JPG, SVG, atau WEBP).');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultStr = event.target?.result as string;
      // Resize image on canvas so it fits cleanly in database state
      const img = new Image();
      img.onload = () => {
        const maxDim = 256;
        let width = img.width || 256;
        let height = img.height || 256;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.92);
          setLogoCfg((prev) => ({
            ...prev,
            mode: 'image',
            imageUrl: compressedDataUrl,
          }));
          showToast('success', 'Gambar Logo Dimuat', 'Klik Simpan & Terapkan untuk memasang logo baru.');
        } else {
          setLogoCfg((prev) => ({
            ...prev,
            mode: 'image',
            imageUrl: resultStr,
          }));
        }
        setUploading(false);
      };
      img.onerror = () => {
        setLogoCfg((prev) => ({
          ...prev,
          mode: 'image',
          imageUrl: resultStr,
        }));
        setUploading(false);
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaultFirstLogo = () => {
    setLogoCfg({
      mode: 'vector',
      imageUrl: '',
      arabicSymbol: 'خ',
      nibColor: '#E5B84B',
      showStarAndBook: true,
      frameShape: 'rounded',
    });
    showToast('info', 'Logo Pertama Dipilih', 'Logo dikembalikan ke desain Pena Qalam & Kitab pertama.');
  };

  const handleSaveAll = async () => {
    const nextPengaturan = {
      ...db.pengaturan,
      namaLembaga: namaLembaga.trim() || 'BELAJAR KHOT',
      subJudulLembaga: subJudul.trim() || 'Lembaga Pendidikan & Pembinaan Kaligrafi Islam',
      logoConfig: logoCfg,
      temaConfig: temaCfg,
    };
    const ok = await savePengaturan(nextPengaturan);
    if (ok && onSaved) {
      onSaved();
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: KUSTOMISASI & UPLOAD LOGO PORTAL */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E3EAE3] dark:border-[#24382C]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#315B43] dark:text-[#A3D1B3]">
              Kustomisasi Identitas &amp; Logo Portal
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#26332A] dark:text-[#ECF3EE] mt-0.5">
              Pengaturan Logo Belajar Khot (Vektor &amp; Upload Gambar)
            </h3>
          </div>

          <button
            type="button"
            onClick={handleResetDefaultFirstLogo}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Logo Pertama</span>
          </button>
        </div>

        {/* Live Preview Box (Dark & Light) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0D1510] border border-[#24382C] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-[#A3D1B3]">
                Pratinjau Portal Gelap
              </span>
              <span className="text-[10px] text-[#A3D1B3]/70">Aktif</span>
            </div>
            <LogoBelajarKhot
              size="lg"
              variant="light"
              title={namaLembaga}
              subtitle={subJudul || 'Jurnal Akademik'}
              overrideLogoConfig={logoCfg}
              overrideTemaConfig={temaCfg}
            />
          </div>

          <div className="p-4 rounded-xl bg-[#FAFCF9] border border-[#E3EAE3] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#19432D]/10 text-[#19432D]">
                Pratinjau Terang &amp; Cetak Rapor
              </span>
              <span className="text-[10px] text-[#6B776D]">A4 Resmi</span>
            </div>
            <LogoBelajarKhot
              size="lg"
              variant="print"
              title={namaLembaga}
              subtitle={subJudul || 'Jurnal Akademik'}
              overrideLogoConfig={logoCfg}
              overrideTemaConfig={temaCfg}
            />
          </div>
        </div>

        {/* Mode Switcher: Desain Logo Pertama vs Upload Gambar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-1.5 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
          <button
            type="button"
            onClick={() => setLogoCfg((prev) => ({ ...prev, mode: 'vector' }))}
            className={`py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              logoCfg.mode === 'vector'
                ? 'bg-[#19432D] text-white shadow-sm'
                : 'text-[#26332A] dark:text-[#ECF3EE] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={
              logoCfg.mode === 'vector'
                ? { backgroundColor: temaCfg.warnaUtama }
                : undefined
            }
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Logo Pertama (Pena Qalam &amp; Kitab)</span>
          </button>

          <button
            type="button"
            onClick={() => setLogoCfg((prev) => ({ ...prev, mode: 'image' }))}
            className={`py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              logoCfg.mode === 'image'
                ? 'bg-[#19432D] text-white shadow-sm'
                : 'text-[#26332A] dark:text-[#ECF3EE] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={
              logoCfg.mode === 'image'
                ? { backgroundColor: temaCfg.warnaUtama }
                : undefined
            }
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>Upload Gambar Logo Custom</span>
          </button>
        </div>

        {/* Mode 1: Vector Editor Controls */}
        {logoCfg.mode === 'vector' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
            <div>
              <label className="block font-semibold mb-1.5 text-[#26332A] dark:text-[#ECF3EE]">
                Huruf Kaligrafi Tengah
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  maxLength={3}
                  value={logoCfg.arabicSymbol || 'خ'}
                  onChange={(e) =>
                    setLogoCfg((prev) => ({ ...prev, arabicSymbol: e.target.value }))
                  }
                  className="w-16 px-3 py-2 text-center font-bold text-base rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <div className="flex flex-wrap gap-1">
                  {['خ', 'ن', 'ق', 'ب', 'ا'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setLogoCfg((prev) => ({ ...prev, arabicSymbol: ch }))}
                      className={`w-8 h-8 rounded-lg font-bold text-sm border transition-colors ${
                        logoCfg.arabicSymbol === ch
                          ? 'bg-[#19432D] text-white border-[#19432D]'
                          : 'bg-[#FAFCF9] dark:bg-[#1B2B22] border-[#E3EAE3] dark:border-[#24382C]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5 text-[#26332A] dark:text-[#ECF3EE]">
                Warna Pena Qalam &amp; Ornamen
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={logoCfg.nibColor || '#E5B84B'}
                  onChange={(e) =>
                    setLogoCfg((prev) => ({ ...prev, nibColor: e.target.value }))
                  }
                  aria-label="Pilih warna pena qalam"
                  className="w-10 h-9 p-0.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={logoCfg.nibColor || '#E5B84B'}
                  onChange={(e) =>
                    setLogoCfg((prev) => ({ ...prev, nibColor: e.target.value }))
                  }
                  className="min-w-0 flex-1 px-3 py-2 font-mono uppercase rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5 text-[#26332A] dark:text-[#ECF3EE]">
                Bentuk Bingkai Logo
              </label>
              <select
                value={logoCfg.frameShape || 'rounded'}
                onChange={(e) =>
                  setLogoCfg((prev) => ({
                    ...prev,
                    frameShape: e.target.value as LogoConfig['frameShape'],
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              >
                <option value="rounded">Persegi Membulat (Default)</option>
                <option value="circle">Lingkaran Penuh</option>
                <option value="square">Persegi Tegas</option>
              </select>
            </div>
          </div>
        ) : (
          /* Mode 2: Image Upload Controls */
          <div className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-dashed border-[#315B43] dark:border-[#A3D1B3]/40 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-bold text-[#26332A] dark:text-[#ECF3EE]">
                  Upload File Gambar Logo dari Perangkat (HP / PC)
                </p>
                <p className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80">
                  Mendukung format PNG transparan, JPG, SVG, atau WEBP. Gambar otomatis disesuaikan ukurannya agar rapi di portal &amp; rapor cetak.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition-opacity hover:opacity-95"
                  style={{ backgroundColor: temaCfg.warnaUtama }}
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Memproses...' : 'Pilih Gambar dari HP / PC'}</span>
                </button>

                {logoCfg.imageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setLogoCfg((prev) => ({ ...prev, mode: 'vector', imageUrl: '' }))
                    }
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-[#B44238] bg-[#B44238]/10 hover:bg-[#B44238]/20 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Gambar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Optional URL input or quick use uploaded reference */}
            <div className="pt-3 border-t border-[#E3EAE3] dark:border-[#24382C] flex flex-col sm:flex-row gap-2 items-stretch sm:items-center text-xs">
              <span className="text-[#6B776D] dark:text-[#A3D1B3] font-medium shrink-0">
                Atau tempel URL Gambar:
              </span>
              <input
                type="text"
                value={logoCfg.imageUrl?.startsWith('data:') ? '' : logoCfg.imageUrl || ''}
                onChange={(e) =>
                  setLogoCfg((prev) => ({
                    ...prev,
                    mode: 'image',
                    imageUrl: e.target.value,
                  }))
                }
                placeholder="https://contoh.com/logo-belajar-khot.png"
                className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Nama Brand & Subjudul di Portal */}
        {!compact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E3EAE3] dark:border-[#24382C] text-xs">
            <div>
              <label className="block font-semibold mb-1">Teks Judul Logo / Nama Lembaga</label>
              <input
                type="text"
                value={namaLembaga}
                onChange={(e) => setNamaLembaga(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Sub-Judul Lembaga pada Rapor</label>
              <input
                type="text"
                value={subJudul}
                onChange={(e) => setSubJudul(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: KUSTOMISASI TEMA & WARNA PORTAL (CLEAN, ZERO-OVERFLOW ON MOBILE & DESKTOP) */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#315B43] dark:text-[#A3D1B3]">
              Kustomisasi Tema Portal Akademik (Admin Utama)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#26332A] dark:text-[#ECF3EE] mt-0.5">
              Pengaturan Warna Lencana Logo &amp; Tampilan Portal
            </h3>
          </div>

          {/* 3 Color Dots Preview */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="w-7 h-7 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: temaCfg.warnaUtama }}
              title={`Warna Utama: ${temaCfg.warnaUtama}`}
            />
            <span
              className="w-7 h-7 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: temaCfg.warnaGradasi }}
              title={`Warna Gradasi: ${temaCfg.warnaGradasi}`}
            />
            <span
              className="w-7 h-7 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: temaCfg.warnaAksen }}
              title={`Warna Aksen: ${temaCfg.warnaAksen}`}
            />
          </div>
        </div>

        {/* 6 Preset Cards Grid - Responsive 1 col on tiny, 2 cols on mobile/tablet, 3 cols on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isSelected =
              temaCfg.presetId === preset.id ||
              temaCfg.warnaUtama.toLowerCase() === preset.warnaUtama.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all min-w-0 ${
                  isSelected
                    ? 'border-[#3B7551] dark:border-[#A3D1B3] bg-[#F3F7F2]/80 dark:bg-[#1B2B22] ring-2 ring-[#3B7551]/30 dark:ring-[#A3D1B3]/30'
                    : 'border-[#E3EAE3] dark:border-[#24382C] bg-[#FAFCF9] dark:bg-[#142019] hover:border-[#315B43]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl shrink-0 border border-white/20 shadow-sm flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${preset.warnaUtama} 0%, ${preset.warnaGradasi} 100%)`,
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#26332A] dark:text-[#ECF3EE] leading-snug">
                    {preset.name}
                  </p>
                  <p className="text-[11px] font-mono text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    {preset.warnaUtama}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 3 Custom Hex Color Inputs - Strictly Contained with min-w-0 so it NEVER overflows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3] mb-1.5">
              Warna Utama (Primary)
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
              <input
                type="color"
                value={temaCfg.warnaUtama}
                onChange={(e) =>
                  setTemaCfg((prev) => ({
                    ...prev,
                    presetId: 'custom',
                    warnaUtama: e.target.value.toUpperCase(),
                  }))
                }
                aria-label="Pilih Warna Utama"
                className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0 bg-transparent"
              />
              <input
                type="text"
                value={temaCfg.warnaUtama}
                onChange={(e) =>
                  setTemaCfg((prev) => ({
                    ...prev,
                    presetId: 'custom',
                    warnaUtama: e.target.value,
                  }))
                }
                className="min-w-0 w-full bg-transparent font-mono text-xs font-bold text-[#26332A] dark:text-[#ECF3EE] focus:outline-none"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3] mb-1.5">
              Warna Gradasi (Secondary)
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
              <input
                type="color"
                value={temaCfg.warnaGradasi}
                onChange={(e) =>
                  setTemaCfg((prev) => ({
                    ...prev,
                    presetId: 'custom',
                    warnaGradasi: e.target.value.toUpperCase(),
                  }))
                }
                aria-label="Pilih Warna Gradasi"
                className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0 bg-transparent"
              />
              <input
                type="text"
                value={temaCfg.warnaGradasi}
                onChange={(e) =>
                  setTemaCfg((prev) => ({
                    ...prev,
                    presetId: 'custom',
                    warnaGradasi: e.target.value,
                  }))
                }
                className="min-w-0 w-full bg-transparent font-mono text-xs font-bold text-[#26332A] dark:text-[#ECF3EE] focus:outline-none"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3] mb-1.5">
              Warna Aksen / Lencana
            </label>
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
              <input
                type="color"
                value={temaCfg.warnaAksen}
                onChange={(e) =>
                  setTemaCfg((prev) => ({
                    ...prev,
                    presetId: 'custom',
                    warnaAksen: e.target.value.toUpperCase(),
                  }))
                }
                aria-label="Pilih Warna Aksen"
                className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0 bg-transparent"
              />
              <input
                type="text"
                value={temaCfg.warnaAksen}
                onChange={(e) =>
                  setTemaCfg((prev) => ({
                    ...prev,
                    presetId: 'custom',
                    warnaAksen: e.target.value,
                  }))
                }
                className="min-w-0 w-full bg-transparent font-mono text-xs font-bold text-[#26332A] dark:text-[#ECF3EE] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Save Bar */}
        <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
            Klik tombol simpan untuk menerapkan Logo &amp; Warna Tema ke seluruh Portal, Dashboard, dan Rapor.
          </p>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-95 shrink-0"
            style={{
              background: `linear-gradient(135deg, ${temaCfg.warnaUtama} 0%, ${temaCfg.warnaGradasi} 100%)`,
            }}
          >
            <Palette className="w-4 h-4 shrink-0" />
            <span>Terapkan Logo &amp; Warna Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
