import React from 'react';
import { ArrowLeft, Printer, FileDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from '../components/LogoBelajarKhot';
import {
  calculateAspectAveragesForPeriod,
  calculateMonthlyAverageScore,
  calculateSessionFinalScore,
  calculateStudentAttendanceSummary,
  formatDateLongId,
  getGradePredicate,
  getPredicateLabel,
} from '../utils/academicRules';

interface PrintDocumentViewProps {
  docType: 'jurnal' | 'absensi' | 'rapor-harian' | 'rapor-bulanan';
  targetId: string;
}

export const PrintDocumentView: React.FC<PrintDocumentViewProps> = ({
  docType,
  targetId,
}) => {
  const { db, currentUser, navigate } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const handleBack = () => {
    if (docType === 'jurnal') navigate(`${rolePrefix}/jurnal/${targetId}`);
    else if (docType === 'absensi') navigate(`${rolePrefix}/absensi`);
    else if (docType === 'rapor-harian') navigate(`${rolePrefix}/rapor-harian`);
    else navigate(isAdmin ? '/admin/rapor-bulanan' : '/guru/rapor');
  };

  return (
    <div className="min-h-screen bg-[#F3F7F2] dark:bg-[#0D1510] py-6 px-4">
      {/* Action Toolbar (Hidden when printing) */}
      <div className="no-print max-w-[210mm] mx-auto mb-6 p-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <button
          type="button"
          onClick={handleBack}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (A4)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#315B43] hover:bg-[#19432D] text-white flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* A4 Document Sheet */}
      <div className="print-container max-w-[210mm] mx-auto bg-white text-[#111827] border border-[#E3EAE3] rounded-2xl p-8 sm:p-10 shadow-sm">
        {/* Header Lembaga */}
        <div className="flex items-center justify-between pb-5 border-b-2 border-[#19432D]">
          <LogoBelajarKhot size="lg" variant="print" subtitle={db.pengaturan.subJudulLembaga} />
          <div className="text-right">
            <h1 className="text-lg font-extrabold text-[#19432D] uppercase">
              {docType === 'jurnal' && 'DOKUMEN JURNAL PEMBELAJARAN'}
              {docType === 'absensi' && 'DAFTAR HADIR SANTRI PERTEMUAN'}
              {docType === 'rapor-harian' && 'RAPOR PENILAIAN HARIAN'}
              {docType === 'rapor-bulanan' && 'RAPOR PERKEMBANGAN BELAJAR KHOT'}
            </h1>
            <p className="text-xs text-[#6B776D] mt-0.5">{db.pengaturan.alamatLembaga}</p>
          </div>
        </div>

        {/* 1. PRINT JURNAL / ABSENSI */}
        {(docType === 'jurnal' || docType === 'absensi') && (() => {
          const jurnal = db.jurnal.find((j) => j.jurnalId === targetId) || db.jurnal[0];
          if (!jurnal) return <p className="py-8 text-sm">Data jurnal tidak ditemukan.</p>;
          const classSantri = db.santri.filter((s) => s.kelasId === jurnal.kelasId);

          return (
            <div className="mt-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAFCF9] border border-[#E3EAE3]">
                <div>
                  <p><span className="text-[#6B776D]">Nomor Jurnal:</span> <strong className="font-mono">{jurnal.nomorJurnal}</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Hari, Tanggal:</span> <strong>{jurnal.hari}, {formatDateLongId(jurnal.tanggal)}</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Pertemuan Ke:</span> <strong>{jurnal.pertemuanKe}</strong></p>
                </div>
                <div>
                  <p><span className="text-[#6B776D]">Kelas / Kelompok:</span> <strong>{jurnal.namaKelas}</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Program &amp; Metode:</span> <strong>{jurnal.programKhot} ({jurnal.metodePembelajaran})</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Guru Pengajar:</span> <strong>{jurnal.namaGuru}</strong></p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E3EAE3] space-y-2">
                <p><strong>Materi Pembelajaran:</strong> {jurnal.materiPembelajaran}</p>
                <p><strong>Target Pembelajaran:</strong> {jurnal.targetPembelajaran}</p>
                <p><strong>Ringkasan Kegiatan:</strong> {jurnal.ringkasanKegiatan}</p>
                <p><strong>Catatan Guru:</strong> {jurnal.catatanGuru}</p>
              </div>

              <table className="w-full text-left border-collapse border border-[#E3EAE3]">
                <thead>
                  <tr className="bg-[#19432D] text-white">
                    <th className="py-2 px-3 border border-[#19432D] w-10 text-center">No</th>
                    <th className="py-2 px-3 border border-[#19432D]">ID Member</th>
                    <th className="py-2 px-3 border border-[#19432D]">Nama Lengkap Santri</th>
                    <th className="py-2 px-3 border border-[#19432D] text-center">Kehadiran</th>
                    {docType === 'jurnal' && (
                      <th className="py-2 px-3 border border-[#19432D] text-right">Nilai Akhir</th>
                    )}
                    <th className="py-2 px-3 border border-[#19432D]">Keterangan / Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {classSantri.map((s, idx) => {
                    const att = db.absensi.find(
                      (a) => a.jurnalId === jurnal.jurnalId && a.santriId === s.santriId
                    );
                    const pItems = db.penilaian.filter(
                      (p) => p.jurnalId === jurnal.jurnalId && p.santriId === s.santriId
                    );
                    const sc = calculateSessionFinalScore(
                      pItems.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
                    );
                    return (
                      <tr key={s.santriId} className="border-b border-[#E3EAE3]">
                        <td className="py-2 px-3 text-center font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono">{s.memberId}</td>
                        <td className="py-2 px-3 font-semibold">{s.namaLengkap}</td>
                        <td className="py-2 px-3 text-center font-semibold">
                          {att?.statusKehadiran || 'Hadir'}
                        </td>
                        {docType === 'jurnal' && (
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {sc !== null ? sc : '-'}
                          </td>
                        )}
                        <td className="py-2 px-3">
                          {pItems[0]?.catatanPenilaian || att?.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-10 pt-6 border-t border-[#E3EAE3] grid grid-cols-2 gap-8 text-center">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Kepala {db.pengaturan.namaLembaga}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{db.pengaturan.kepalaLembaga}</p>
                </div>
                <div>
                  <p>{db.pengaturan.kotaPenerbitan}, {formatDateLongId(jurnal.tanggal)}</p>
                  <p className="font-semibold">Guru Pengajar</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{jurnal.namaGuru}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2. PRINT RAPOR HARIAN OR BULANAN FROM ARCHIVE ID */}
        {(docType === 'rapor-harian' || docType === 'rapor-bulanan') && (() => {
          const rapor =
            db.riwayatRapor.find((r) => r.raporId === targetId) ||
            db.riwayatRapor.find(
              (r) => r.jenisRapor === (docType === 'rapor-harian' ? 'HARIAN' : 'BULANAN')
            );

          if (!rapor) {
            return <p className="py-8 text-sm">Data arsip rapor tidak ditemukan.</p>;
          }

          const santri = db.santri.find((s) => s.santriId === rapor.santriId) || db.santri[0];
          const ymPrefix = rapor.periodeAwal.slice(0, 7);
          const periodJournals = db.jurnal.filter(
            (j) => j.kelasId === santri.kelasId && j.tanggal.startsWith(ymPrefix)
          );
          const journalIds = new Set(
            rapor.jurnalId ? [rapor.jurnalId] : periodJournals.map((j) => j.jurnalId)
          );
          const aspectAverages = calculateAspectAveragesForPeriod(
            db.penilaian,
            santri.santriId,
            journalIds,
            db.pengaturan.batasPredikat
          );
          const attSummary = calculateStudentAttendanceSummary(
            santri,
            periodJournals,
            db.absensi
          );
          const avgScore =
            rapor.nilaiAkhir ??
            calculateMonthlyAverageScore(aspectAverages.map((a) => a.rataRata));
          const predikat = getGradePredicate(avgScore, db.pengaturan.batasPredikat);

          return (
            <div className="mt-6 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAFCF9] border border-[#E3EAE3]">
                <div>
                  <p><span className="text-[#6B776D]">Nama Santri:</span> <strong>{santri.namaLengkap}</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">ID Member:</span> <strong className="font-mono">{santri.memberId}</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Kelas:</span> <strong>{santri.namaKelas}</strong></p>
                </div>
                <div>
                  <p><span className="text-[#6B776D]">Nomor Rapor:</span> <strong className="font-mono">{rapor.nomorRapor}</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Program Khot:</span> <strong>{santri.programKhot} ({santri.metodePembelajaran})</strong></p>
                  <p className="mt-1"><span className="text-[#6B776D]">Periode:</span> <strong>{rapor.periodeLabel}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#19432D] text-white">
                  <p className="text-[11px] text-[#A3D1B3]">Nilai Akhir</p>
                  <p className="text-2xl font-extrabold font-mono mt-1">{avgScore ?? '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
                  <p className="text-[11px] text-[#6B776D]">Predikat</p>
                  <p className="text-base font-bold text-[#19432D] mt-1">
                    {predikat} — {getPredicateLabel(predikat)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
                  <p className="text-[11px] text-[#6B776D]">Persentase Kehadiran</p>
                  <p className="text-2xl font-extrabold font-mono text-[#3B7551] mt-1">
                    {attSummary.persentaseKehadiran}%
                  </p>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-[#E3EAE3]">
                <thead>
                  <tr className="bg-[#19432D] text-white">
                    <th className="py-2 px-3 border border-[#19432D] w-10 text-center">No</th>
                    <th className="py-2 px-3 border border-[#19432D]">Aspek Penilaian</th>
                    <th className="py-2 px-3 border border-[#19432D] text-right">Nilai</th>
                    <th className="py-2 px-3 border border-[#19432D] text-center">Predikat</th>
                  </tr>
                </thead>
                <tbody>
                  {aspectAverages.map((asp, i) => (
                    <tr key={asp.aspekId} className="border-b border-[#E3EAE3]">
                      <td className="py-2 px-3 text-center font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-semibold">{asp.namaAspek}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {asp.rataRata ?? '-'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{asp.predikat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rapor.evaluasiBulanan && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-[#E3EAE3]">
                    <p className="font-bold text-[#19432D]">Perkembangan yang Dicapai:</p>
                    <p className="mt-1">{rapor.evaluasiBulanan.perkembanganDicapai}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E3EAE3]">
                    <p className="font-bold text-[#19432D]">Hal yang Perlu Ditingkatkan:</p>
                    <p className="mt-1">{rapor.evaluasiBulanan.halPerluDitingkatkan}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E3EAE3]">
                    <p className="font-bold text-[#19432D]">Rekomendasi Latihan:</p>
                    <p className="mt-1">{rapor.evaluasiBulanan.rekomendasiLatihan}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E3EAE3]">
                    <p className="font-bold text-[#19432D]">Kesimpulan Guru:</p>
                    <p className="mt-1">{rapor.evaluasiBulanan.kesimpulanGuru}</p>
                  </div>
                </div>
              )}

              {rapor.catatanHarian && (
                <div className="p-3.5 rounded-xl border border-[#E3EAE3]">
                  <p className="font-bold text-[#19432D]">Catatan Evaluasi Harian Guru:</p>
                  <p className="mt-1">{rapor.catatanHarian}</p>
                </div>
              )}

              <div className="mt-10 pt-6 border-t border-[#E3EAE3] grid grid-cols-2 gap-8 text-center">
                <div>
                  <p>Mengetahui &amp; Mengesahkan,</p>
                  <p className="font-semibold">Kepala {db.pengaturan.namaLembaga}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{db.pengaturan.kepalaLembaga}</p>
                </div>
                <div>
                  <p>{rapor.tempatPenerbitan}, {formatDateLongId(rapor.tanggalPenerbitan)}</p>
                  <p className="font-semibold">Guru / Pengajar Khot</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{rapor.diterbitkanOleh}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
