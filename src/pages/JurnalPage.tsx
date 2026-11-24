import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  RotateCcw,
  Eye,
  Edit3,
  Trash2,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  Absensi,
  JurnalPembelajaran,
  Penilaian,
  StatusJurnal,
  StatusKehadiran,
} from '../types';
import {
  calculateSessionFinalScore,
  formatDateLongId,
  formatDateShortId,
  generateNomorJurnal,
  getGradePredicate,
  getIndonesianDayName,
  validateScoreInput,
} from '../utils/academicRules';

interface JurnalPageProps {
  modeFromRoute?: 'list' | 'add' | 'detail';
  jurnalIdFromRoute?: string;
}

export const JurnalPage: React.FC<JurnalPageProps> = ({
  modeFromRoute = 'list',
  jurnalIdFromRoute,
}) => {
  const {
    db,
    currentUser,
    visibleJurnal,
    visibleKelas,
    saveJurnal,
    deleteJurnal,
    saveAbsensiBatch,
    savePenilaianBatch,
    askConfirm,
    closeConfirm,
    navigate,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>(
    modeFromRoute === 'add' ? 'form' : modeFromRoute === 'detail' ? 'detail' : 'list'
  );
  const [selectedJurnalId, setSelectedJurnalId] = useState<string | null>(
    jurnalIdFromRoute || null
  );

  useEffect(() => {
    if (modeFromRoute === 'add') {
      openCreateForm();
    } else if (modeFromRoute === 'detail' && jurnalIdFromRoute) {
      setSelectedJurnalId(jurnalIdFromRoute);
      setViewMode('detail');
    } else {
      setViewMode('list');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeFromRoute, jurnalIdFromRoute]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('');
  const [filterBulan, setFilterBulan] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterGuru, setFilterGuru] = useState('ALL');

  // Form state (13 fields from PRD Section 9.A)
  const [editingJurnal, setEditingJurnal] = useState<JurnalPembelajaran | null>(null);
  const [formNomor, setFormNomor] = useState('');
  const [formTanggal, setFormTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [formKelasId, setFormKelasId] = useState('');
  const [formPertemuanKe, setFormPertemuanKe] = useState(1);
  const [formMateri, setFormMateri] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formRingkasan, setFormRingkasan] = useState('');
  const [formCatatanGuru, setFormCatatanGuru] = useState('');
  const [formStatus, setFormStatus] = useState<StatusJurnal>('Selesai');

  // Detail Integrated Tabs: 'ringkasan' | 'absensi' | 'penilaian'
  const [detailTab, setDetailTab] = useState<'ringkasan' | 'absensi' | 'penilaian'>('ringkasan');

  // Detail Attendance Draft State
  const [draftAbsensi, setDraftAbsensi] = useState<
    Record<string, { status: StatusKehadiran; keterangan: string }>
  >({});

  // Detail Assessment Draft State
  const [draftNilai, setDraftNilai] = useState<Record<string, Record<string, string>>>({});
  const [draftCatatanNilai, setDraftCatatanNilai] = useState<Record<string, string>>({});

  const openCreateForm = () => {
    const defaultKelas = visibleKelas[0] || db.kelas[0];
    const tgl = new Date().toISOString().slice(0, 10);
    const nextNo = generateNomorJurnal(tgl, db.jurnal);
    const classJurnals = db.jurnal.filter((j) => j.kelasId === defaultKelas?.kelasId);
    setEditingJurnal(null);
    setFormNomor(nextNo);
    setFormTanggal(tgl);
    setFormKelasId(defaultKelas?.kelasId || '');
    setFormPertemuanKe(classJurnals.length + 1);
    setFormMateri('');
    setFormTarget('');
    setFormRingkasan('');
    setFormCatatanGuru('');
    setFormStatus('Selesai');
    setViewMode('form');
  };

  const openEditForm = (j: JurnalPembelajaran) => {
    setEditingJurnal(j);
    setFormNomor(j.nomorJurnal);
    setFormTanggal(j.tanggal);
    setFormKelasId(j.kelasId);
    setFormPertemuanKe(j.pertemuanKe);
    setFormMateri(j.materiPembelajaran);
    setFormTarget(j.targetPembelajaran);
    setFormRingkasan(j.ringkasanKegiatan);
    setFormCatatanGuru(j.catatanGuru);
    setFormStatus(j.statusJurnal);
    setViewMode('form');
  };

  const handleTanggalChange = (newDate: string) => {
    setFormTanggal(newDate);
    if (!editingJurnal) {
      setFormNomor(generateNomorJurnal(newDate, db.jurnal));
    }
  };

  const handleKelasChange = (newKelasId: string) => {
    setFormKelasId(newKelasId);
    if (!editingJurnal) {
      const count = db.jurnal.filter((j) => j.kelasId === newKelasId).length;
      setFormPertemuanKe(count + 1);
    }
  };

  const handleSaveJurnalForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKelasId || !formTanggal || !formMateri.trim()) {
      showToast('warning', 'Form Belum Lengkap', 'Tanggal, Kelas, dan Materi Pembelajaran wajib diisi.');
      return;
    }

    const selectedClass = db.kelas.find((k) => k.kelasId === formKelasId);
    if (!selectedClass) return;

    const now = new Date().toISOString();
    const record: JurnalPembelajaran = {
      jurnalId: editingJurnal ? editingJurnal.jurnalId : 'JRN-' + Date.now(),
      nomorJurnal: formNomor,
      tanggal: formTanggal,
      hari: getIndonesianDayName(formTanggal),
      kelasId: selectedClass.kelasId,
      namaKelas: selectedClass.namaKelas,
      programKhot: selectedClass.programKhot,
      metodePembelajaran: selectedClass.metodePembelajaran,
      guruId: selectedClass.guruId,
      namaGuru: selectedClass.namaGuru,
      pertemuanKe: Number(formPertemuanKe) || 1,
      materiPembelajaran: formMateri.trim(),
      targetPembelajaran: formTarget.trim(),
      ringkasanKegiatan: formRingkasan.trim(),
      catatanGuru: formCatatanGuru.trim(),
      statusJurnal: formStatus,
      createdAt: editingJurnal ? editingJurnal.createdAt : now,
      createdBy: editingJurnal ? editingJurnal.createdBy : currentUser?.namaLengkap || 'Guru',
      updatedAt: now,
      updatedBy: currentUser?.namaLengkap || 'Guru',
      isDemo: editingJurnal ? editingJurnal.isDemo : false,
    };

    const ok = await saveJurnal(record, !editingJurnal);
    if (ok) {
      setSelectedJurnalId(record.jurnalId);
      navigate(`${rolePrefix}/jurnal/${record.jurnalId}`);
    }
  };

  const handleDeleteJurnal = (j: JurnalPembelajaran) => {
    askConfirm({
      title: `Hapus Jurnal ${j.nomorJurnal}?`,
      message: `Jurnal pertemuan "${j.materiPembelajaran}" beserta absensi dan penilaian terkait pada pertemuan ini akan dihapus. Lanjutkan?`,
      confirmLabel: 'Ya, Hapus Jurnal',
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        await deleteJurnal(j.jurnalId);
        navigate(`${rolePrefix}/jurnal`);
      },
    });
  };

  const filteredJurnal = useMemo(() => {
    return visibleJurnal
      .filter((j) => {
        const q = searchQuery.trim().toLowerCase();
        if (
          q &&
          !j.materiPembelajaran.toLowerCase().includes(q) &&
          !j.nomorJurnal.toLowerCase().includes(q) &&
          !j.namaKelas.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (filterTanggal && j.tanggal !== filterTanggal) return false;
        if (filterBulan !== 'ALL' && !j.tanggal.startsWith(filterBulan)) return false;
        if (filterKelas !== 'ALL' && j.kelasId !== filterKelas) return false;
        if (filterGuru !== 'ALL' && j.namaGuru !== filterGuru) return false;
        return true;
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [visibleJurnal, searchQuery, filterTanggal, filterBulan, filterKelas, filterGuru]);

  const activeJurnal = useMemo(
    () => db.jurnal.find((j) => j.jurnalId === selectedJurnalId),
    [db.jurnal, selectedJurnalId]
  );

  // Sync draft attendance & scores when activeJurnal changes
  useEffect(() => {
    if (!activeJurnal) return;
    const classSantri = db.santri.filter((s) => s.kelasId === activeJurnal.kelasId);
    const attMap: Record<string, { status: StatusKehadiran; keterangan: string }> = {};
    for (const s of classSantri) {
      const existing = db.absensi.find(
        (a) => a.jurnalId === activeJurnal.jurnalId && a.santriId === s.santriId
      );
      attMap[s.santriId] = {
        status: existing?.statusKehadiran || 'Hadir',
        keterangan: existing?.keterangan || '',
      };
    }
    setDraftAbsensi(attMap);

    const activeRubriks = db.rubrik
      .filter((r) => r.programKhot === activeJurnal.programKhot && r.statusAktif)
      .sort((a, b) => a.urutan - b.urutan);

    const nilaiMap: Record<string, Record<string, string>> = {};
    const catatanMap: Record<string, string> = {};
    for (const s of classSantri) {
      nilaiMap[s.santriId] = {};
      for (const r of activeRubriks) {
        const existingP = db.penilaian.find(
          (p) =>
            p.jurnalId === activeJurnal.jurnalId &&
            p.santriId === s.santriId &&
            p.aspekId === r.aspekId
        );
        nilaiMap[s.santriId][r.aspekId] =
          existingP && existingP.nilai !== null && existingP.nilai !== undefined
            ? String(existingP.nilai)
            : '';
        if (existingP?.catatanPenilaian && !catatanMap[s.santriId]) {
          catatanMap[s.santriId] = existingP.catatanPenilaian;
        }
      }
    }
    setDraftNilai(nilaiMap);
    setDraftCatatanNilai(catatanMap);
  }, [activeJurnal, db.absensi, db.penilaian, db.rubrik, db.santri]);

  // ==================== FORM TAMBAH / EDIT JURNAL VIEW ====================
  if (viewMode === 'form') {
    const selectedClassObj = db.kelas.find((k) => k.kelasId === formKelasId);
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`${rolePrefix}/jurnal`)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Jurnal</span>
          </button>
        </div>

        <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 sm:p-8">
          <h1 className="text-xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            {editingJurnal ? `Edit Jurnal ${editingJurnal.nomorJurnal}` : 'Form Tambah Jurnal Pembelajaran Baru'}
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-1">
            Nomor jurnal, hari, program khot, metode, dan pengajar terisi otomatis berdasarkan kelas dan tanggal.
          </p>

          <form onSubmit={handleSaveJurnalForm} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">1. Nomor Jurnal (Otomatis)</label>
                <input
                  type="text"
                  value={formNomor}
                  readOnly
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">2. Tanggal Pertemuan</label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => handleTanggalChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">3. Hari</label>
                <input
                  type="text"
                  value={getIndonesianDayName(formTanggal)}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">4. Kelas / Kelompok</label>
                <select
                  value={formKelasId}
                  onChange={(e) => handleKelasChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  {visibleKelas.map((k) => (
                    <option key={k.kelasId} value={k.kelasId}>
                      {k.namaKelas}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">8. Pertemuan Ke-</label>
                <input
                  type="number"
                  min={1}
                  value={formPertemuanKe}
                  onChange={(e) => setFormPertemuanKe(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
            </div>

            {/* Read-only auto fields 5, 6, 7 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-xs">
              <div>
                <span className="text-[#6B776D] dark:text-[#A3D1B3] block">5. Program Khot</span>
                <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">
                  {selectedClassObj?.programKhot || '-'}
                </span>
              </div>
              <div>
                <span className="text-[#6B776D] dark:text-[#A3D1B3] block">6. Nama Guru</span>
                <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">
                  {selectedClassObj?.namaGuru || '-'}
                </span>
              </div>
              <div>
                <span className="text-[#6B776D] dark:text-[#A3D1B3] block">7. Metode Pembelajaran</span>
                <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">
                  {selectedClassObj?.metodePembelajaran || '-'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">9. Materi Pembelajaran</label>
              <input
                type="text"
                value={formMateri}
                onChange={(e) => setFormMateri(e.target.value)}
                placeholder="Contoh: Huruf Mufradat Sin, Syin, Shad & Kaidah Gigi Tiga"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">10. Target Pembelajaran</label>
              <textarea
                rows={2}
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="Target kompetensi kaligrafi yang harus dicapai santri pada pertemuan ini..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">11. Ringkasan Kegiatan</label>
              <textarea
                rows={2}
                value={formRingkasan}
                onChange={(e) => setFormRingkasan(e.target.value)}
                placeholder="Ringkasan jalannya demonstrasi qalam, latihan kurrasah, dan tashih..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">12. Catatan Guru</label>
                <input
                  type="text"
                  value={formCatatanGuru}
                  onChange={(e) => setFormCatatanGuru(e.target.value)}
                  placeholder="Evaluasi umum pertemuan..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">13. Status Jurnal</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as StatusJurnal)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  <option value="Selesai">Selesai</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`${rolePrefix}/jurnal`)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white"
              >
                Simpan Jurnal &amp; Lanjut ke Absensi/Nilai
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== DETAIL JURNAL VIEW (INTEGRATED WITH ABSENSI & PENILAIAN) ====================
  if (viewMode === 'detail' && activeJurnal) {
    const classSantri = db.santri.filter((s) => s.kelasId === activeJurnal.kelasId);
    const activeRubriks = db.rubrik
      .filter((r) => r.programKhot === activeJurnal.programKhot && r.statusAktif)
      .sort((a, b) => a.urutan - b.urutan);

    const handleMarkAllHadir = () => {
      const next: Record<string, { status: StatusKehadiran; keterangan: string }> = {};
      for (const s of classSantri) {
        next[s.santriId] = {
          status: 'Hadir',
          keterangan: draftAbsensi[s.santriId]?.keterangan || 'Hadir tepat waktu',
        };
      }
      setDraftAbsensi(next);
    };

    const handleSaveDetailAbsensi = async (goToPenilaian = false) => {
      const now = new Date().toISOString();
      const records: Absensi[] = classSantri.map((s) => ({
        absensiId: `ABS-${activeJurnal.jurnalId}-${s.santriId}`,
        jurnalId: activeJurnal.jurnalId,
        tanggal: activeJurnal.tanggal,
        santriId: s.santriId,
        memberId: s.memberId,
        namaSantri: s.namaLengkap,
        kelasId: activeJurnal.kelasId,
        statusKehadiran: draftAbsensi[s.santriId]?.status || 'Hadir',
        keterangan: draftAbsensi[s.santriId]?.keterangan || '',
        createdAt: now,
        updatedAt: now,
        isDemo: activeJurnal.isDemo,
      }));
      const ok = await saveAbsensiBatch(activeJurnal.jurnalId, records);
      if (ok && goToPenilaian) {
        setDetailTab('penilaian');
      }
    };

    const handleSaveDetailPenilaian = async (goToRekap = false) => {
      const now = new Date().toISOString();
      const records: Penilaian[] = [];
      for (const s of classSantri) {
        for (const r of activeRubriks) {
          const rawVal = draftNilai[s.santriId]?.[r.aspekId] ?? '';
          const numericVal = rawVal.trim() === '' ? null : Number(rawVal);
          const check = validateScoreInput(numericVal);
          if (!check.valid) {
            showToast('error', `Nilai Tidak Valid (${s.namaLengkap})`, check.error);
            return;
          }
          records.push({
            penilaianId: `PNL-${activeJurnal.jurnalId}-${s.santriId}-${r.aspekId}`,
            jurnalId: activeJurnal.jurnalId,
            tanggal: activeJurnal.tanggal,
            santriId: s.santriId,
            memberId: s.memberId,
            aspekId: r.aspekId,
            namaAspek: r.namaAspek,
            nilai: numericVal,
            bobot: r.bobot,
            catatanPenilaian: draftCatatanNilai[s.santriId] || '',
            createdBy: currentUser?.namaLengkap || activeJurnal.namaGuru,
            updatedAt: now,
            updatedBy: currentUser?.namaLengkap || activeJurnal.namaGuru,
            isDemo: activeJurnal.isDemo,
          });
        }
      }
      const ok = await savePenilaianBatch(activeJurnal.jurnalId, records);
      if (ok && goToRekap) {
        navigate(`${rolePrefix}/rekap-nilai`);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedJurnalId(null);
              navigate(`${rolePrefix}/jurnal`);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Jurnal</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditForm(activeJurnal)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Informasi Jurnal</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/print/jurnal/${activeJurnal.jurnalId}`)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white hover:bg-[#315B43] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Jurnal (A4)</span>
            </button>
          </div>
        </div>

        {/* Jurnal Header Card */}
        <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#E3EAE3] dark:border-[#24382C]">
            <div>
              <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                {activeJurnal.nomorJurnal} · {activeJurnal.hari}, {formatDateLongId(activeJurnal.tanggal)} · Pertemuan Ke-{activeJurnal.pertemuanKe} · Status: {activeJurnal.statusJurnal}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE] mt-1">
                {activeJurnal.materiPembelajaran}
              </h1>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/85 mt-1">
                {activeJurnal.namaKelas} · {activeJurnal.programKhot} · Metode {activeJurnal.metodePembelajaran} · Pengajar: {activeJurnal.namaGuru}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
              <p className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">Target Pembelajaran</p>
              <p className="mt-1 text-[#26332A] dark:text-[#ECF3EE] leading-relaxed">
                {activeJurnal.targetPembelajaran || '-'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
              <p className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">Ringkasan Kegiatan</p>
              <p className="mt-1 text-[#26332A] dark:text-[#ECF3EE] leading-relaxed">
                {activeJurnal.ringkasanKegiatan || '-'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
              <p className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">Catatan Evaluasi Guru</p>
              <p className="mt-1 text-[#26332A] dark:text-[#ECF3EE] leading-relaxed">
                {activeJurnal.catatanGuru || '-'}
              </p>
            </div>
          </div>

          {/* Sub-navigation between Ringkasan, Input Absensi, and Input Penilaian */}
          <div className="mt-6 pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDetailTab('ringkasan')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                detailTab === 'ringkasan'
                  ? 'bg-[#19432D] text-white'
                  : 'bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]'
              }`}
            >
              Daftar Santri, Kehadiran &amp; Nilai
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('absensi')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                detailTab === 'absensi'
                  ? 'bg-[#19432D] text-white'
                  : 'bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]'
              }`}
            >
              Form Input Absensi Pertemuan
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('penilaian')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                detailTab === 'penilaian'
                  ? 'bg-[#19432D] text-white'
                  : 'bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]'
              }`}
            >
              Form Penilaian Santri Pertemuan Ini
            </button>
          </div>
        </div>

        {/* Sub-tab 1: Combined Overview */}
        {detailTab === 'ringkasan' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-bold">
                Rekap Kehadiran &amp; Nilai Santri pada Pertemuan Ini ({classSantri.length} Santri)
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailTab('absensi')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3]"
                >
                  Edit Absensi
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('penilaian')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
                >
                  Input / Edit Nilai
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                    <th className="py-3 pr-3">No</th>
                    <th className="py-3 px-3">ID Member</th>
                    <th className="py-3 px-3">Nama Santri</th>
                    <th className="py-3 px-3">Status Kehadiran</th>
                    <th className="py-3 px-3 text-right">Nilai Akhir</th>
                    <th className="py-3 px-3">Predikat</th>
                    <th className="py-3 pl-3">Catatan Perkembangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                  {classSantri.map((s, idx) => {
                    const att = db.absensi.find(
                      (a) => a.jurnalId === activeJurnal.jurnalId && a.santriId === s.santriId
                    );
                    const pItems = db.penilaian.filter(
                      (p) => p.jurnalId === activeJurnal.jurnalId && p.santriId === s.santriId
                    );
                    const finalScore = calculateSessionFinalScore(
                      pItems.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
                    );
                    const predikat = getGradePredicate(finalScore, db.pengaturan.batasPredikat);
                    return (
                      <tr key={s.santriId}>
                        <td className="py-3 pr-3 font-mono text-xs tabular-nums">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono text-xs">{s.memberId}</td>
                        <td className="py-3 px-3 font-semibold">{s.namaLengkap}</td>
                        <td className="py-3 px-3 text-xs font-semibold">
                          {att?.statusKehadiran || 'Belum Dicatat'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                          {finalScore !== null ? finalScore : 'Belum Dinilai'}
                        </td>
                        <td className="py-3 px-3 text-xs font-semibold">{predikat}</td>
                        <td className="py-3 pl-3 text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                          {pItems[0]?.catatanPenilaian || att?.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Direct Inline Form Absensi */}
        {detailTab === 'absensi' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold">Form Daftar Hadir Pertemuan</h2>
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                  Pilih status kehadiran setiap santri atau klik Tandai Semua Hadir
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllHadir}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#3B7551] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Tandai Semua Hadir</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDetailAbsensi(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Simpan Absensi</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDetailAbsensi(true)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Simpan &amp; Lanjut ke Penilaian</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
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
                  {classSantri.map((s, idx) => {
                    const currentStatus = draftAbsensi[s.santriId]?.status || 'Hadir';
                    return (
                      <tr key={s.santriId}>
                        <td className="py-3 pr-3 font-mono text-xs tabular-nums">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono text-xs">{s.memberId}</td>
                        <td className="py-3 px-3 font-semibold">{s.namaLengkap}</td>
                        {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as StatusKehadiran[]).map((st) => (
                          <td key={st} className="py-3 px-3 text-center">
                            <input
                              type="radio"
                              name={`att-${s.santriId}`}
                              checked={currentStatus === st}
                              onChange={() =>
                                setDraftAbsensi((prev) => ({
                                  ...prev,
                                  [s.santriId]: {
                                    status: st,
                                    keterangan: prev[s.santriId]?.keterangan || '',
                                  },
                                }))
                              }
                              aria-label={`${s.namaLengkap} ${st}`}
                              className="w-4 h-4 accent-[#19432D] cursor-pointer"
                            />
                          </td>
                        ))}
                        <td className="py-3 pl-3">
                          <input
                            type="text"
                            value={draftAbsensi[s.santriId]?.keterangan || ''}
                            onChange={(e) =>
                              setDraftAbsensi((prev) => ({
                                ...prev,
                                [s.santriId]: {
                                  status: prev[s.santriId]?.status || 'Hadir',
                                  keterangan: e.target.value,
                                },
                              }))
                            }
                            placeholder="Catatan kehadiran..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sub-tab 3: Direct Inline Form Penilaian */}
        {detailTab === 'penilaian' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold">
                  Penilaian Kemampuan Menulis Khot ({activeJurnal.programKhot})
                </h2>
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">
                  Skala 0–100. Kosongkan kolom apabila santri belum dinilai (tidak dianggap 0).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveDetailPenilaian(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Simpan Nilai Pertemuan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDetailPenilaian(true)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>Simpan &amp; Buka Rekap Nilai</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                    <th className="py-3 pr-2">No</th>
                    <th className="py-3 px-2">Nama Santri</th>
                    {activeRubriks.map((r) => (
                      <th key={r.aspekId} className="py-3 px-2 text-center min-w-[95px]">
                        <span className="block text-[#26332A] dark:text-[#ECF3EE]">{r.namaAspek}</span>
                        <span className="font-mono text-[10px] text-[#6B776D] dark:text-[#A3D1B3]">
                          Bobot {r.bobot}%
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-2 text-right">Nilai Akhir</th>
                    <th className="py-3 pl-2 min-w-[180px]">Catatan Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                  {classSantri.map((s, idx) => {
                    const rowScores = activeRubriks.map((r) => {
                      const raw = draftNilai[s.santriId]?.[r.aspekId] ?? '';
                      return {
                        nilai: raw.trim() === '' ? null : Number(raw),
                        bobot: r.bobot,
                      };
                    });
                    const calcFinal = calculateSessionFinalScore(rowScores);
                    return (
                      <tr key={s.santriId}>
                        <td className="py-3 pr-2 font-mono tabular-nums">{idx + 1}</td>
                        <td className="py-3 px-2 font-semibold text-sm whitespace-nowrap">
                          {s.namaLengkap}
                        </td>
                        {activeRubriks.map((r) => (
                          <td key={r.aspekId} className="py-3 px-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={draftNilai[s.santriId]?.[r.aspekId] ?? ''}
                              onChange={(e) =>
                                setDraftNilai((prev) => ({
                                  ...prev,
                                  [s.santriId]: {
                                    ...(prev[s.santriId] || {}),
                                    [r.aspekId]: e.target.value,
                                  },
                                }))
                              }
                              placeholder="-"
                              aria-label={`Nilai ${r.namaAspek} ${s.namaLengkap}`}
                              className="w-16 px-2 py-1.5 text-center font-mono tabular-nums rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                            />
                          </td>
                        ))}
                        <td className="py-3 px-2 text-right font-mono text-sm font-bold tabular-nums text-[#19432D] dark:text-[#A3D1B3]">
                          {calcFinal !== null ? calcFinal : 'Belum Dinilai'}
                        </td>
                        <td className="py-3 pl-2">
                          <input
                            type="text"
                            value={draftCatatanNilai[s.santriId] || ''}
                            onChange={(e) =>
                              setDraftCatatanNilai((prev) => ({
                                ...prev,
                                [s.santriId]: e.target.value,
                              }))
                            }
                            placeholder="Catatan perkembangan..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== DAFTAR JURNAL PEMBELAJARAN LIST VIEW ====================
  const uniqueGurus = Array.from(new Set(db.jurnal.map((j) => j.namaGuru)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Jurnal Pembelajaran Khot
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Catatan kegiatan setiap pertemuan pembelajaran yang terhubung langsung dengan absensi dan penilaian santri
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${rolePrefix}/jurnal/add`)}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jurnal Pertemuan</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-[#6B776D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari materi atau nomor jurnal..."
            aria-label="Cari materi atau nomor jurnal"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
        </div>

        <input
          type="date"
          value={filterTanggal}
          onChange={(e) => setFilterTanggal(e.target.value)}
          aria-label="Filter Tanggal"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        />

        <select
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
          aria-label="Filter Bulan"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Bulan</option>
          <option value="2026-11">November 2026</option>
          <option value="2026-10">Oktober 2026</option>
          <option value="2026-09">September 2026</option>
        </select>

        <select
          value={filterKelas}
          onChange={(e) => setFilterKelas(e.target.value)}
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

        <div className="flex items-center gap-2">
          <select
            value={filterGuru}
            onChange={(e) => setFilterGuru(e.target.value)}
            aria-label="Filter Guru"
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            <option value="ALL">Semua Guru</option>
            {uniqueGurus.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterTanggal('');
              setFilterBulan('ALL');
              setFilterKelas('ALL');
              setFilterGuru('ALL');
            }}
            aria-label="Reset Filter Jurnal"
            className="p-2 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#6B776D]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daftar Jurnal List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] overflow-hidden">
        {/* Mobile Card View for HP */}
        <div className="md:hidden divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
          {filteredJurnal.length > 0 ? (
            filteredJurnal.map((j) => (
              <div key={j.jurnalId} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                    {j.nomorJurnal} · {j.hari}, {formatDateShortId(j.tanggal)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3]">
                    Ke-{j.pertemuanKe} · {j.statusJurnal}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#26332A] dark:text-[#ECF3EE]">
                    {j.materiPembelajaran}
                  </p>
                  <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                    {j.namaKelas} ({j.programKhot}) · {j.namaGuru}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJurnalId(j.jurnalId);
                      navigate(`${rolePrefix}/jurnal/${j.jurnalId}`);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#19432D] text-white flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Buka Detail / Absensi / Nilai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(j)}
                    className="p-1.5 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/print/jurnal/${j.jurnalId}`)}
                    className="p-1.5 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-[#6B776D]">
              Belum ada jurnal pertemuan yang cocok dengan pencarian.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#F3F7F2]/60 dark:bg-[#1B2B22]/60 text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                <th className="py-3.5 pl-6 pr-3">No</th>
                <th className="py-3.5 px-3">Tanggal</th>
                <th className="py-3.5 px-3">Pertemuan</th>
                <th className="py-3.5 px-3">Kelas</th>
                <th className="py-3.5 px-3">Materi Pembelajaran</th>
                <th className="py-3.5 px-3">Guru</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C] text-sm">
              {filteredJurnal.length > 0 ? (
                filteredJurnal.map((j, index) => (
                  <tr
                    key={j.jurnalId}
                    className="hover:bg-[#F3F7F2]/50 dark:hover:bg-[#1B2B22]/50 transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-3 font-mono text-xs tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">
                        {formatDateShortId(j.tanggal)}
                      </span>
                      <span className="block text-[#6B776D] dark:text-[#A3D1B3]/80 font-sans">
                        {j.hari} · {j.nomorJurnal}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold whitespace-nowrap">
                      Pertemuan Ke-{j.pertemuanKe}
                      <span className="block font-normal text-[#6B776D] dark:text-[#A3D1B3]/80">
                        Status: {j.statusJurnal}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE] block">
                        {j.namaKelas}
                      </span>
                      <span className="text-[#6B776D] dark:text-[#A3D1B3]/80">
                        {j.programKhot} · {j.metodePembelajaran}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs max-w-xs">
                      <p className="font-semibold text-[#26332A] dark:text-[#ECF3EE] line-clamp-2">
                        {j.materiPembelajaran}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[#6B776D] dark:text-[#A3D1B3]">
                      {j.namaGuru}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJurnalId(j.jurnalId);
                            navigate(`${rolePrefix}/jurnal/${j.jurnalId}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#19432D] text-white hover:bg-[#315B43] flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(j)}
                          aria-label={`Edit Jurnal ${j.nomorJurnal}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/print/jurnal/${j.jurnalId}`)}
                          aria-label={`Cetak Jurnal ${j.nomorJurnal}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteJurnal(j)}
                            aria-label={`Hapus Jurnal ${j.nomorJurnal}`}
                            className="p-1.5 rounded-lg text-[#B44238] hover:bg-[#B44238]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#6B776D]">
                    Belum ada jurnal pertemuan yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
