import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Save,
  Printer,
  Search,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Absensi, StatusKehadiran } from '../types';
import {
  calculateStudentAttendanceSummary,
  formatDateLongId,
  formatDateShortId,
} from '../utils/academicRules';

export const AbsensiPage: React.FC = () => {
  const {
    db,
    visibleJurnal,
    visibleKelas,
    visibleSantri,
    saveAbsensiBatch,
    navigate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'input' | 'rekap'>('input');

  // Tab 1: Input Absensi per Jurnal
  const sortedJurnal = useMemo(
    () => [...visibleJurnal].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [visibleJurnal]
  );

  const [filterKelasInput, setFilterKelasInput] = useState('ALL');
  const [selectedJurnalId, setSelectedJurnalId] = useState<string>(
    sortedJurnal[0]?.jurnalId || ''
  );
  const [searchSantriInput, setSearchSantriInput] = useState('');

  const availableJurnals = useMemo(() => {
    if (filterKelasInput === 'ALL') return sortedJurnal;
    return sortedJurnal.filter((j) => j.kelasId === filterKelasInput);
  }, [sortedJurnal, filterKelasInput]);

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

  const [draftMap, setDraftMap] = useState<
    Record<string, { status: StatusKehadiran; keterangan: string }>
  >({});

  useEffect(() => {
    if (!currentJurnal) return;
    const map: Record<string, { status: StatusKehadiran; keterangan: string }> = {};
    for (const s of classSantri) {
      const existing = db.absensi.find(
        (a) => a.jurnalId === currentJurnal.jurnalId && a.santriId === s.santriId
      );
      map[s.santriId] = {
        status: existing?.statusKehadiran || 'Hadir',
        keterangan: existing?.keterangan || '',
      };
    }
    setDraftMap(map);
  }, [currentJurnal, classSantri, db.absensi]);

  const handleMarkAllHadir = () => {
    const next: Record<string, { status: StatusKehadiran; keterangan: string }> = {};
    for (const s of classSantri) {
      next[s.santriId] = {
        status: 'Hadir',
        keterangan: draftMap[s.santriId]?.keterangan || 'Hadir tepat waktu',
      };
    }
    setDraftMap(next);
  };

  const handleSaveAbsensi = async () => {
    if (!currentJurnal) return;
    const now = new Date().toISOString();
    const records: Absensi[] = classSantri.map((s) => ({
      absensiId: `ABS-${currentJurnal.jurnalId}-${s.santriId}`,
      jurnalId: currentJurnal.jurnalId,
      tanggal: currentJurnal.tanggal,
      santriId: s.santriId,
      memberId: s.memberId,
      namaSantri: s.namaLengkap,
      kelasId: currentJurnal.kelasId,
      statusKehadiran: draftMap[s.santriId]?.status || 'Hadir',
      keterangan: draftMap[s.santriId]?.keterangan || '',
      createdAt: now,
      updatedAt: now,
      isDemo: currentJurnal.isDemo,
    }));
    await saveAbsensiBatch(currentJurnal.jurnalId, records);
  };

  const filteredClassSantri = useMemo(() => {
    const q = searchSantriInput.trim().toLowerCase();
    if (!q) return classSantri;
    return classSantri.filter(
      (s) =>
        s.namaLengkap.toLowerCase().includes(q) || s.memberId.toLowerCase().includes(q)
    );
  }, [classSantri, searchSantriInput]);

  // Tab 2: Rekap Absensi Filters
  const [rekapMode, setRekapMode] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'RANGE'>('MONTH');
  const [rekapMonth, setRekapMonth] = useState('2026-11');
  const [rekapStart, setRekapStart] = useState('2026-10-01');
  const [rekapEnd, setRekapEnd] = useState('2026-11-30');
  const [rekapKelas, setRekapKelas] = useState('ALL');
  const [rekapSearchSantri, setRekapSearchSantri] = useState('');

  const rekapJurnals = useMemo(() => {
    return visibleJurnal.filter((j) => {
      if (rekapKelas !== 'ALL' && j.kelasId !== rekapKelas) return false;
      if (rekapMode === 'TODAY') return j.tanggal === '2026-11-17';
      if (rekapMode === 'WEEK') return j.tanggal >= '2026-11-08' && j.tanggal <= '2026-11-17';
      if (rekapMode === 'MONTH') return j.tanggal.startsWith(rekapMonth);
      if (rekapMode === 'RANGE') return j.tanggal >= rekapStart && j.tanggal <= rekapEnd;
      return true;
    });
  }, [visibleJurnal, rekapKelas, rekapMode, rekapMonth, rekapStart, rekapEnd]);

  const rekapRows = useMemo(() => {
    const santriPool = visibleSantri.filter((s) => {
      if (rekapKelas !== 'ALL' && s.kelasId !== rekapKelas) return false;
      const q = rekapSearchSantri.trim().toLowerCase();
      if (
        q &&
        !s.namaLengkap.toLowerCase().includes(q) &&
        !s.memberId.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return santriPool.map((s) => {
      const summary = calculateStudentAttendanceSummary(s, rekapJurnals, db.absensi);
      return {
        santri: s,
        summary,
      };
    });
  }, [visibleSantri, rekapKelas, rekapSearchSantri, rekapJurnals, db.absensi]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Modul Absensi Santri
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Pencatatan kehadiran cepat per pertemuan dan rekapitulasi persentase kehadiran otomatis
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] self-start">
          <button
            type="button"
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'input'
                ? 'bg-[#19432D] text-white'
                : 'text-[#26332A] dark:text-[#ECF3EE]'
            }`}
          >
            Form Absensi Pertemuan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'rekap'
                ? 'bg-[#19432D] text-white'
                : 'text-[#26332A] dark:text-[#ECF3EE]'
            }`}
          >
            Rekapitulasi Absensi
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: FORM INPUT ABSENSI ==================== */}
      {activeTab === 'input' && (
        <div className="space-y-6">
          {/* Selector Card */}
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold mb-1.5">Filter Kelas</label>
              <select
                value={filterKelasInput}
                onChange={(e) => setFilterKelasInput(e.target.value)}
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

            <div className="md:col-span-6">
              <label className="block text-xs font-semibold mb-1.5">
                Pilih Jurnal Pertemuan Pembelajaran
              </label>
              <select
                value={selectedJurnalId}
                onChange={(e) => setSelectedJurnalId(e.target.value)}
                aria-label="Pilih Jurnal Pertemuan"
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              >
                {availableJurnals.map((j) => (
                  <option key={j.jurnalId} value={j.jurnalId}>
                    {formatDateShortId(j.tanggal)} — {j.namaKelas} (Pertemuan ke-{j.pertemuanKe}: {j.materiPembelajaran})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 relative">
              <label className="block text-xs font-semibold mb-1.5">Cari Santri</label>
              <Search className="w-3.5 h-3.5 text-[#6B776D] absolute left-3 bottom-2.5" />
              <input
                type="text"
                value={searchSantriInput}
                onChange={(e) => setSearchSantriInput(e.target.value)}
                placeholder="Nama atau ID Member..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
          </div>

          {currentJurnal ? (
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E3EAE3] dark:border-[#24382C]">
                <div>
                  <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                    {currentJurnal.nomorJurnal} · {formatDateLongId(currentJurnal.tanggal)} · {currentJurnal.namaKelas}
                  </p>
                  <h2 className="text-lg font-bold mt-0.5">{currentJurnal.materiPembelajaran}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllHadir}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#3B7551] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tandai Semua Santri Hadir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/print/absensi/${currentJurnal.jurnalId}`)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Daftar Absensi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbsensi}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Absensi</span>
                  </button>
                </div>
              </div>

              {/* Mobile Card View for HP (Touch-Friendly Status Buttons) */}
              <div className="md:hidden space-y-3">
                {filteredClassSantri.map((s, idx) => {
                  const status = draftMap[s.santriId]?.status || 'Hadir';
                  return (
                    <div
                      key={s.santriId}
                      className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                            #{idx + 1} · {s.memberId}
                          </span>
                          <p className="text-sm font-bold text-[#26332A] dark:text-[#ECF3EE]">
                            {s.namaLengkap}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#19432D]/10 text-[#19432D] dark:bg-[#A3D1B3]/15 dark:text-[#A3D1B3]">
                          {status}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as StatusKehadiran[]).map((st) => {
                          const active = status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() =>
                                setDraftMap((prev) => ({
                                  ...prev,
                                  [s.santriId]: {
                                    status: st,
                                    keterangan: prev[s.santriId]?.keterangan || '',
                                  },
                                }))
                              }
                              className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                                active
                                  ? st === 'Alpa'
                                    ? 'bg-[#B44238] text-white border-[#B44238]'
                                    : 'bg-[#19432D] text-white border-[#19432D]'
                                  : 'bg-white dark:bg-[#142019] text-[#26332A] dark:text-[#ECF3EE] border-[#E3EAE3] dark:border-[#24382C]'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        value={draftMap[s.santriId]?.keterangan || ''}
                        onChange={(e) =>
                          setDraftMap((prev) => ({
                            ...prev,
                            [s.santriId]: {
                              status: prev[s.santriId]?.status || 'Hadir',
                              keterangan: e.target.value,
                            },
                          }))
                        }
                        placeholder="Catatan kehadiran..."
                        className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C]"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                      <th className="py-3 pr-3">No</th>
                      <th className="py-3 px-3">ID Member</th>
                      <th className="py-3 px-3">Nama Santri</th>
                      <th className="py-3 px-3 text-center">Hadir</th>
                      <th className="py-3 px-3 text-center">Izin</th>
                      <th className="py-3 px-3 text-center">Sakit</th>
                      <th className="py-3 px-3 text-center">Alpa</th>
                      <th className="py-3 pl-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                    {filteredClassSantri.map((s, idx) => {
                      const status = draftMap[s.santriId]?.status || 'Hadir';
                      return (
                        <tr key={s.santriId} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                          <td className="py-3 pr-3 font-mono text-xs tabular-nums">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-xs">{s.memberId}</td>
                          <td className="py-3 px-3 font-semibold">{s.namaLengkap}</td>
                          {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as StatusKehadiran[]).map((st) => (
                            <td key={st} className="py-3 px-3 text-center">
                              <input
                                type="radio"
                                name={`abs-row-${s.santriId}`}
                                checked={status === st}
                                onChange={() =>
                                  setDraftMap((prev) => ({
                                    ...prev,
                                    [s.santriId]: {
                                      status: st,
                                      keterangan: prev[s.santriId]?.keterangan || '',
                                    },
                                  }))
                                }
                                aria-label={`Status ${st} untuk ${s.namaLengkap}`}
                                className="w-4 h-4 accent-[#19432D] cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="py-3 pl-3">
                            <input
                              type="text"
                              value={draftMap[s.santriId]?.keterangan || ''}
                              onChange={(e) =>
                                setDraftMap((prev) => ({
                                  ...prev,
                                  [s.santriId]: {
                                    status: prev[s.santriId]?.status || 'Hadir',
                                    keterangan: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Catatan kehadiran..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-12 text-center text-sm text-[#6B776D]">
              Pilih jurnal pertemuan terlebih dahulu untuk mengisi daftar hadir.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: REKAP ABSENSI SANTRI ==================== */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          <div className="no-print rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'TODAY', label: 'Hari Ini' },
                  { id: 'WEEK', label: 'Mingguan' },
                  { id: 'MONTH', label: 'Bulanan' },
                  { id: 'RANGE', label: 'Rentang Tanggal' },
                  { id: 'ALL', label: 'Semua Pertemuan' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRekapMode(m.id as typeof rekapMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      rekapMode === m.id
                        ? 'bg-[#19432D] text-white'
                        : 'bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Rekap Absensi</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E3EAE3] dark:border-[#24382C]">
              {rekapMode === 'MONTH' && (
                <select
                  value={rekapMonth}
                  onChange={(e) => setRekapMonth(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  <option value="2026-11">November 2026</option>
                  <option value="2026-10">Oktober 2026</option>
                  <option value="2026-09">September 2026</option>
                </select>
              )}
              {rekapMode === 'RANGE' && (
                <>
                  <input
                    type="date"
                    value={rekapStart}
                    onChange={(e) => setRekapStart(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                  <input
                    type="date"
                    value={rekapEnd}
                    onChange={(e) => setRekapEnd(e.target.value)}
                    className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </>
              )}
              <select
                value={rekapKelas}
                onChange={(e) => setRekapKelas(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              >
                <option value="ALL">Semua Kelas</option>
                {visibleKelas.map((k) => (
                  <option key={k.kelasId} value={k.kelasId}>
                    {k.namaKelas}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rekapSearchSantri}
                  onChange={(e) => setRekapSearchSantri(e.target.value)}
                  placeholder="Cari nama santri..."
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRekapMode('MONTH');
                    setRekapMonth('2026-11');
                    setRekapKelas('ALL');
                    setRekapSearchSantri('');
                  }}
                  aria-label="Reset Filter Rekap Absensi"
                  className="p-2 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22]"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="print-container rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold">
                Tabel Rekapitulasi Kehadiran Santri
              </h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                Persentase kehadiran dihitung dari pertemuan yang menjadi kewajiban santri sejak tanggal bergabung.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                    <th className="py-3 pr-3">ID Member</th>
                    <th className="py-3 px-3">Santri</th>
                    <th className="py-3 px-3">Kelas &amp; Tgl Gabung</th>
                    <th className="py-3 px-3 text-right">Hadir</th>
                    <th className="py-3 px-3 text-right">Izin</th>
                    <th className="py-3 px-3 text-right">Sakit</th>
                    <th className="py-3 px-3 text-right">Alpa</th>
                    <th className="py-3 pl-3 text-right">Persentase Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                  {rekapRows.map(({ santri, summary }) => (
                    <tr key={santri.santriId}>
                      <td className="py-3 pr-3 font-mono text-xs">{santri.memberId}</td>
                      <td className="py-3 px-3 font-semibold">{santri.namaLengkap}</td>
                      <td className="py-3 px-3 text-xs text-[#6B776D] dark:text-[#A3D1B3]">
                        {santri.namaKelas} · Sejak {formatDateShortId(santri.tanggalBergabung)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-[#3B7551] dark:text-[#A3D1B3]">
                        {summary.hadir}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {summary.izin}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {summary.sakit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#B44238]">
                        {summary.alpa}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-bold tabular-nums text-[#19432D] dark:text-[#ECF3EE]">
                        {summary.persentaseKehadiran.toString().replace('.', ',')}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
