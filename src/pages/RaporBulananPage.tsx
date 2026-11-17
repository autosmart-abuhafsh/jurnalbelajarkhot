import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Save,
  Users,
  Edit3,
  Archive,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from '../components/LogoBelajarKhot';
import {
  calculateAspectAveragesForPeriod,
  calculateMonthlyAverageScore,
  calculateSessionFinalScore,
  calculateStudentAttendanceSummary,
  formatDateLongId,
  formatDateShortId,
  getGradePredicate,
  getPredicateLabel,
} from '../utils/academicRules';
import { EvaluasiBulanan, RiwayatRapor } from '../types';

export const RaporBulananPage: React.FC = () => {
  const {
    db,
    currentUser,
    visibleKelas,
    visibleSantri,
    visibleJurnal,
    saveRapor,
    deleteRapor,
    navigate,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [selectedBulan, setSelectedBulan] = useState('11');
  const [selectedTahun, setSelectedTahun] = useState('2026');
  const [selectedKelasId, setSelectedKelasId] = useState(
    visibleKelas[0]?.kelasId || 'KLS-NASKHI-A'
  );
  const [selectedSantriId, setSelectedSantriId] = useState('');
  const [batchPrintClass, setBatchPrintClass] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const monthNames: Record<string, string> = {
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
  };

  const ymPrefix = `${selectedTahun}-${selectedBulan}`;
  const periodeLabel = `${monthNames[selectedBulan] || 'November'} ${selectedTahun}`;

  const classSantri = useMemo(
    () => visibleSantri.filter((s) => s.kelasId === selectedKelasId),
    [visibleSantri, selectedKelasId]
  );

  useEffect(() => {
    if (classSantri.length > 0 && !classSantri.some((s) => s.santriId === selectedSantriId)) {
      setSelectedSantriId(classSantri[0].santriId);
    }
  }, [classSantri, selectedSantriId]);

  const currentSantri = useMemo(
    () => classSantri.find((s) => s.santriId === selectedSantriId),
    [classSantri, selectedSantriId]
  );

  // Editable 4-part Teacher Evaluation
  const [evaluasi, setEvaluasi] = useState<EvaluasiBulanan>({
    perkembanganDicapai: '',
    halPerluDitingkatkan: '',
    rekomendasiLatihan: '',
    kesimpulanGuru: '',
  });
  const [tanggalTerbit, setTanggalTerbit] = useState('2026-11-17');

  useEffect(() => {
    if (!currentSantri) return;
    const archived = db.riwayatRapor.find(
      (r) =>
        r.jenisRapor === 'BULANAN' &&
        r.santriId === currentSantri.santriId &&
        r.periodeAwal.startsWith(ymPrefix)
    );
    if (archived && archived.evaluasiBulanan) {
      setEvaluasi(archived.evaluasiBulanan);
      setTanggalTerbit(archived.tanggalPenerbitan);
    } else {
      setEvaluasi({
        perkembanganDicapai: `Ananda ${currentSantri.namaLengkap} menunjukkan peningkatan yang baik dalam penguasaan kaidah ${currentSantri.programKhot}, terutama pada ketepatan anatomi huruf mufradat dan sambungan dasar.`,
        halPerluDitingkatkan:
          'Perlu memperhalus transisi kemiringan pena qalam pada huruf lengkung (kasah) serta menjaga konsistensi jarak antar kata dalam satu baris.',
        rekomendasiLatihan:
          'Melakukan latihan mandiri (taqlid kurrasah) minimal 30 menit setiap hari dan memperhatikan mizan titik sebelum menarik goresan.',
        kesimpulanGuru: `Secara keseluruhan, perkembangan akademik ananda ${currentSantri.namaLengkap} pada periode ${periodeLabel} berjalan sangat baik dan memenuhi target pembelajaran.`,
      });
    }
  }, [currentSantri, db.riwayatRapor, ymPrefix, periodeLabel]);

  const periodJournals = useMemo(
    () =>
      visibleJurnal
        .filter((j) => j.kelasId === selectedKelasId && j.tanggal.startsWith(ymPrefix))
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
    [visibleJurnal, selectedKelasId, ymPrefix]
  );

  const handleSaveMonthlyRapor = async () => {
    if (!currentSantri) return;
    const journalIds = new Set(periodJournals.map((j) => j.jurnalId));
    const sessionScores = periodJournals.map((j) => {
      const items = db.penilaian.filter(
        (p) => p.jurnalId === j.jurnalId && p.santriId === currentSantri.santriId
      );
      return calculateSessionFinalScore(
        items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
      );
    });
    const avgScore = calculateMonthlyAverageScore(sessionScores);
    const predikat = getGradePredicate(avgScore, db.pengaturan.batasPredikat);
    const attSummary = calculateStudentAttendanceSummary(
      currentSantri,
      periodJournals,
      db.absensi
    );

    const existing = db.riwayatRapor.find(
      (r) =>
        r.jenisRapor === 'BULANAN' &&
        r.santriId === currentSantri.santriId &&
        r.periodeAwal.startsWith(ymPrefix)
    );

    const record: RiwayatRapor = {
      raporId: existing ? existing.raporId : `RPR-BUL-${ymPrefix}-${currentSantri.santriId}`,
      nomorRapor: existing
        ? existing.nomorRapor
        : `RPR/BUL/${selectedTahun}/${selectedBulan}/${currentSantri.memberId}`,
      santriId: currentSantri.santriId,
      memberId: currentSantri.memberId,
      namaSantri: currentSantri.namaLengkap,
      kelasId: currentSantri.kelasId,
      namaKelas: currentSantri.namaKelas,
      programKhot: currentSantri.programKhot,
      jenisRapor: 'BULANAN',
      periodeAwal: `${ymPrefix}-01`,
      periodeAkhir: `${ymPrefix}-30`,
      periodeLabel,
      nilaiAkhir: avgScore,
      predikat,
      persentaseKehadiran: attSummary.persentaseKehadiran,
      evaluasiBulanan: evaluasi,
      tanggalPenerbitan: tanggalTerbit,
      tempatPenerbitan: db.pengaturan.kotaPenerbitan,
      diterbitkanOleh: currentSantri.namaGuru,
      versiRapor: existing ? existing.versiRapor + 1 : 1,
      statusRapor: 'Diterbitkan',
      isDemo: false,
    };

    // suppress unused variable warning
    void journalIds;
    await saveRapor(record, !existing);
  };

  const renderMonthlyReportDocument = (santriIdToRender: string, isBatch = false) => {
    const santriObj = classSantri.find((s) => s.santriId === santriIdToRender);
    if (!santriObj) return null;

    const journalIds = new Set(periodJournals.map((j) => j.jurnalId));
    const attSummary = calculateStudentAttendanceSummary(
      santriObj,
      periodJournals,
      db.absensi
    );

    const aspectAverages = calculateAspectAveragesForPeriod(
      db.penilaian,
      santriObj.santriId,
      journalIds,
      db.pengaturan.batasPredikat
    );

    const sessionProgression = periodJournals.map((j) => {
      const items = db.penilaian.filter(
        (p) => p.jurnalId === j.jurnalId && p.santriId === santriObj.santriId
      );
      const sc = calculateSessionFinalScore(
        items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
      );
      return {
        jurnalId: j.jurnalId,
        pertemuanKe: j.pertemuanKe,
        tanggal: j.tanggal,
        materi: j.materiPembelajaran,
        score: sc,
      };
    });

    const monthlyAvg = calculateMonthlyAverageScore(
      sessionProgression.map((sp) => sp.score)
    );
    const monthlyPredikat = getGradePredicate(monthlyAvg, db.pengaturan.batasPredikat);

    const evalToUse: EvaluasiBulanan =
      santriObj.santriId === selectedSantriId
        ? evaluasi
        : {
            perkembanganDicapai: `Ananda ${santriObj.namaLengkap} menunjukkan perkembangan baik dalam penulisan ${santriObj.programKhot}.`,
            halPerluDitingkatkan: 'Perlu menjaga konsistensi proporsi huruf dan kemiringan pena qalam.',
            rekomendasiLatihan: 'Latihan rutin kurrasah setiap hari minimal 30 menit.',
            kesimpulanGuru: `Perkembangan akademik selama periode ${periodeLabel} tergolong baik.`,
          };

    return (
      <div
        key={santriObj.santriId}
        className={`print-container bg-white text-[#111827] border border-[#E3EAE3] rounded-2xl p-8 sm:p-10 max-w-[210mm] mx-auto shadow-sm ${
          isBatch ? 'page-break-after mb-8' : ''
        }`}
      >
        {/* A. Identitas Kepala Rapor */}
        <div className="flex items-center justify-between pb-5 border-b-2 border-[#19432D]">
          <LogoBelajarKhot
            size="lg"
            variant="print"
            subtitle={db.pengaturan.subJudulLembaga}
          />
          <div className="text-right">
            <h2 className="text-lg font-extrabold tracking-tight text-[#19432D]">
              RAPOR PERKEMBANGAN BELAJAR KHOT
            </h2>
            <p className="text-xs font-semibold text-[#315B43] mt-0.5">
              Periode Laporan: {periodeLabel}
            </p>
            <p className="text-[11px] text-[#6B776D]">
              {db.pengaturan.periodeAktif}
            </p>
          </div>
        </div>

        {/* Biodata Santri */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 my-5 p-4 rounded-xl bg-[#FAFCF9] border border-[#E3EAE3] text-xs">
          <div className="flex justify-between">
            <span className="text-[#6B776D]">Nama Lengkap Santri:</span>
            <span className="font-bold text-[#26332A]">{santriObj.namaLengkap}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B776D]">Program Khot:</span>
            <span className="font-semibold text-[#26332A]">{santriObj.programKhot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B776D]">ID Member:</span>
            <span className="font-mono font-semibold text-[#26332A]">{santriObj.memberId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B776D]">Metode Pembelajaran:</span>
            <span className="font-semibold text-[#26332A]">{santriObj.metodePembelajaran}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B776D]">Kelas / Kelompok:</span>
            <span className="font-semibold text-[#26332A]">{santriObj.namaKelas}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B776D]">Nama Guru / Pengajar:</span>
            <span className="font-semibold text-[#26332A]">{santriObj.namaGuru}</span>
          </div>
        </div>

        {/* D. Nilai Akhir Bulanan Highlight Strip */}
        <div className="grid grid-cols-3 gap-4 my-5">
          <div className="p-4 rounded-xl bg-[#19432D] text-white">
            <p className="text-[11px] text-[#A3D1B3] font-medium">Nilai Rata-rata Bulanan</p>
            <p className="text-2xl font-extrabold font-mono mt-1 tabular-nums">
              {monthlyAvg !== null ? monthlyAvg.toString().replace('.', ',') : '-'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
            <p className="text-[11px] text-[#6B776D] font-medium">Predikat Akademik</p>
            <p className="text-lg font-extrabold text-[#19432D] mt-1">
              {monthlyPredikat} — {getPredicateLabel(monthlyPredikat)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
            <p className="text-[11px] text-[#6B776D] font-medium">Persentase Kehadiran</p>
            <p className="text-2xl font-extrabold font-mono text-[#3B7551] mt-1 tabular-nums">
              {attSummary.persentaseKehadiran}%
            </p>
          </div>
        </div>

        {/* B & C: Grid Rekap Kehadiran & Rekap Penilaian per Aspek */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 my-5">
          {/* C. Rekap Penilaian (7 cols) */}
          <div className="md:col-span-7">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#19432D] mb-2">
              I. Rekapitulasi Capaian Aspek Penilaian
            </h3>
            <table className="w-full text-left border-collapse border border-[#E3EAE3] text-xs">
              <thead>
                <tr className="bg-[#19432D] text-white">
                  <th className="py-2 px-2.5 border border-[#19432D] text-center w-8">No</th>
                  <th className="py-2 px-2.5 border border-[#19432D]">Aspek Penilaian</th>
                  <th className="py-2 px-2.5 border border-[#19432D] text-right w-24">Nilai Rata-rata</th>
                  <th className="py-2 px-2.5 border border-[#19432D] text-center w-16">Predikat</th>
                </tr>
              </thead>
              <tbody>
                {aspectAverages.length > 0 ? (
                  aspectAverages.map((asp, idx) => (
                    <tr key={asp.aspekId} className="border-b border-[#E3EAE3]">
                      <td className="py-2 px-2.5 text-center font-mono">{idx + 1}</td>
                      <td className="py-2 px-2.5 font-medium text-[#26332A]">{asp.namaAspek}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-[#19432D]">
                        {asp.rataRata !== null ? asp.rataRata.toString().replace('.', ',') : '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold text-[#19432D]">
                        {asp.predikat}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[#6B776D]">
                      Belum ada data penilaian pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* B. Rekap Kehadiran (5 cols) */}
          <div className="md:col-span-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#19432D] mb-2">
              II. Rekapitulasi Kehadiran
            </h3>
            <table className="w-full text-left border-collapse border border-[#E3EAE3] text-xs">
              <thead>
                <tr className="bg-[#19432D] text-white">
                  <th className="py-2 px-3 border border-[#19432D]">Keterangan</th>
                  <th className="py-2 px-3 border border-[#19432D] text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE3]">
                <tr>
                  <td className="py-2 px-3 font-medium">Total Pertemuan</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">
                    {attSummary.totalKewajibanPertemuan}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-[#3B7551]">Hadir</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-[#3B7551]">
                    {attSummary.hadir}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Izin</td>
                  <td className="py-2 px-3 text-right font-mono">{attSummary.izin}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Sakit</td>
                  <td className="py-2 px-3 text-right font-mono">{attSummary.sakit}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-[#B44238]">Alpa / Tanpa Keterangan</td>
                  <td className="py-2 px-3 text-right font-mono text-[#B44238]">{attSummary.alpa}</td>
                </tr>
                <tr className="bg-[#F3F7F2] font-bold">
                  <td className="py-2 px-3 text-[#19432D]">Persentase Kehadiran</td>
                  <td className="py-2 px-3 text-right font-mono text-[#19432D]">
                    {attSummary.persentaseKehadiran}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Mini Visualisasi Perkembangan Nilai Pertemuan */}
        {sessionProgression.length > 0 && (
          <div className="my-5 p-4 rounded-xl bg-[#FAFCF9] border border-[#E3EAE3]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#19432D] mb-2.5">
              III. Grafik Perkembangan Nilai per Pertemuan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sessionProgression.map((sp) => (
                <div key={sp.jurnalId} className="p-2.5 rounded-lg bg-white border border-[#E3EAE3] text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Pertemuan Ke-{sp.pertemuanKe}</span>
                    <span className="font-mono font-bold text-[#19432D]">
                      {sp.score !== null ? sp.score : '-'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B776D] mt-0.5 truncate">
                    {formatDateShortId(sp.tanggal)} · {sp.materi}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full bg-[#E3EAE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#19432D]"
                      style={{ width: `${sp.score ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* E. Evaluasi Guru (4 Bagian) */}
        <div className="my-5 space-y-2.5 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#19432D]">
            IV. Evaluasi &amp; Catatan Perkembangan Guru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-[#E3EAE3]">
              <p className="font-bold text-[#19432D]">1. Perkembangan yang Dicapai:</p>
              <p className="mt-1 text-[#26332A] leading-relaxed">
                {evalToUse.perkembanganDicapai}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#E3EAE3]">
              <p className="font-bold text-[#19432D]">2. Hal yang Perlu Ditingkatkan:</p>
              <p className="mt-1 text-[#26332A] leading-relaxed">
                {evalToUse.halPerluDitingkatkan}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#E3EAE3]">
              <p className="font-bold text-[#19432D]">3. Rekomendasi Latihan:</p>
              <p className="mt-1 text-[#26332A] leading-relaxed">
                {evalToUse.rekomendasiLatihan}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[#E3EAE3]">
              <p className="font-bold text-[#19432D]">4. Kesimpulan Guru:</p>
              <p className="mt-1 text-[#26332A] leading-relaxed">
                {evalToUse.kesimpulanGuru}
              </p>
            </div>
          </div>
        </div>

        {/* F. Pengesahan */}
        <div className="mt-8 pt-5 border-t border-[#E3EAE3] grid grid-cols-2 gap-8 text-xs text-center avoid-break">
          <div>
            <p className="text-[#6B776D]">Mengetahui &amp; Mengesahkan,</p>
            <p className="font-semibold text-[#26332A]">Kepala / Pengelola {db.pengaturan.namaLembaga}</p>
            <div className="h-16" />
            <p className="font-bold underline text-[#26332A]">{db.pengaturan.kepalaLembaga}</p>
            <p className="text-[11px] text-[#6B776D]">{db.pengaturan.nipKepalaLembaga}</p>
          </div>
          <div>
            <p className="text-[#6B776D]">
              {db.pengaturan.kotaPenerbitan}, {formatDateLongId(tanggalTerbit)}
            </p>
            <p className="font-semibold text-[#26332A]">Guru / Pengajar Khot</p>
            <div className="h-16" />
            <p className="font-bold underline text-[#26332A]">{santriObj.namaGuru}</p>
            <p className="text-[11px] text-[#6B776D]">Pengajar {santriObj.programKhot}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Modul Rapor Perkembangan Bulanan
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Dokumen laporan akademik resmi bulanan santri Belajar Khot siap cetak A4 Portrait &amp; PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditor((e) => !e)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showEditor ? 'Tutup Editor Evaluasi' : 'Edit Evaluasi Guru'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveMonthlyRapor}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Arsip Rapor</span>
          </button>

          <button
            type="button"
            onClick={() => setShowArchiveModal(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Arsip Rapor ({db.riwayatRapor.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setBatchPrintClass((b) => !b)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 ${
              batchPrintClass
                ? 'bg-[#315B43] text-white'
                : 'bg-[#FFFFFF] dark:bg-[#142019] text-[#26332A] dark:text-[#ECF3EE]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{batchPrintClass ? 'Mode: Cetak Massal Satu Kelas' : 'Cetak Massal Satu Kelas'}</span>
          </button>

          {(isAdmin || db.pengaturan.izinkanGuruCetakRapor) && (
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Download PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Period & Santri Selector */}
      <div className="no-print rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1">1. Bulan</label>
          <select
            value={selectedBulan}
            onChange={(e) => setSelectedBulan(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            <option value="11">November</option>
            <option value="10">Oktober</option>
            <option value="09">September</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">2. Tahun</label>
          <select
            value={selectedTahun}
            onChange={(e) => setSelectedTahun(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">3. Kelas / Kelompok</label>
          <select
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            {visibleKelas.map((k) => (
              <option key={k.kelasId} value={k.kelasId}>
                {k.namaKelas} ({k.programKhot})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">4. Santri</label>
          <select
            value={selectedSantriId}
            disabled={batchPrintClass}
            onChange={(e) => setSelectedSantriId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            {classSantri.map((s) => (
              <option key={s.santriId} value={s.santriId}>
                {s.memberId} — {s.namaLengkap}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">5. Tanggal Penerbitan</label>
          <input
            type="date"
            value={tanggalTerbit}
            onChange={(e) => setTanggalTerbit(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
        </div>
      </div>

      {/* Collapsible 4-part Teacher Evaluation Editor */}
      {showEditor && (
        <div className="no-print rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
          <h2 className="text-base font-bold">
            Edit Evaluasi Perkembangan Bulanan ({currentSantri?.namaLengkap})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">1. Perkembangan yang Dicapai</label>
              <textarea
                rows={3}
                value={evaluasi.perkembanganDicapai}
                onChange={(e) =>
                  setEvaluasi((prev) => ({ ...prev, perkembanganDicapai: e.target.value }))
                }
                className="w-full p-2.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">2. Hal yang Perlu Ditingkatkan</label>
              <textarea
                rows={3}
                value={evaluasi.halPerluDitingkatkan}
                onChange={(e) =>
                  setEvaluasi((prev) => ({ ...prev, halPerluDitingkatkan: e.target.value }))
                }
                className="w-full p-2.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">3. Rekomendasi Latihan</label>
              <textarea
                rows={3}
                value={evaluasi.rekomendasiLatihan}
                onChange={(e) =>
                  setEvaluasi((prev) => ({ ...prev, rekomendasiLatihan: e.target.value }))
                }
                className="w-full p-2.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">4. Kesimpulan Guru</label>
              <textarea
                rows={3}
                value={evaluasi.kesimpulanGuru}
                onChange={(e) =>
                  setEvaluasi((prev) => ({ ...prev, kesimpulanGuru: e.target.value }))
                }
                className="w-full p-2.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveMonthlyRapor}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
            >
              Simpan Perubahan Evaluasi ke Arsip
            </button>
          </div>
        </div>
      )}

      {/* A4 Portrait Report Card Preview */}
      <div className="space-y-8">
        {batchPrintClass
          ? classSantri.map((s) => renderMonthlyReportDocument(s.santriId, true))
          : renderMonthlyReportDocument(selectedSantriId, false)}
      </div>

      {/* Archive Modal */}
      {showArchiveModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-2xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 className="text-lg font-bold">Arsip Rapor yang Telah Diterbitkan</h2>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22]"
              >
                Tutup
              </button>
            </div>
            <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-[#E3EAE3] dark:divide-[#24382C] text-xs">
              {db.riwayatRapor.map((r) => (
                <div key={r.raporId} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                      {r.nomorRapor} · {r.jenisRapor} · Versi {r.versiRapor}
                    </p>
                    <p className="font-bold text-sm mt-0.5">
                      {r.namaSantri} ({r.memberId}) — {r.periodeLabel}
                    </p>
                    <p className="text-[#6B776D] dark:text-[#A3D1B3]/80">
                      Nilai Akhir: {r.nilaiAkhir ?? '-'} (Predikat {r.predikat}) · Kehadiran: {r.persentaseKehadiran}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowArchiveModal(false);
                        navigate(
                          r.jenisRapor === 'HARIAN'
                            ? `/print/rapor-harian/${r.raporId}`
                            : `/print/rapor-bulanan/${r.raporId}`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg font-semibold bg-[#19432D] text-white"
                    >
                      Cetak Kembali
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => deleteRapor(r.raporId)}
                        aria-label={`Hapus Arsip ${r.nomorRapor}`}
                        className="p-1.5 rounded-lg text-[#B44238] hover:bg-[#B44238]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
