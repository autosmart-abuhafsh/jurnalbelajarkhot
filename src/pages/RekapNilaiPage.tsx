import React, { useState, useMemo } from 'react';
import {
  Printer,
  RotateCcw,
  Edit3,
  Download,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateMonthlyAverageScore,
  calculateSessionFinalScore,
  calculateStudentAttendanceSummary,
  formatDateShortId,
  getGradePredicate,
} from '../utils/academicRules';

export const RekapNilaiPage: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState<'harian' | 'bulanan'>('harian');

  // Comprehensive Filters (Section 12)
  const [filterSantriId, setFilterSantriId] = useState('ALL');
  const [filterKelasId, setFilterKelasId] = useState('ALL');
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [filterGuru, setFilterGuru] = useState('ALL');
  const [filterBulan, setFilterBulan] = useState('2026-11');
  const [filterTanggal, setFilterTanggal] = useState('');

  const uniqueGurus = Array.from(new Set(visibleKelas.map((k) => k.namaGuru)));

  const resetFilters = () => {
    setFilterSantriId('ALL');
    setFilterKelasId('ALL');
    setFilterProgram('ALL');
    setFilterGuru('ALL');
    setFilterBulan('2026-11');
    setFilterTanggal('');
  };

  // Filtered Journals
  const filteredJournals = useMemo(() => {
    return visibleJurnal
      .filter((j) => {
        if (filterKelasId !== 'ALL' && j.kelasId !== filterKelasId) return false;
        if (filterProgram !== 'ALL' && j.programKhot !== filterProgram) return false;
        if (filterGuru !== 'ALL' && j.namaGuru !== filterGuru) return false;
        if (filterTanggal && j.tanggal !== filterTanggal) return false;
        if (!filterTanggal && filterBulan !== 'ALL' && !j.tanggal.startsWith(filterBulan)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [visibleJurnal, filterKelasId, filterProgram, filterGuru, filterTanggal, filterBulan]);

  // Filtered Santri
  const filteredSantri = useMemo(() => {
    return visibleSantri.filter((s) => {
      if (filterSantriId !== 'ALL' && s.santriId !== filterSantriId) return false;
      if (filterKelasId !== 'ALL' && s.kelasId !== filterKelasId) return false;
      if (filterProgram !== 'ALL' && s.programKhot !== filterProgram) return false;
      if (filterGuru !== 'ALL' && s.namaGuru !== filterGuru) return false;
      return true;
    });
  }, [visibleSantri, filterSantriId, filterKelasId, filterProgram, filterGuru]);

  // A. Rekap Nilai Harian Rows
  const dailyRows = useMemo(() => {
    const rows: Array<{
      id: string;
      jurnalId: string;
      tanggal: string;
      santriId: string;
      memberId: string;
      namaSantri: string;
      namaKelas: string;
      materi: string;
      nilaiAkhir: number | null;
      predikat: string;
      catatan: string;
      statusHadir: string;
    }> = [];

    for (const j of filteredJournals) {
      const classStudents = filteredSantri.filter((s) => s.kelasId === j.kelasId);
      for (const s of classStudents) {
        const items = db.penilaian.filter(
          (p) => p.jurnalId === j.jurnalId && p.santriId === s.santriId
        );
        const finalScore = calculateSessionFinalScore(
          items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
        );
        const predikat = getGradePredicate(finalScore, db.pengaturan.batasPredikat);
        const att = db.absensi.find(
          (a) => a.jurnalId === j.jurnalId && a.santriId === s.santriId
        );
        rows.push({
          id: `${j.jurnalId}-${s.santriId}`,
          jurnalId: j.jurnalId,
          tanggal: j.tanggal,
          santriId: s.santriId,
          memberId: s.memberId,
          namaSantri: s.namaLengkap,
          namaKelas: j.namaKelas,
          materi: j.materiPembelajaran,
          nilaiAkhir: finalScore,
          predikat,
          catatan: items[0]?.catatanPenilaian || '-',
          statusHadir: att?.statusKehadiran || 'Belum Dicatat',
        });
      }
    }
    return rows;
  }, [filteredJournals, filteredSantri, db.penilaian, db.pengaturan.batasPredikat, db.absensi]);

  // B. Rekap Nilai Bulanan Rows
  const monthlyRows = useMemo(() => {
    return filteredSantri.map((s) => {
      const sJournals = filteredJournals.filter((j) => j.kelasId === s.kelasId);
      const sessionScores = sJournals.map((j) => {
        const items = db.penilaian.filter(
          (p) => p.jurnalId === j.jurnalId && p.santriId === s.santriId
        );
        return calculateSessionFinalScore(
          items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
        );
      });
      const rataRata = calculateMonthlyAverageScore(sessionScores);
      const predikat = getGradePredicate(rataRata, db.pengaturan.batasPredikat);
      const attSummary = calculateStudentAttendanceSummary(s, sJournals, db.absensi);

      return {
        santri: s,
        rataRata,
        predikat,
        attSummary,
        gradedCount: sessionScores.filter((v) => v !== null).length,
      };
    });
  }, [filteredSantri, filteredJournals, db.penilaian, db.pengaturan.batasPredikat, db.absensi]);

  const handleExportCsv = () => {
    if (activeTab === 'harian') {
      const headers = ['Tanggal', 'ID Member', 'Nama Santri', 'Kelas', 'Materi', 'Nilai', 'Predikat', 'Catatan'];
      const lines = dailyRows.map((r) => [
        r.tanggal,
        r.memberId,
        `"${r.namaSantri}"`,
        `"${r.namaKelas}"`,
        `"${r.materi}"`,
        r.nilaiAkhir ?? 'Belum Dinilai',
        r.predikat,
        `"${r.catatan}"`,
      ]);
      const csv = [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Nilai_Harian_${filterBulan}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID Member', 'Nama Santri', 'Kelas', 'Rata-rata Nilai', 'Predikat', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Persentase Kehadiran'];
      const lines = monthlyRows.map((r) => [
        r.santri.memberId,
        `"${r.santri.namaLengkap}"`,
        `"${r.santri.namaKelas}"`,
        r.rataRata ?? 'Belum Dinilai',
        r.predikat,
        r.attSummary.hadir,
        r.attSummary.izin,
        r.attSummary.sakit,
        r.attSummary.alpa,
        `${r.attSummary.persentaseKehadiran}%`,
      ]);
      const csv = [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Nilai_Bulanan_${filterBulan}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Rekapitulasi Nilai Akademik Santri
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Rekap nilai harian dan rata-rata nilai bulanan otomatis dari database jurnal, absensi, dan penilaian
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
            <button
              type="button"
              onClick={() => setActiveTab('harian')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'harian'
                  ? 'bg-[#19432D] text-white'
                  : 'text-[#26332A] dark:text-[#ECF3EE]'
              }`}
            >
              Rekap Nilai Harian
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bulanan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'bulanan'
                  ? 'bg-[#19432D] text-white'
                  : 'text-[#26332A] dark:text-[#ECF3EE]'
              }`}
            >
              Rekap Nilai Bulanan
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="no-print rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <select
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          aria-label="Filter Periode Bulan"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Periode Bulan</option>
          <option value="2026-11">November 2026</option>
          <option value="2026-10">Oktober 2026</option>
          <option value="2026-09">September 2026</option>
        </select>

        <select
          value={filterKelasId}
          onChange={(e) => setFilterKelasId(e.target.value)}
          aria-label="Filter Kelas"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Kelas</option>
          {visibleKelas.map((k) => (
            <option key={k.kelasId} value={k.kelasId}>
              {k.namaKelas}
            </option>
          ))}
        </select>

        <select
          value={filterProgram}
          onChange={(e) => setFilterProgram(e.target.value)}
          aria-label="Filter Program Khot"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Program Khot</option>
          {db.pengaturan.programs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filterSantriId}
          onChange={(e) => setFilterSantriId(e.target.value)}
          aria-label="Filter Individu Santri"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Santri</option>
          {visibleSantri.map((s) => (
            <option key={s.santriId} value={s.santriId}>
              {s.memberId} — {s.namaLengkap}
            </option>
          ))}
        </select>

        <select
          value={filterGuru}
          onChange={(e) => setFilterGuru(e.target.value)}
          aria-label="Filter Guru"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Guru</option>
          {uniqueGurus.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterTanggal}
            onChange={(e) => setFilterTanggal(e.target.value)}
            aria-label="Filter Tanggal Spesifik"
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
          <button
            type="button"
            onClick={resetFilters}
            title="Reset Filter"
            aria-label="Reset Filter Rekap"
            className="p-2 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#6B776D]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A. REKAP NILAI HARIAN */}
      {activeTab === 'harian' && (
        <div className="print-container rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Rekap Nilai Harian Pertemuan</h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                Nilai Akhir = Total (Nilai Kriteria × Bobot) / Total Bobot Kriteria yang Dinilai
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                  <th className="py-3 pr-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Santri</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Materi Pembelajaran</th>
                  <th className="py-3 px-3 text-right">Nilai</th>
                  <th className="py-3 px-3 text-center">Predikat</th>
                  <th className="py-3 px-3">Catatan</th>
                  <th className="no-print py-3 pl-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                {dailyRows.length > 0 ? (
                  dailyRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                      <td className="py-3 pr-3 font-mono text-xs tabular-nums whitespace-nowrap">
                        {formatDateShortId(row.tanggal)}
                      </td>
                      <td className="py-3 px-3 font-semibold whitespace-nowrap">
                        {row.namaSantri}
                        <span className="block font-mono text-[11px] font-normal text-[#6B776D] dark:text-[#A3D1B3]">
                          {row.memberId} · {row.statusHadir}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">{row.namaKelas}</td>
                      <td className="py-3 px-3 text-xs max-w-xs truncate">{row.materi}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-[#19432D] dark:text-[#A3D1B3]">
                        {row.nilaiAkhir !== null
                          ? row.nilaiAkhir.toString().replace('.', ',')
                          : 'Belum Dinilai'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-xs">
                        {row.predikat}
                      </td>
                      <td className="py-3 px-3 text-xs text-[#6B776D] dark:text-[#A3D1B3]/85 max-w-xs truncate">
                        {row.catatan}
                      </td>
                      <td className="no-print py-3 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`${rolePrefix}/jurnal/${row.jurnalId}`)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] hover:bg-[#E3EAE3] inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-[#6B776D]">
                      Tidak ada data penilaian harian pada filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B. REKAP NILAI BULANAN */}
      {activeTab === 'bulanan' && (
        <div className="print-container rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Rekap Nilai &amp; Kehadiran Bulanan</h2>
            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
              Rata-rata Nilai Bulanan = Total Nilai Akhir Pertemuan yang Sudah Dinilai / Jumlah Pertemuan yang Sudah Dinilai
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                  <th className="py-3 pr-3">No</th>
                  <th className="py-3 px-3">Nama Santri</th>
                  <th className="py-3 px-3">Kelas &amp; Program</th>
                  <th className="py-3 px-3 text-right">Rata-rata Nilai</th>
                  <th className="py-3 px-3 text-center">Predikat</th>
                  <th className="py-3 px-3 text-right">Hadir</th>
                  <th className="py-3 px-3 text-right">Izin</th>
                  <th className="py-3 px-3 text-right">Sakit</th>
                  <th className="py-3 px-3 text-right">Alpa</th>
                  <th className="py-3 px-3 text-right">% Hadir</th>
                  <th className="no-print py-3 pl-3 text-right">Rapor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                {monthlyRows.map(({ santri, rataRata, predikat, attSummary }, idx) => (
                  <tr key={santri.santriId} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                    <td className="py-3 pr-3 font-mono text-xs tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold">
                      {santri.namaLengkap}
                      <span className="block font-mono text-[11px] font-normal text-[#6B776D] dark:text-[#A3D1B3]">
                        {santri.memberId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {santri.namaKelas} · {santri.programKhot}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-[#19432D] dark:text-[#A3D1B3]">
                      {rataRata !== null ? rataRata.toString().replace('.', ',') : 'Belum Dinilai'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-xs">{predikat}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#3B7551] dark:text-[#A3D1B3]">
                      {attSummary.hadir}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {attSummary.izin}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {attSummary.sakit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#B44238]">
                      {attSummary.alpa}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums">
                      {attSummary.persentaseKehadiran}%
                    </td>
                    <td className="no-print py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(isAdmin ? '/admin/rapor-bulanan' : '/guru/rapor')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#19432D] text-white inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Rapor</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
