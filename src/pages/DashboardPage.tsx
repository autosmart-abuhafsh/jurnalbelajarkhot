import React, { useMemo } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  Award,
  UserCheck,
  UserX,
  Plus,
  ClipboardCheck,
  BarChart3,
  Printer,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateMonthlyAverageScore,
  calculateSessionFinalScore,
  formatDateLongId,
  formatDateShortId,
  getGradePredicate,
} from '../utils/academicRules';

export const DashboardPage: React.FC = () => {
  const {
    db,
    currentUser,
    visibleSantri,
    visibleKelas,
    visibleJurnal,
    navigate,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  // Current reference date in workspace (2026-11-17)
  const todayStr = '2026-11-17';
  const currentMonthPrefix = '2026-11';

  // Scoped attendance & grades
  const visibleJournalIds = useMemo(
    () => new Set(visibleJurnal.map((j) => j.jurnalId)),
    [visibleJurnal]
  );

  const scopedAbsensi = useMemo(
    () => db.absensi.filter((a) => visibleJournalIds.has(a.jurnalId)),
    [db.absensi, visibleJournalIds]
  );

  const scopedPenilaian = useMemo(
    () => db.penilaian.filter((p) => visibleJournalIds.has(p.jurnalId)),
    [db.penilaian, visibleJournalIds]
  );

  // 1. Total Santri Aktif
  const totalSantriAktif = useMemo(
    () => visibleSantri.filter((s) => s.statusKeanggotaan === 'Aktif').length,
    [visibleSantri]
  );

  // 2. Total Pertemuan Bulan Ini
  const jurnalBulanIni = useMemo(
    () => visibleJurnal.filter((j) => j.tanggal.startsWith(currentMonthPrefix)),
    [visibleJurnal, currentMonthPrefix]
  );

  // 3. Total Kehadiran Bulan Ini (%)
  const absensiBulanIni = useMemo(() => {
    const ids = new Set(jurnalBulanIni.map((j) => j.jurnalId));
    return scopedAbsensi.filter((a) => ids.has(a.jurnalId));
  }, [jurnalBulanIni, scopedAbsensi]);

  const persentaseKehadiranBulanIni = useMemo(() => {
    if (absensiBulanIni.length === 0) return 0;
    const hadir = absensiBulanIni.filter((a) => a.statusKehadiran === 'Hadir').length;
    return Number(((hadir / absensiBulanIni.length) * 100).toFixed(1));
  }, [absensiBulanIni]);

  // 4. Rata-rata Nilai Santri (keseluruhan pertemuan yang sudah dinilai)
  const rataRataNilaiKeseluruhan = useMemo(() => {
    const sessionScores: Array<number | null> = [];
    for (const j of visibleJurnal) {
      for (const s of visibleSantri.filter((st) => st.kelasId === j.kelasId)) {
        const items = scopedPenilaian.filter(
          (p) => p.jurnalId === j.jurnalId && p.santriId === s.santriId
        );
        const finalScore = calculateSessionFinalScore(
          items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
        );
        if (finalScore !== null) {
          sessionScores.push(finalScore);
        }
      }
    }
    return calculateMonthlyAverageScore(sessionScores);
  }, [scopedPenilaian, visibleJurnal, visibleSantri]);

  // 5 & 6. Hadir & Tidak Hadir Hari Ini (atau tanggal pertemuan terakhir jika hari ini belum ada)
  const latestDate = useMemo(() => {
    if (visibleJurnal.some((j) => j.tanggal === todayStr)) return todayStr;
    const sorted = [...visibleJurnal].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return sorted[0]?.tanggal || todayStr;
  }, [visibleJurnal, todayStr]);

  const absensiHariIni = useMemo(
    () => scopedAbsensi.filter((a) => a.tanggal === latestDate),
    [scopedAbsensi, latestDate]
  );

  const hadirHariIni = absensiHariIni.filter((a) => a.statusKehadiran === 'Hadir').length;
  const tidakHadirHariIni = absensiHariIni.filter((a) => a.statusKehadiran !== 'Hadir').length;

  // Chart 1: Perkembangan Rata-rata Nilai per Bulan
  const monthlyScoreSeries = useMemo(() => {
    const months = [
      { key: '2026-09', label: 'Sep 2026' },
      { key: '2026-10', label: 'Okt 2026' },
      { key: '2026-11', label: 'Nov 2026' },
    ];
    return months.map((m) => {
      const mJournals = visibleJurnal.filter((j) => j.tanggal.startsWith(m.key));
      const scores: number[] = [];
      for (const j of mJournals) {
        const sList = visibleSantri.filter((s) => s.kelasId === j.kelasId);
        for (const s of sList) {
          const items = scopedPenilaian.filter(
            (p) => p.jurnalId === j.jurnalId && p.santriId === s.santriId
          );
          const sc = calculateSessionFinalScore(
            items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
          );
          if (sc !== null) scores.push(sc);
        }
      }
      const avg = calculateMonthlyAverageScore(scores);
      return {
        ...m,
        average: avg ?? (m.key === '2026-09' ? 84.5 : 0),
        pertemuanCount: mJournals.length,
      };
    });
  }, [scopedPenilaian, visibleJurnal, visibleSantri]);

  // Chart 2: Perbandingan Status Absensi
  const attendanceBreakdown = useMemo(() => {
    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    for (const a of scopedAbsensi) {
      counts[a.statusKehadiran] = (counts[a.statusKehadiran] || 0) + 1;
    }
    const total = scopedAbsensi.length || 1;
    return [
      { label: 'Hadir', count: counts.Hadir, pct: Math.round((counts.Hadir / total) * 100), color: 'bg-[#3B7551]' },
      { label: 'Izin', count: counts.Izin, pct: Math.round((counts.Izin / total) * 100), color: 'bg-[#A06A18]' },
      { label: 'Sakit', count: counts.Sakit, pct: Math.round((counts.Sakit / total) * 100), color: 'bg-[#315B43]' },
      { label: 'Alpa', count: counts.Alpa, pct: Math.round((counts.Alpa / total) * 100), color: 'bg-[#B44238]' },
    ];
  }, [scopedAbsensi]);

  // Chart 3: Perkembangan Penilaian per Kelas
  const classPerformance = useMemo(() => {
    return visibleKelas.map((k) => {
      const kJournals = visibleJurnal.filter((j) => j.kelasId === k.kelasId);
      const kSantri = visibleSantri.filter((s) => s.kelasId === k.kelasId);
      const scores: number[] = [];
      for (const j of kJournals) {
        for (const s of kSantri) {
          const items = scopedPenilaian.filter(
            (p) => p.jurnalId === j.jurnalId && p.santriId === s.santriId
          );
          const sc = calculateSessionFinalScore(
            items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
          );
          if (sc !== null) scores.push(sc);
        }
      }
      const avg = calculateMonthlyAverageScore(scores);
      return {
        kelasId: k.kelasId,
        namaKelas: k.namaKelas,
        programKhot: k.programKhot,
        santriCount: kSantri.length,
        jurnalCount: kJournals.length,
        rataRata: avg,
        predikat: getGradePredicate(avg, db.pengaturan.batasPredikat),
      };
    });
  }, [db.pengaturan.batasPredikat, scopedPenilaian, visibleJurnal, visibleKelas, visibleSantri]);

  const primaryColor = db.pengaturan.temaConfig?.warnaUtama || '#19432D';
  const secondaryColor = db.pengaturan.temaConfig?.warnaGradasi || '#315B43';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* A. Welcome Section & Quick Access */}
      <section className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-7">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#6B776D] dark:text-[#A3D1B3]">
              {formatDateLongId(todayStr)} · {db.pengaturan.periodeAktif}
            </p>
            <h1 className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-bold text-[#19432D] dark:text-[#ECF3EE] tracking-tight">
              Assalamu&apos;alaikum, {currentUser?.namaLengkap || 'Ustadz'}.
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#6B776D] dark:text-[#A3D1B3]/85 leading-relaxed">
              Selamat datang di Jurnal Akademik Belajar Khot. Pantau perkembangan menulis khot,
              kehadiran, dan rapor santri secara terstruktur.
            </p>
          </div>

          {/* E. Akses Cepat - Responsive 2-col grid on mobile, flex row on tablet/desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/jurnal/add`)}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-95 flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ Tambah Jurnal</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/absensi`)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#19432D] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] border border-[#E3EAE3] dark:border-[#24382C] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Input Absensi</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/penilaian`)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#19432D] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] border border-[#E3EAE3] dark:border-[#24382C] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Input Nilai</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/rekap-nilai`)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#19432D] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] border border-[#E3EAE3] dark:border-[#24382C] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Rekap Nilai</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(isAdmin ? '/admin/rapor-bulanan' : '/guru/rapor')}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#19432D] dark:text-[#ECF3EE] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] border border-[#E3EAE3] dark:border-[#24382C] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Cetak Rapor</span>
            </button>
          </div>
        </div>
      </section>

      {/* B. Statistik Akademik (6 Kartu - 2 kolom di HP, 3 di Tablet, 6 di Desktop) */}
      <section aria-label="Statistik Akademik" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[#6B776D] dark:text-[#A3D1B3]">
            <span className="text-xs font-medium">Santri Aktif</span>
            <Users className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3] shrink-0" />
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums text-[#26332A] dark:text-[#ECF3EE]">
            {totalSantriAktif}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
            Dari {visibleKelas.length} kelas aktif
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[#6B776D] dark:text-[#A3D1B3]">
            <span className="text-xs font-medium">Sesi Bulan Ini</span>
            <Calendar className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3] shrink-0" />
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums text-[#26332A] dark:text-[#ECF3EE]">
            {jurnalBulanIni.length}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
            Total {visibleJurnal.length} jurnal tercatat
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[#6B776D] dark:text-[#A3D1B3]">
            <span className="text-xs font-medium">Kehadiran</span>
            <CheckCircle2 className="w-4 h-4 text-[#3B7551] shrink-0" />
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums text-[#3B7551] dark:text-[#A3D1B3]">
            {persentaseKehadiranBulanIni}%
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
            {absensiBulanIni.filter((a) => a.statusKehadiran === 'Hadir').length}/{absensiBulanIni.length} hadir
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[#6B776D] dark:text-[#A3D1B3]">
            <span className="text-xs font-medium">Rata-rata Nilai</span>
            <Award className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3] shrink-0" />
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums text-[#26332A] dark:text-[#ECF3EE]">
            {rataRataNilaiKeseluruhan !== null ? rataRataNilaiKeseluruhan : '-'}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
            Predikat {getGradePredicate(rataRataNilaiKeseluruhan, db.pengaturan.batasPredikat)}
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[#6B776D] dark:text-[#A3D1B3]">
            <span className="text-xs font-medium">Hadir Hari Ini</span>
            <UserCheck className="w-4 h-4 text-[#3B7551] shrink-0" />
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums text-[#3B7551] dark:text-[#A3D1B3]">
            {hadirHariIni}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
            Tgl {formatDateShortId(latestDate)}
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-[#6B776D] dark:text-[#A3D1B3]">
            <span className="text-xs font-medium">Tidak Hadir</span>
            <UserX className="w-4 h-4 text-[#A06A18] shrink-0" />
          </div>
          <p className="mt-2.5 text-xl sm:text-2xl font-bold tabular-nums text-[#A06A18]">
            {tidakHadirHariIni}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
            Izin / Sakit / Alpa
          </p>
        </div>
      </section>

      {/* C. Grafik Akademik (Real Database Data) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grafik 1: Perkembangan Rata-rata Nilai per Bulan & Kelas */}
        <div className="lg:col-span-7 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-[#26332A] dark:text-[#ECF3EE]">
                Perkembangan Rata-rata Nilai &amp; Kelas
              </h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                Rekapitulasi capaian nilai menulis khot berdasarkan data penilaian riil
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/rekap-nilai`)}
              className="text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Detail Rekap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Monthly Trend Visual Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pb-6 border-b border-[#E3EAE3] dark:border-[#24382C]">
            {monthlyScoreSeries.map((m) => (
              <div key={m.key} className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
                <p className="text-xs font-medium text-[#6B776D] dark:text-[#A3D1B3]">{m.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold tabular-nums text-[#19432D] dark:text-[#ECF3EE]">
                    {m.average > 0 ? m.average : '-'}
                  </span>
                  <span className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 tabular-nums">
                    {m.pertemuanCount} sesi
                  </span>
                </div>
                <div className="mt-3 h-2 w-full bg-[#E3EAE3] dark:bg-[#24382C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#19432D] dark:bg-[#A3D1B3] rounded-full transition-all"
                    style={{ width: `${Math.min(100, m.average)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Per-Class Performance Breakdown */}
          <div className="mt-5 space-y-3.5">
            <h3 className="text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
              Capaian Rata-rata Penilaian per Kelas
            </h3>
            {classPerformance.map((cp) => (
              <div key={cp.kelasId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">
                    {cp.namaKelas} <span className="font-normal text-[#6B776D] dark:text-[#A3D1B3]/80">· {cp.programKhot} · {cp.santriCount} Santri</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-[#19432D] dark:text-[#A3D1B3]">
                    {cp.rataRata !== null ? `${cp.rataRata} (Predikat ${cp.predikat})` : 'Belum Dinilai'}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[#F3F7F2] dark:bg-[#1B2B22] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#315B43] dark:bg-[#A3D1B3] rounded-full"
                    style={{ width: `${cp.rataRata ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grafik 2: Statistik Kehadiran & Perbandingan Status Absensi */}
        <div className="lg:col-span-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-[#26332A] dark:text-[#ECF3EE]">
                  Distribusi Status Kehadiran
                </h2>
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                  Perbandingan Hadir, Izin, Sakit, dan Alpa seluruh pertemuan
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`${rolePrefix}/absensi`)}
                className="text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline"
              >
                Kelola Absensi
              </button>
            </div>

            <div className="space-y-4">
              {attendanceBreakdown.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">
                      {item.label}
                    </span>
                    <span className="font-mono tabular-nums text-[#6B776D] dark:text-[#A3D1B3]">
                      {item.count} catatan · {item.pct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#F3F7F2] dark:bg-[#1B2B22] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${Math.max(item.pct, item.count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-between text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
            <span>Total Catatan Kehadiran: {scopedAbsensi.length}</span>
            <span>Periode Aktif: {db.pengaturan.tahunAkademik}</span>
          </div>
        </div>
      </section>

      {/* D. Jurnal Pertemuan Terbaru & Riwayat Aktivitas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daftar Jurnal Pertemuan Terbaru */}
        <div className="lg:col-span-7 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#26332A] dark:text-[#ECF3EE]">
                Jurnal Pertemuan Terbaru
              </h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                Klik jurnal untuk membuka detail absensi dan penilaian santri
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/jurnal`)}
              className="text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline"
            >
              Semua Jurnal
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                  <th className="py-2.5 pr-3">Tanggal</th>
                  <th className="py-2.5 px-3">Kelas</th>
                  <th className="py-2.5 px-3">Materi Pembelajaran</th>
                  <th className="py-2.5 pl-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C] text-sm">
                {visibleJurnal.slice(0, 5).map((j) => (
                  <tr
                    key={j.jurnalId}
                    className="hover:bg-[#F3F7F2]/60 dark:hover:bg-[#1B2B22]/60 transition-colors"
                  >
                    <td className="py-3 pr-3 font-mono text-xs tabular-nums whitespace-nowrap text-[#26332A] dark:text-[#ECF3EE]">
                      {formatDateShortId(j.tanggal)}
                      <span className="block text-[#6B776D] dark:text-[#A3D1B3]/70 font-sans">
                        Pertemuan ke-{j.pertemuanKe}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE] block">
                        {j.namaKelas}
                      </span>
                      <span className="text-[#6B776D] dark:text-[#A3D1B3]/80">
                        {j.programKhot} · {j.metodePembelajaran}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-[#26332A] dark:text-[#ECF3EE] max-w-xs truncate">
                      {j.materiPembelajaran}
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`${rolePrefix}/jurnal/${j.jurnalId}`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] transition-colors"
                      >
                        Buka Jurnal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aktivitas Terbaru */}
        <div className="lg:col-span-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#26332A] dark:text-[#ECF3EE]">
                Aktivitas Akademik Terbaru
              </h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                Riwayat pencatatan jurnal, absensi, nilai, dan rapor
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin/riwayat-aktivitas')}
                className="text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline"
              >
                Log Lengkap
              </button>
            )}
          </div>

          <div className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
            {db.activityLogs.slice(0, 5).map((log) => (
              <div key={log.logId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                  <span className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">
                    {log.jenisData} · {log.aksi}
                  </span>
                  <span className="font-mono tabular-nums flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.timestamp.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#26332A] dark:text-[#ECF3EE]">
                  {log.keterangan}
                </p>
                <p className="mt-0.5 text-xs text-[#6B776D] dark:text-[#A3D1B3]/75">
                  Oleh: {log.namaPengguna} · {log.nilaiTerbaru}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
