import React, { useState, useMemo, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  History,
  X,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Penilaian } from '../types';
import {
  calculateSessionFinalScore,
  formatDateLongId,
  formatDateShortId,
  getGradePredicate,
  validateScoreInput,
} from '../utils/academicRules';

export const PenilaianPage: React.FC = () => {
  const {
    db,
    currentUser,
    visibleJurnal,
    visibleKelas,
    savePenilaianBatch,
    navigate,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const sortedJurnal = useMemo(
    () => [...visibleJurnal].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [visibleJurnal]
  );

  const [filterKelas, setFilterKelas] = useState('ALL');
  const [selectedJurnalId, setSelectedJurnalId] = useState<string>(
    sortedJurnal[0]?.jurnalId || ''
  );
  const [alasanKoreksi, setAlasanKoreksi] = useState('');
  const [historySantriId, setHistorySantriId] = useState<string | null>(null);

  const availableJurnals = useMemo(() => {
    if (filterKelas === 'ALL') return sortedJurnal;
    return sortedJurnal.filter((j) => j.kelasId === filterKelas);
  }, [sortedJurnal, filterKelas]);

  useEffect(() => {
    if (
      availableJurnals.length > 0 &&
      !availableJurnals.some((j) => j.jurnalId === selectedJurnalId)
    ) {
      setSelectedJurnalId(availableJurnals[0].jurnalId);
    }
  }, [availableJurnals, selectedJurnalId]);

  const currentJurnal = useMemo(
    () => db.jurnal.find((j) => j.jurnalId === selectedJurnalId),
    [db.jurnal, selectedJurnalId]
  );

  const classSantri = useMemo(() => {
    if (!currentJurnal) return [];
    return db.santri.filter((s) => s.kelasId === currentJurnal.kelasId);
  }, [currentJurnal, db.santri]);

  const activeRubriks = useMemo(() => {
    if (!currentJurnal) return [];
    return db.rubrik
      .filter((r) => r.programKhot === currentJurnal.programKhot && r.statusAktif)
      .sort((a, b) => a.urutan - b.urutan);
  }, [currentJurnal, db.rubrik]);

  const [draftScores, setDraftScores] = useState<Record<string, Record<string, string>>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const loadOriginalScores = () => {
    if (!currentJurnal) return;
    const scoreMap: Record<string, Record<string, string>> = {};
    const noteMap: Record<string, string> = {};
    for (const s of classSantri) {
      scoreMap[s.santriId] = {};
      for (const r of activeRubriks) {
        const rec = db.penilaian.find(
          (p) =>
            p.jurnalId === currentJurnal.jurnalId &&
            p.santriId === s.santriId &&
            p.aspekId === r.aspekId
        );
        scoreMap[s.santriId][r.aspekId] =
          rec && rec.nilai !== null && rec.nilai !== undefined ? String(rec.nilai) : '';
        if (rec?.catatanPenilaian && !noteMap[s.santriId]) {
          noteMap[s.santriId] = rec.catatanPenilaian;
        }
      }
    }
    setDraftScores(scoreMap);
    setDraftNotes(noteMap);
    setAlasanKoreksi('');
  };

  useEffect(() => {
    loadOriginalScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJurnal, classSantri, activeRubriks, db.penilaian]);

  const handleSave = async () => {
    if (!currentJurnal) return;
    const now = new Date().toISOString();
    const records: Penilaian[] = [];

    for (const s of classSantri) {
      for (const r of activeRubriks) {
        const raw = draftScores[s.santriId]?.[r.aspekId] ?? '';
        const numericVal = raw.trim() === '' ? null : Number(raw);
        const validation = validateScoreInput(numericVal);
        if (!validation.valid) {
          showToast(
            'error',
            `Nilai Tidak Valid (${s.namaLengkap} - ${r.namaAspek})`,
            validation.error
          );
          return;
        }
        records.push({
          penilaianId: `PNL-${currentJurnal.jurnalId}-${s.santriId}-${r.aspekId}`,
          jurnalId: currentJurnal.jurnalId,
          tanggal: currentJurnal.tanggal,
          santriId: s.santriId,
          memberId: s.memberId,
          aspekId: r.aspekId,
          namaAspek: r.namaAspek,
          nilai: numericVal,
          bobot: r.bobot,
          catatanPenilaian: draftNotes[s.santriId] || '',
          createdBy: currentUser?.namaLengkap || currentJurnal.namaGuru,
          updatedAt: now,
          updatedBy: currentUser?.namaLengkap || currentJurnal.namaGuru,
          isDemo: currentJurnal.isDemo,
        });
      }
    }

    await savePenilaianBatch(currentJurnal.jurnalId, records, alasanKoreksi.trim() || undefined);
    setAlasanKoreksi('');
  };

  const quickNoteTemplates = [
    'Bentuk huruf sudah semakin baik.',
    'Perlu memperhatikan proporsi ukuran huruf.',
    'Perlu memperbaiki ketepatan kaidah mizan titik.',
    'Latihan mandiri perlu ditingkatkan.',
  ];

  const selectedSantriHistory = useMemo(() => {
    if (!historySantriId || !currentJurnal) return [];
    return db.penilaian.filter(
      (p) => p.jurnalId === currentJurnal.jurnalId && p.santriId === historySantriId
    );
  }, [db.penilaian, historySantriId, currentJurnal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Modul Penilaian Santri
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Penilaian kemampuan menulis khot berbasis rubrik berbobot (Skala 0–100) dengan riwayat koreksi nilai
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`${rolePrefix}/rapor-harian`)}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 self-start"
        >
          <FileCheck className="w-4 h-4" />
          <span>Buka Rapor Harian</span>
        </button>
      </div>

      {/* Selector Bar */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold mb-1.5">Filter Kelas</label>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            <option value="ALL">Semua Kelas</option>
            {visibleKelas.map((k) => (
              <option key={k.kelasId} value={k.kelasId}>
                {k.namaKelas}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-5">
          <label className="block text-xs font-semibold mb-1.5">
            Pilih Jurnal Pertemuan Pembelajaran
          </label>
          <select
            value={selectedJurnalId}
            onChange={(e) => setSelectedJurnalId(e.target.value)}
            aria-label="Pilih Jurnal Penilaian"
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            {availableJurnals.map((j) => (
              <option key={j.jurnalId} value={j.jurnalId}>
                {formatDateShortId(j.tanggal)} — {j.namaKelas} (Ke-{j.pertemuanKe}: {j.materiPembelajaran})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="block text-xs font-semibold mb-1.5">
            Catatan Alasan Koreksi (Opsional saat mengedit nilai lama)
          </label>
          <input
            type="text"
            value={alasanKoreksi}
            onChange={(e) => setAlasanKoreksi(e.target.value)}
            placeholder="Contoh: Perbaikan nilai setelah tashih ulang..."
            className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
        </div>
      </div>

      {currentJurnal && (
        <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-5">
          {/* Header Pertemuan */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#E3EAE3] dark:border-[#24382C]">
            <div>
              <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                {currentJurnal.nomorJurnal} · {formatDateLongId(currentJurnal.tanggal)} · {currentJurnal.programKhot} · Pengajar: {currentJurnal.namaGuru}
              </p>
              <h2 className="text-lg font-bold mt-0.5">
                Materi: {currentJurnal.materiPembelajaran}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadOriginalScores}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batalkan Perubahan</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Nilai</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                  <th className="py-3 pr-2">No</th>
                  <th className="py-3 px-2">Nama Santri &amp; Status Hadir</th>
                  {activeRubriks.map((r) => (
                    <th key={r.aspekId} className="py-3 px-2 text-center min-w-[95px]">
                      <span className="block text-[#26332A] dark:text-[#ECF3EE]">{r.namaAspek}</span>
                      <span className="font-mono text-[10px] text-[#6B776D] dark:text-[#A3D1B3]">
                        Bobot {r.bobot}%
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-right">Nilai Akhir</th>
                  <th className="py-3 px-2 min-w-[210px]">Catatan Guru</th>
                  <th className="py-3 pl-2 text-right">Riwayat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                {classSantri.map((s, idx) => {
                  const att = db.absensi.find(
                    (a) => a.jurnalId === currentJurnal.jurnalId && a.santriId === s.santriId
                  );
                  const rowScores = activeRubriks.map((r) => {
                    const raw = draftScores[s.santriId]?.[r.aspekId] ?? '';
                    return {
                      nilai: raw.trim() === '' ? null : Number(raw),
                      bobot: r.bobot,
                    };
                  });
                  const finalScore = calculateSessionFinalScore(rowScores);
                  const predikat = getGradePredicate(finalScore, db.pengaturan.batasPredikat);

                  return (
                    <tr key={s.santriId} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                      <td className="py-3 pr-2 font-mono tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className="font-semibold text-sm text-[#26332A] dark:text-[#ECF3EE] block">
                          {s.namaLengkap}
                        </span>
                        <span className="text-[11px] text-[#6B776D] dark:text-[#A3D1B3]">
                          {s.memberId} · Kehadiran: {att?.statusKehadiran || 'Belum Dicatat'}
                        </span>
                      </td>

                      {activeRubriks.map((r) => (
                        <td key={r.aspekId} className="py-3 px-1.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={draftScores[s.santriId]?.[r.aspekId] ?? ''}
                            onChange={(e) =>
                              setDraftScores((prev) => ({
                                ...prev,
                                [s.santriId]: {
                                  ...(prev[s.santriId] || {}),
                                  [r.aspekId]: e.target.value,
                                },
                              }))
                            }
                            placeholder="-"
                            aria-label={`${r.namaAspek} ${s.namaLengkap}`}
                            className="w-16 px-2 py-1.5 text-center font-mono tabular-nums rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                          />
                        </td>
                      ))}

                      <td className="py-3 px-2 text-right whitespace-nowrap">
                        {finalScore !== null ? (
                          <div>
                            <span className="font-mono text-sm font-bold tabular-nums text-[#19432D] dark:text-[#A3D1B3]">
                              {finalScore.toString().replace('.', ',')}
                            </span>
                            <span className="block text-[10px] font-semibold text-[#6B776D] dark:text-[#A3D1B3]/80">
                              Predikat {predikat}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] italic text-[#6B776D]">Belum Dinilai</span>
                        )}
                      </td>

                      <td className="py-3 px-2">
                        <input
                          type="text"
                          list="quick-notes-list"
                          value={draftNotes[s.santriId] || ''}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [s.santriId]: e.target.value,
                            }))
                          }
                          placeholder="Pilih/ketik catatan perkembangan..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                        />
                      </td>

                      <td className="py-3 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => setHistorySantriId(s.santriId)}
                          title="Lihat Riwayat Perubahan Nilai"
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="quick-notes-list">
              {quickNoteTemplates.map((qn) => (
                <option key={qn} value={qn} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      {/* Modal Riwayat Perubahan Nilai */}
      {historySantriId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 className="text-base font-bold">
                Riwayat Perubahan Nilai Santri
              </h2>
              <button
                type="button"
                onClick={() => setHistorySantriId(null)}
                aria-label="Tutup"
                className="p-1 text-[#6B776D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3 text-xs">
              {selectedSantriHistory.map((item) => (
                <div
                  key={item.penilaianId}
                  className="p-3 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  <div className="flex justify-between font-semibold">
                    <span>{item.namaAspek} (Bobot Historis: {item.bobot}%)</span>
                    <span className="font-mono">Nilai Saat Ini: {item.nilai ?? 'Belum Dinilai'}</span>
                  </div>
                  <p className="text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    Terakhir diperbarui oleh {item.updatedBy} pada {item.updatedAt.slice(0, 10)}
                  </p>
                  {item.riwayatEdit && item.riwayatEdit.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#E3EAE3] dark:border-[#24382C] space-y-1">
                      <p className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">
                        Log Koreksi Nilai:
                      </p>
                      {item.riwayatEdit.map((re, i) => (
                        <p key={i} className="text-[11px]">
                          • {re.editedAt.slice(0, 10)}: {re.nilaiLama ?? '-'} → {re.nilaiBaru ?? '-'} oleh {re.editedBy} ({re.alasanKoreksi})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
