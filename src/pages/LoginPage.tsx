import React, { useState } from 'react';
import { Lock, User as UserIcon, Sun, Moon, ShieldCheck, BookOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from '../components/LogoBelajarKhot';

export const LoginPage: React.FC = () => {
  const { login, theme, toggleTheme, db } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Silakan isi username dan password terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    const res = await login(username.trim(), password);
    setSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal.');
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
    setSubmitting(true);
    const res = await login(u, p);
    setSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Autentikasi gagal.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFCF9] dark:bg-[#0D1510] text-[#26332A] dark:text-[#ECF3EE] p-4 sm:p-8">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <LogoBelajarKhot size="md" subtitle="Sistem Administrasi & Rapor Akademik" />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-2 hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-[#A3D1B3]" /> : <Moon className="w-4 h-4 text-[#19432D]" />}
          <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
        </button>
      </div>

      {/* Main Split Container */}
      <div className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Brand & Academic Identity */}
        <div className="lg:col-span-7 rounded-2xl bg-[#19432D] text-white p-8 sm:p-10 flex flex-col justify-between border border-[#315B43]">
          <div>
            <p className="text-xs font-medium text-[#A3D1B3] tracking-wide">
              {db.pengaturan.namaLembaga} · {db.pengaturan.periodeAktif}
            </p>
            <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
              Jurnal Akademik Belajar Khot
            </h1>
            <p className="mt-3 text-sm text-[#ECF3EE]/85 leading-relaxed max-w-xl">
              Sistem digital terpadu untuk pencatatan jurnal kegiatan pembelajaran kaligrafi Islam,
              kehadiran santri, evaluasi rubrik penulisan khot, rekapitulasi nilai otomatis, serta
              penerbitan rapor harian dan bulanan berstandar cetak A4.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#315B43] grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-[#A3D1B3] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Akses Administrator</span>
              </h2>
              <p className="mt-1 text-xs text-[#ECF3EE]/80 leading-relaxed">
                Kelola master santri, kelas, pengajar, rubrik penilaian Khot Naskhi &amp; Riq&apos;ah,
                serta pengesahan rapor akademik.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#A3D1B3] flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Akses Guru / Pengajar</span>
              </h2>
              <p className="mt-1 text-xs text-[#ECF3EE]/80 leading-relaxed">
                Input jurnal pertemuan, absensi satu klik, penilaian per kriteria, catatan
                perkembangan, dan cetak rapor kelas.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="lg:col-span-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
              Masuk ke Akun Akademik
            </h2>
            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-1">
              Gunakan kredensial Administrator atau Guru Pengajar Belajar Khot.
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-lg bg-[#B44238]/10 border border-[#B44238]/30 text-xs font-medium text-[#B44238] dark:text-[#F87171]"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-[#26332A] dark:text-[#ECF3EE] mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#6B776D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: admin atau syamsu"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[#26332A] dark:text-[#ECF3EE] focus:outline-none focus:border-[#19432D] dark:focus:border-[#A3D1B3]"
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[#26332A] dark:text-[#ECF3EE] focus:outline-none focus:border-[#19432D] dark:focus:border-[#A3D1B3]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#19432D] hover:bg-[#315B43] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Memverifikasi Akses...' : 'Masuk ke Sistem'}
              </button>
            </form>
          </div>

          {/* Demo Account Quick Access */}
          <div className="mt-6 pt-5 border-t border-[#E3EAE3] dark:border-[#24382C]">
            <p className="text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3] mb-2.5">
              Akses Cepat Demonstrasi Sistem:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] text-[#19432D] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] text-left transition-colors"
              >
                <span className="block font-bold">Masuk Administrator</span>
                <span className="text-[#6B776D] dark:text-[#A3D1B3]/80 font-mono">admin / admin123</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('syamsu', 'guru123')}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] text-[#19432D] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] text-left transition-colors"
              >
                <span className="block font-bold">Masuk Guru (Ust. Syamsu)</span>
                <span className="text-[#6B776D] dark:text-[#A3D1B3]/80 font-mono">syamsu / guru123</span>
              </button>
            </div>
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
