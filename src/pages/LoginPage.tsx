import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Sun,
  Moon,
  ShieldCheck,
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  BadgeCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from '../components/LogoBelajarKhot';

export const LoginPage: React.FC = () => {
  const { login, theme, toggleTheme, db } = useApp();
  const [portalMode, setPortalMode] = useState<'GURU' | 'ADMIN'>('GURU');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePortalChange = (mode: 'GURU' | 'ADMIN') => {
    setPortalMode(mode);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg(
        portalMode === 'GURU'
          ? 'Silakan isi ID Guru / Username dan password terlebih dahulu.'
          : 'Silakan isi Username Administrator dan password terlebih dahulu.'
      );
      return;
    }
    setSubmitting(true);
    const res = await login(identifier.trim(), password, portalMode);
    setSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal.');
    }
  };

  const temaCfg = db.pengaturan.temaConfig || {
    presetId: 'hijau-hutan',
    warnaUtama: '#19432D',
    warnaGradasi: '#315B43',
    warnaAksen: '#A3D1B3',
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFCF9] dark:bg-[#0D1510] text-[#26332A] dark:text-[#ECF3EE] p-4 sm:p-8">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-2">
        <LogoBelajarKhot size="md" subtitle="Sistem Administrasi & Rapor Akademik" />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-2 hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] transition-colors shrink-0 whitespace-nowrap"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#A3D1B3]" />
          ) : (
            <Moon className="w-4 h-4 text-[#19432D]" />
          )}
          <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
        </button>
      </div>

      {/* Main Split Container */}
      <div className="max-w-5xl w-full mx-auto my-6 sm:my-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        {/* Left Column: Brand & Academic Identity */}
        <div
          className="lg:col-span-7 rounded-2xl text-white p-6 sm:p-10 flex flex-col justify-between border border-white/15 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${temaCfg.warnaUtama} 0%, ${temaCfg.warnaGradasi} 100%)`,
          }}
        >
          <div>
            <p className="text-xs font-semibold tracking-wide" style={{ color: temaCfg.warnaAksen }}>
              {db.pengaturan.namaLembaga} · {db.pengaturan.periodeAktif}
            </p>
            <h1 className="mt-2.5 text-xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
              Jurnal Akademik Belajar Khot
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-[#ECF3EE]/90 leading-relaxed max-w-xl">
              Sistem digital terpadu untuk pencatatan jurnal kegiatan pembelajaran kaligrafi Islam,
              kehadiran santri, evaluasi rubrik penulisan khot, rekapitulasi nilai otomatis, serta
              penerbitan rapor harian dan bulanan berstandar cetak A4.
            </p>
          </div>

          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h2
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: temaCfg.warnaAksen }}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Portal Guru / Pengajar</span>
              </h2>
              <p className="mt-1 text-xs text-[#ECF3EE]/85 leading-relaxed">
                Masuk dengan ID Guru resmi untuk mengisi jurnal pertemuan, absensi santri, nilai
                rubrik khot, rekap nilai, dan cetak rapor kelas binaan.
              </p>
            </div>
            <div>
              <h2
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: temaCfg.warnaAksen }}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Portal Administrator</span>
              </h2>
              <p className="mt-1 text-xs text-[#ECF3EE]/85 leading-relaxed">
                Akses terproteksi untuk mengelola master santri, kelas, akun &amp; ID Guru, rubrik
                penilaian, serta pengesahan rapor lembaga.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authenticated Login Card */}
        <div className="lg:col-span-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 sm:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
              Masuk ke Akun Akademik
            </h2>
            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-1">
              Pilih portal sesuai peran Anda dan masukkan kredensial yang telah didaftarkan.
            </p>

            {/* Segmented Portal Mode Switcher */}
            <div
              role="tablist"
              aria-label="Pilih Portal Login"
              className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={portalMode === 'GURU'}
                onClick={() => handlePortalChange('GURU')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  portalMode === 'GURU'
                    ? 'bg-[#FFFFFF] dark:bg-[#142019] text-[#19432D] dark:text-[#A3D1B3] shadow-xs border border-[#E3EAE3] dark:border-[#24382C]'
                    : 'text-[#6B776D] dark:text-[#ECF3EE]/70 hover:text-[#26332A] dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Portal Guru</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={portalMode === 'ADMIN'}
                onClick={() => handlePortalChange('ADMIN')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  portalMode === 'ADMIN'
                    ? 'bg-[#FFFFFF] dark:bg-[#142019] text-[#19432D] dark:text-[#A3D1B3] shadow-xs border border-[#E3EAE3] dark:border-[#24382C]'
                    : 'text-[#6B776D] dark:text-[#ECF3EE]/70 hover:text-[#26332A] dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Administrator</span>
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-xl bg-[#B44238]/10 border border-[#B44238]/30 text-xs font-medium text-[#B44238] dark:text-[#F87171]"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-[#26332A] dark:text-[#ECF3EE] mb-1.5"
                >
                  {portalMode === 'GURU' ? 'ID Guru atau Username' : 'ID Login Admin atau Username'}
                </label>
                <div className="relative">
                  {portalMode === 'GURU' ? (
                    <BadgeCheck className="w-4 h-4 text-[#6B776D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-[#6B776D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      portalMode === 'GURU'
                        ? 'Contoh: GRU-001 atau syamsu'
                        : 'Contoh: ADM-001 atau admin'
                    }
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[#26332A] dark:text-[#ECF3EE] focus:outline-none focus:border-[#19432D] dark:focus:border-[#A3D1B3]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#26332A] dark:text-[#ECF3EE] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6B776D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[#26332A] dark:text-[#ECF3EE] focus:outline-none focus:border-[#19432D] dark:focus:border-[#A3D1B3]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B776D] hover:text-[#19432D] dark:hover:text-[#A3D1B3] p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-95 disabled:opacity-50 shadow-sm whitespace-nowrap"
                style={{
                  background: `linear-gradient(135deg, ${temaCfg.warnaUtama} 0%, ${temaCfg.warnaGradasi} 100%)`,
                }}
              >
                {submitting
                  ? 'Memverifikasi Akses...'
                  : portalMode === 'GURU'
                    ? 'Masuk Portal Guru'
                    : 'Masuk sebagai Administrator'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex items-start gap-2.5 text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 leading-relaxed">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-[#19432D] dark:text-[#A3D1B3]" />
            <p>
              {portalMode === 'GURU'
                ? 'ID Login Guru (misal GRU-001) diterbitkan oleh Administrator pada modul Data Guru & Admin. Gunakan ID tersebut atau username Anda untuk masuk.'
                : 'Masuk dengan ID Login Admin atau username Administrator. Administrator dapat mengubah atau menambah ID Login secara bebas setelah masuk.'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-[#6B776D] dark:text-[#A3D1B3]/70">
        {db.pengaturan.namaLembaga} · {db.pengaturan.subJudulLembaga}
      </footer>
    </div>
  );
};
