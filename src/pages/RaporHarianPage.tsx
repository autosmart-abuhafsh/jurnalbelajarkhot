import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Save,
  Edit3,
  Users,
  FileDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LogoBelajarKhot } from '../components/LogoBelajarKhot';
import {
  calculateSessionFinalScore,
  formatDateLongId,
  formatDateShortId,
  getGradePredicate,
  getPredicateLabel,
} from '../utils/academicRules';
import { RiwayatRapor } from '../types';

export const RaporHarianPage: React.FC = () => {
  const {
    db,
    currentUser,
    visibleJurnal,
    visibleSantri,
    saveRapor,
    navigate,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const sortedJurnal = useMemo(
    () => [...visibleJurnal].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [visibleJurnal]
  );

  const [selectedJurnalId, setSelectedJurnalId] = useState<string>(
    sortedJurnal[0]?.jurnalId || ''
  );

  const currentJurnal = useMemo(
    () => db.jurnal.find((j) => j.jurnalId === selectedJurnalId),
    [db.jurnal, selectedJurnalId]
  );

  const classSantri = useMemo(() => {
    if (!currentJurnal) return [];
    return visibleSantri.filter((s) => s.kelasId === currentJurnal.kelasId);
  }, [currentJurnal, visibleSantri]);

  const [selectedSantriId, setSelectedSantriId] = useState<string>('');
  const [batchPrintAllClass, setBatchPrintAllClass] = useState<boolean>(false);
  const [catatanGuruCustom, setCatatanGuruCustom] = useState<string>('');

  useEffect(() => {
    if (classSantri.length > 0 && !classSantri.some((s) => s.santriId === selectedSantriId)) {
      setSelectedSantriId(classSantri[0].santriId);
    }
  }, [classSantri, selectedSantriId]);

  const currentSantri = useMemo(
    () => classSantri.find((s) => s.santriId === selectedSantriId),
    [classSantri, selectedSantriId]
  );

  useEffect(() => {
    if (!currentJurnal || !currentSantri) return;
    const existingCatatan = db.catatanPerkembangan.find(
      (c) => c.jurnalId === currentJurnal.jurnalId && c.santriId === currentSantri.santriId
    );
    const pItem = db.penilaian.find(
      (p) => p.jurnalId === currentJurnal.jurnalId && p.santriId === currentSantri.santriId
    );
    setCatatanGuruCustom(
      existingCatatan?.isiCatatan ||
        pItem?.catatanPenilaian ||
        currentJurnal.catatanGuru ||
        'Bentuk huruf sudah semakin baik. Pertahankan konsistensi latihan mandiri.'
    );
  }, [currentJurnal, currentSantri, db.catatanPerkembangan, db.penilaian]);

  const handleSaveArchive = async () => {
    if (!currentJurnal || !currentSantri) return;
    const pItems = db.penilaian.filter(
      (p) => p.jurnalId === currentJurnal.jurnalId && p.santriId === currentSantri.santriId
    );
    const finalScore = calculateSessionFinalScore(
      pItems.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
    );
    const predikat = getGradePredicate(finalScore, db.pengaturan.batasPredikat);
    const att = db.absensi.find(
      (a) => a.jurnalId === currentJurnal.jurnalId && a.santriId === currentSantri.santriId
    );

    const raporRecord: RiwayatRapor = {
      raporId: `RPR-HAR-${currentJurnal.jurnalId}-${currentSantri.santriId}`,
      nomorRapor: `RPR/HAR/${currentJurnal.tanggal.replace(/-/g, '')}/${currentSantri.memberId}`,
      santriId: currentSantri.santriId,
      memberId: currentSantri.memberId,
      namaSantri: currentSantri.namaLengkap,
      kelasId: currentSantri.kelasId,
      namaKelas: currentSantri.namaKelas,
      programKhot: currentSantri.programKhot,
      jenisRapor: 'HARIAN',
      jurnalId: currentJurnal.jurnalId,
      periodeAwal: currentJurnal.tanggal,
      periodeAkhir: currentJurnal.tanggal,
      periodeLabel: formatDateLongId(currentJurnal.tanggal),
      nilaiAkhir: finalScore,
      predikat,
      persentaseKehadiran: att?.statusKehadiran === 'Hadir' ? 100 : 0,
      catatanHarian: catatanGuruCustom,
      tanggalPenerbitan: '2026-11-17',
      tempatPenerbitan: db.pengaturan.kotaPenerbitan,
      diterbitkanOleh: currentJurnal.namaGuru,
      versiRapor: 1,
      statusRapor: 'Diterbitkan',
      isDemo: false,
    };

    const isNew = !db.riwayatRapor.some((r) => r.raporId === raporRecord.raporId);
    await saveRapor(raporRecord, isNew);
  };

  const renderSingleDailyReportCard = (santriIdToRender: string, isBatchItem = false) => {
    const santriObj = classSantri.find((s) => s.santriId === santriIdToRender);
    if (!santriObj || !currentJurnal) return null;

    const activeRubriks = db.rubrik
      .filter((r) => r.programKhot === currentJurnal.programKhot && r.statusAktif)
      .sort((a, b) => a.urutan - b.urutan);

    const aspectRows = activeRubriks.map((r) => {
      const rec = db.penilaian.find(
        (p) =>
          p.jurnalId === currentJurnal.jurnalId &&
          p.santriId === santriObj.santriId &&
          p.aspekId === r.aspekId
      );
      return {
        aspekId: r.aspekId,
        namaAspek: r.namaAspek,
        bobot: rec?.bobot ?? r.bobot,
        nilai: rec?.nilai ?? null,
        catatan:
          rec?.catatanPenilaian ||
          (rec?.nilai && rec.nilai >= 90
            ? 'Sangat baik'
            : rec?.nilai && rec.nilai >= 80
            ? 'Baik'
            : 'Perlu latihan'),
      };
    });

    const finalScore = calculateSessionFinalScore(
      aspectRows.map((a) => ({ nilai: a.nilai, bobot: a.bobot }))
    );
    const predikat = getGradePredicate(finalScore, db.pengaturan.batasPredikat);
    const att = db.absensi.find(
      (a) => a.jurnalId === currentJurnal.jurnalId && a.santriId === santriObj.santriId
    );

    const noteText =
      santriObj.santriId === selectedSantriId
        ? catatanGuruCustom
        : aspectRows[0]?.catatan || currentJurnal.catatanGuru;

    return (
      <div
        key={santriObj.santriId}
        className={`print-container bg-white text-[#111827] border border-[#E3EAE3] rounded-2xl p-8 sm:p-10 max-w-[210mm] mx-auto shadow-sm ${
          isBatchItem ? 'page-break-after mb-8' : ''
        }`}
      >
        {/* Kepala Rapor */}
        <div className="flex items-center justify-between pb-5 border-b-2 border-[#19432D]">
          <LogoBelajarKhot
            size="lg"
            variant="print"
            subtitle={db.pengaturan.subJudulLembaga}
          />
          <div className="text-right">
            <h2 className="text-lg font-extrabold tracking-tight text-[#19432D]">
              RAPOR PENILAIAN HARIAN
            </h2>
            <p className="text-xs font-mono text-[#315B43] mt-0.5">
              No. Jurnal: {currentJurnal.nomorJurnal}
            </p>
            <p className="text-xs text-[#6B776D]">
              Tanggal: {formatDateLongId(currentJurnal.tanggal)}
            </p>
          </div>
        </div>

        {/* Identitas Santri */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 my-5 p-4 rounded-xl bg-[#FAFCF9] border border-[#E3EAE3] text-xs">
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
            <span className="text-[#6B776D]">Guru Pengajar:</span>
            <span className="font-semibold text-[#26332A]">{currentJurnal.namaGuru}</span>
          </div>
        </div>

        {/* Tabel Aspek Penilaian */}
        <div className="my-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#19432D] mb-2">
            I. Rincian Aspek Penilaian Menulis Khot
          </h3>
          <table className="w-full text-left border-collapse border border-[#E3EAE3] text-xs">
            <thead>
              <tr className="bg-[#19432D] text-white">
                <th className="py-2.5 px-3 border border-[#19432D] w-10 text-center">No</th>
                <th className="py-2.5 px-3 border border-[#19432D]">Aspek Penilaian</th>
                <th className="py-2.5 px-3 border border-[#19432D] text-right w-20">Bobot</th>
                <th className="py-2.5 px-3 border border-[#19432D] text-right w-24">Nilai</th>
                <th className="py-2.5 px-3 border border-[#19432D]">Catatan Evaluasi</th>
              </tr>
            </thead>
            <tbody>
              {aspectRows.map((ar, idx) => (
                <tr key={ar.aspekId} className="border-b border-[#E3EAE3]">
                  <td className="py-2.5 px-3 text-center font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#26332A]">{ar.namaAspek}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#6B776D]">{ar.bobot}%</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-[#19432D]">
                    {ar.nilai !== null ? ar.nilai : 'Belum Dinilai'}
                  </td>
                  <td className="py-2.5 px-3 text-[#26332A]">{ar.catatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bagian Hasil Pertemuan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
          <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
            <p className="text-xs text-[#6B776D]">Nilai Akhir Pertemuan</p>
            <p className="text-2xl font-extrabold font-mono text-[#19432D] mt-1">
              {finalScore !== null ? finalScore.toString().replace('.', ',') : '-'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
            <p className="text-xs text-[#6B776D]">Predikat Capaian</p>
            <p className="text-lg font-bold text-[#19432D] mt-1">
              {predikat} — {getPredicateLabel(predikat)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F3F7F2] border border-[#E3EAE3]">
            <p className="text-xs text-[#6B776D]">Status Kehadiran</p>
            <p className="text-lg font-bold text-[#3B7551] mt-1">
              {att?.statusKehadiran || 'Hadir'}
            </p>
          </div>
        </div>

        {/* Materi & Catatan Guru */}
        <div className="space-y-3 my-5 text-xs">
          <div className="p-3.5 rounded-xl border border-[#E3EAE3]">
            <p className="font-bold text-[#19432D]">Materi Pembelajaran Pertemuan Ke-{currentJurnal.pertemuanKe}:</p>
            <p className="mt-1 text-[#26332A]">{currentJurnal.materiPembelajaran}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-[#E3EAE3]">
            <p className="font-bold text-[#19432D]">Catatan Perkembangan Guru:</p>
            <p className="mt-1 text-[#26332A] leading-relaxed">{noteText}</p>
          </div>
        </div>

        {/* Bagian Penutup & Pengesahan */}
        <div className="mt-8 pt-6 border-t border-[#E3EAE3] grid grid-cols-2 gap-8 text-xs text-center avoid-break">
          <div>
            <p className="text-[#6B776D]">Mengetahui,</p>
            <p className="font-semibold text-[#26332A]">Pengelola {db.pengaturan.namaLembaga}</p>
            <div className="h-16" />
            <p className="font-bold underline text-[#26332A]">{db.pengaturan.kepalaLembaga}</p>
            <p className="text-[11px] text-[#6B776D]">{db.pengaturan.nipKepalaLembaga}</p>
          </div>
          <div>
            <p className="text-[#6B776D]">
              {db.pengaturan.kotaPenerbitan}, {formatDateLongId(currentJurnal.tanggal)}
            </p>
            <p className="font-semibold text-[#26332A]">Guru / Pengajar Khot</p>
            <div className="h-16" />
            <p className="font-bold underline text-[#26332A]">{currentJurnal.namaGuru}</p>
            <p className="text-[11px] text-[#6B776D]">Pengajar {santriObj.programKhot}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Modul Rapor Penilaian Harian
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Laporan perkembangan individu santri berdasarkan satu tanggal / pertemuan pembelajaran (Format A4 Portrait)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentJurnal && (
            <button
              type="button"
              onClick={() => navigate(`${rolePrefix}/jurnal/${currentJurnal.jurnalId}`)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Data Penilaian</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveArchive}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan ke Arsip Rapor</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBatchPrintAllClass((b) => !b);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 ${
              batchPrintAllClass
                ? 'bg-[#315B43] text-white'
                : 'bg-[#FFFFFF] dark:bg-[#142019] text-[#26332A] dark:text-[#ECF3EE]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{batchPrintAllClass ? 'Mode: Semua Santri Sekaligus' : 'Cetak Beberapa Santri Sekaligus'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Simpan PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Selector & Quick Note Editor */}
      <div className="no-print rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <label className="block text-xs font-semibold mb-1.5">
            1. Pilih Tanggal / Jurnal Pertemuan
          </label>
          <select
            value={selectedJurnalId}
            onChange={(e) => setSelectedJurnalId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            {sortedJurnal.map((j) => (
              <option key={j.jurnalId} value={j.jurnalId}>
                {formatDateShortId(j.tanggal)} — {j.namaKelas} ({j.nomorJurnal}: {j.materiPembelajaran})
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold mb-1.5">
            2. Pilih Santri
          </label>
          <select
            value={selectedSantriId}
            disabled={batchPrintAllClass}
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

        <div className="lg:col-span-4">
          <label className="block text-xs font-semibold mb-1.5">
            3. Edit Catatan Perkembangan Guru pada Rapor
          </label>
          <input
            type="text"
            value={catatanGuruCustom}
            onChange={(e) => setCatatanGuruCustom(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
        </div>
      </div>

      {/* Preview Document Container */}
      <div className="space-y-8">
        {batchPrintAllClass
          ? classSantri.map((s) => renderSingleDailyReportCard(s.santriId, true))
          : renderSingleDailyReportCard(selectedSantriId, false)}
      </div>
    </div>
  );
};
