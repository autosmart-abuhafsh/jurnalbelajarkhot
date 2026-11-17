import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Download,
  Upload,
  RotateCcw,
  ArrowLeft,
  Printer,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CatatanPerkembangan,
  MetodePembelajaran,
  Santri,
  StatusKeanggotaan,
} from '../types';
import {
  calculateMonthlyAverageScore,
  calculateSessionFinalScore,
  calculateStudentAttendanceSummary,
  formatDateLongId,
  formatDateShortId,
  getGradePredicate,
} from '../utils/academicRules';

interface SantriPageProps {
  selectedSantriIdFromRoute?: string;
}

export const SantriPage: React.FC<SantriPageProps> = ({ selectedSantriIdFromRoute }) => {
  const {
    db,
    currentUser,
    visibleSantri,
    visibleKelas,
    saveSantri,
    deleteSantri,
    importSantriBatch,
    saveCatatanPerkembangan,
    deleteCatatanPerkembangan,
    askConfirm,
    closeConfirm,
    navigate,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterProgram, setFilterProgram] = useState('ALL');
  const [filterMetode, setFilterMetode] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Detail view state (either from route /admin/santri/:id or local selection)
  const [localDetailId, setLocalDetailId] = useState<string | null>(null);
  const activeDetailId = selectedSantriIdFromRoute || localDetailId;

  // Detail active tab (7 tabs from PRD Section 16)
  const [detailTab, setDetailTab] = useState<
    'info' | 'jurnal' | 'absensi' | 'penilaian' | 'rapor-harian' | 'rapor-bulanan' | 'catatan'
  >('info');

  // Add/Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [formMemberId, setFormMemberId] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKelasId, setFormKelasId] = useState('');
  const [formTanggalGabung, setFormTanggalGabung] = useState('2026-11-01');
  const [formStatus, setFormStatus] = useState<StatusKeanggotaan>('Aktif');
  const [formWhatsapp, setFormWhatsapp] = useState('');

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Catatan Perkembangan Input State
  const [newCatatanKategori, setNewCatatanKategori] = useState<'Perkembangan' | 'Koreksi' | 'Apresiasi' | 'Latihan'>('Perkembangan');
  const [newCatatanIsi, setNewCatatanIsi] = useState('');

  const filteredSantri = useMemo(() => {
    return visibleSantri.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      if (
        q &&
        !s.namaLengkap.toLowerCase().includes(q) &&
        !s.memberId.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterKelas !== 'ALL' && s.kelasId !== filterKelas) return false;
      if (filterProgram !== 'ALL' && s.programKhot !== filterProgram) return false;
      if (filterMetode !== 'ALL' && s.metodePembelajaran !== filterMetode) return false;
      if (filterStatus !== 'ALL' && s.statusKeanggotaan !== filterStatus) return false;
      return true;
    });
  }, [visibleSantri, searchQuery, filterKelas, filterProgram, filterMetode, filterStatus]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterKelas('ALL');
    setFilterProgram('ALL');
    setFilterMetode('ALL');
    setFilterStatus('ALL');
  };

  const openAddModal = () => {
    const nextNum = db.santri.length + 1;
    const defaultKelas = visibleKelas[0] || db.kelas[0];
    setEditingSantri(null);
    setFormMemberId(`BK-${String(nextNum).padStart(5, '0')}`);
    setFormNama('');
    setFormKelasId(defaultKelas?.kelasId || '');
    setFormTanggalGabung('2026-11-17');
    setFormStatus('Aktif');
    setFormWhatsapp('');
    setModalOpen(true);
  };

  const openEditModal = (s: Santri) => {
    setEditingSantri(s);
    setFormMemberId(s.memberId);
    setFormNama(s.namaLengkap);
    setFormKelasId(s.kelasId);
    setFormTanggalGabung(s.tanggalBergabung);
    setFormStatus(s.statusKeanggotaan);
    setFormWhatsapp(s.whatsapp || '');
    setModalOpen(true);
  };

  const handleSaveSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formMemberId.trim() || !formKelasId) {
      showToast('warning', 'Data Belum Lengkap', 'ID Member, Nama Lengkap, dan Kelas wajib diisi.');
      return;
    }

    const selectedClass = db.kelas.find((k) => k.kelasId === formKelasId);
    if (!selectedClass) return;

    // Prevent duplicate memberId on new creation
    if (
      !editingSantri &&
      db.santri.some((s) => s.memberId.toLowerCase() === formMemberId.trim().toLowerCase())
    ) {
      showToast('error', 'ID Member Duplikat', `ID Member ${formMemberId} sudah terdaftar di sistem.`);
      return;
    }

    const record: Santri = {
      santriId: editingSantri ? editingSantri.santriId : 'SNT-' + Date.now(),
      memberId: formMemberId.trim().toUpperCase(),
      namaLengkap: formNama.trim(),
      programKhot: selectedClass.programKhot,
      metodePembelajaran: selectedClass.metodePembelajaran,
      kelasId: selectedClass.kelasId,
      namaKelas: selectedClass.namaKelas,
      guruId: selectedClass.guruId,
      namaGuru: selectedClass.namaGuru,
      tanggalBergabung: formTanggalGabung,
      statusKeanggotaan: formStatus,
      whatsapp: formWhatsapp.trim(),
      isDemo: editingSantri ? editingSantri.isDemo : false,
    };

    const ok = await saveSantri(record, !editingSantri);
    if (ok) {
      setModalOpen(false);
    }
  };

  const handleDeleteSantri = (s: Santri) => {
    askConfirm({
      title: `Hapus Data Santri ${s.namaLengkap}?`,
      message: `Data santri ${s.memberId} (${s.namaLengkap}) akan dihapus dari daftar aktif. Pastikan tindakan ini telah dikonfirmasi.`,
      confirmLabel: 'Ya, Hapus Santri',
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        await deleteSantri(s.santriId);
        if (activeDetailId === s.santriId) {
          setLocalDetailId(null);
          navigate(`${rolePrefix}/santri`);
        }
      },
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'ID Member',
      'Nama Lengkap',
      'Program Khot',
      'Metode Pembelajaran',
      'Kelas',
      'Nama Guru',
      'Tanggal Bergabung',
      'Status Keanggotaan',
      'WhatsApp',
    ];
    const rows = filteredSantri.map((s) => [
      s.memberId,
      `"${s.namaLengkap}"`,
      `"${s.programKhot}"`,
      s.metodePembelajaran,
      `"${s.namaKelas}"`,
      `"${s.namaGuru}"`,
      s.tanggalBergabung,
      s.statusKeanggotaan,
      s.whatsapp || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_Santri_Belajar_Khot_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Export Berhasil', `${filteredSantri.length} data santri diekspor ke CSV.`);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    const lines = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const defaultKelas = visibleKelas[0] || db.kelas[0];
    if (!defaultKelas) return;

    const parsed: Santri[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 2 && parts[0].toLowerCase() !== 'id member') {
        const memberId = parts[0].toUpperCase();
        const namaLengkap = parts[1];
        const kelasMatch =
          db.kelas.find((k) => k.namaKelas.toLowerCase() === (parts[4] || '').toLowerCase()) ||
          defaultKelas;
        parsed.push({
          santriId: `SNT-IMP-${Date.now()}-${idx}`,
          memberId,
          namaLengkap,
          programKhot: kelasMatch.programKhot,
          metodePembelajaran: (parts[3] as MetodePembelajaran) || kelasMatch.metodePembelajaran,
          kelasId: kelasMatch.kelasId,
          namaKelas: kelasMatch.namaKelas,
          guruId: kelasMatch.guruId,
          namaGuru: kelasMatch.namaGuru,
          tanggalBergabung: parts[6] || '2026-11-17',
          statusKeanggotaan: (parts[7] as StatusKeanggotaan) || 'Aktif',
          whatsapp: parts[8] || '',
          isDemo: false,
        });
      }
    });

    if (parsed.length === 0) {
      showToast('warning', 'Format Tidak Sesuai', 'Gunakan format: BK-00007, Nama Lengkap');
      return;
    }

    const ok = await importSantriBatch(parsed);
    if (ok) {
      setImportModalOpen(false);
      setImportText('');
    }
  };

  // ==================== DETAIL AKADEMIK SANTRI VIEW (MODULE 16) ====================
  const selectedSantri = useMemo(
    () => db.santri.find((s) => s.santriId === activeDetailId || s.memberId === activeDetailId),
    [db.santri, activeDetailId]
  );

  if (selectedSantri) {
    const classJournals = db.jurnal
      .filter((j) => j.kelasId === selectedSantri.kelasId)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    const santriAttendance = db.absensi.filter((a) => a.santriId === selectedSantri.santriId);
    const attendanceSummary = calculateStudentAttendanceSummary(
      selectedSantri,
      classJournals,
      santriAttendance
    );

    const sessionGrades = classJournals.map((j) => {
      const items = db.penilaian.filter(
        (p) => p.jurnalId === j.jurnalId && p.santriId === selectedSantri.santriId
      );
      const finalScore = calculateSessionFinalScore(
        items.map((i) => ({ nilai: i.nilai, bobot: i.bobot }))
      );
      const att = santriAttendance.find((a) => a.jurnalId === j.jurnalId);
      return {
        jurnal: j,
        items,
        finalScore,
        predikat: getGradePredicate(finalScore, db.pengaturan.batasPredikat),
        statusKehadiran: att?.statusKehadiran || 'Belum Dicatat',
        keteranganAbsen: att?.keterangan || '-',
      };
    });

    const overallAverage = calculateMonthlyAverageScore(
      sessionGrades.map((sg) => sg.finalScore)
    );

    const santriRaporHarian = db.riwayatRapor.filter(
      (r) => r.santriId === selectedSantri.santriId && r.jenisRapor === 'HARIAN'
    );
    const santriRaporBulanan = db.riwayatRapor.filter(
      (r) => r.santriId === selectedSantri.santriId && r.jenisRapor === 'BULANAN'
    );
    const santriCatatan = db.catatanPerkembangan
      .filter((c) => c.santriId === selectedSantri.santriId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    const handleAddCatatan = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCatatanIsi.trim()) return;
      const latestJurnal = classJournals[classJournals.length - 1];
      const rec: CatatanPerkembangan = {
        catatanId: 'CAT-' + Date.now(),
        santriId: selectedSantri.santriId,
        jurnalId: latestJurnal?.jurnalId || 'JRN-GENERAL',
        tanggal: '2026-11-17',
        kategoriCatatan: newCatatanKategori,
        isiCatatan: newCatatanIsi.trim(),
        guruId: currentUser?.guruId || selectedSantri.guruId,
        namaGuru: currentUser?.namaLengkap || selectedSantri.namaGuru,
        createdAt: new Date().toISOString(),
        isDemo: false,
      };
      const ok = await saveCatatanPerkembangan(rec, true);
      if (ok) setNewCatatanIsi('');
    };

    return (
      <div className="space-y-6">
        {/* Back Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setLocalDetailId(null);
              navigate(`${rolePrefix}/santri`);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Santri</span>
          </button>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => openEditModal(selectedSantri)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profil</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(isAdmin ? '/admin/rapor-bulanan' : '/guru/rapor')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white hover:bg-[#315B43] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Buka Rapor Bulanan</span>
            </button>
          </div>
        </div>

        {/* Profile Summary Header */}
        <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#19432D] text-[#A3D1B3] flex items-center justify-center text-xl font-bold shrink-0">
                {selectedSantri.namaLengkap.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                  {selectedSantri.memberId} · Status: {selectedSantri.statusKeanggotaan}
                  {selectedSantri.isDemo ? ' · DATA DEMO' : ''}
                </p>
                <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE] mt-0.5">
                  {selectedSantri.namaLengkap}
                </h1>
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/85 mt-1">
                  {selectedSantri.programKhot} · Metode {selectedSantri.metodePembelajaran} · {selectedSantri.namaKelas} · Pengajar: {selectedSantri.namaGuru}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#E3EAE3] dark:border-[#24382C]">
              <div className="px-4 py-2 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]">Rata-rata Nilai</p>
                <p className="text-lg font-bold tabular-nums text-[#19432D] dark:text-[#ECF3EE] mt-0.5">
                  {overallAverage !== null ? overallAverage : '-'}
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]">Predikat</p>
                <p className="text-lg font-bold text-[#19432D] dark:text-[#ECF3EE] mt-0.5">
                  {getGradePredicate(overallAverage, db.pengaturan.batasPredikat)}
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
                <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]">Kehadiran</p>
                <p className="text-lg font-bold tabular-nums text-[#3B7551] dark:text-[#A3D1B3] mt-0.5">
                  {attendanceSummary.persentaseKehadiran}%
                </p>
              </div>
            </div>
          </div>

          {/* 7 Interactive Tabs from PRD Section 16 */}
          <div className="mt-6 pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex flex-wrap gap-1.5">
            {[
              { id: 'info', label: '1. Informasi Santri' },
              { id: 'jurnal', label: '2. Riwayat Jurnal' },
              { id: 'absensi', label: '3. Riwayat Absensi' },
              { id: 'penilaian', label: '4. Riwayat Penilaian' },
              { id: 'rapor-harian', label: '5. Rapor Harian' },
              { id: 'rapor-bulanan', label: '6. Rapor Bulanan' },
              { id: 'catatan', label: '7. Catatan Perkembangan' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id as typeof detailTab)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  detailTab === t.id
                    ? 'bg-[#19432D] text-white'
                    : 'bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Informasi Santri & Visualisasi Perkembangan Nilai */}
        {detailTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
              <h2 className="text-base font-bold text-[#26332A] dark:text-[#ECF3EE] mb-4">
                Biodata &amp; Keanggotaan Belajar Khot
              </h2>
              <dl className="divide-y divide-[#E3EAE3] dark:divide-[#24382C] text-sm">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">ID Santri / ID Member</dt>
                  <dd className="font-mono font-semibold">{selectedSantri.memberId}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Nama Lengkap</dt>
                  <dd className="font-semibold">{selectedSantri.namaLengkap}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Program Khot</dt>
                  <dd className="font-semibold">{selectedSantri.programKhot}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Metode Pembelajaran</dt>
                  <dd>{selectedSantri.metodePembelajaran}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Kelas / Kelompok</dt>
                  <dd>{selectedSantri.namaKelas}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Guru Pengajar</dt>
                  <dd>{selectedSantri.namaGuru}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Tanggal Bergabung</dt>
                  <dd className="tabular-nums">{formatDateLongId(selectedSantri.tanggalBergabung)}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B776D] dark:text-[#A3D1B3]">Status Keanggotaan</dt>
                  <dd className="font-semibold text-[#3B7551] dark:text-[#A3D1B3]">{selectedSantri.statusKeanggotaan}</dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-6 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
              <h2 className="text-base font-bold text-[#26332A] dark:text-[#ECF3EE] mb-1">
                Grafik Perkembangan Nilai dari Waktu ke Waktu
              </h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mb-5">
                Perjalanan kemampuan menulis khot sejak awal pertemuan hingga terbaru
              </p>
              <div className="space-y-4">
                {sessionGrades.map((sg) => (
                  <div key={sg.jurnal.jurnalId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#26332A] dark:text-[#ECF3EE]">
                        Pertemuan ke-{sg.jurnal.pertemuanKe} ({formatDateShortId(sg.jurnal.tanggal)})
                      </span>
                      <span className="font-mono font-bold tabular-nums text-[#19432D] dark:text-[#A3D1B3]">
                        {sg.finalScore !== null ? `${sg.finalScore} (${sg.predikat})` : 'Belum Dinilai'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#F3F7F2] dark:bg-[#1B2B22] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#19432D] dark:bg-[#A3D1B3] rounded-full"
                        style={{ width: `${sg.finalScore ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/75 truncate">
                      Materi: {sg.jurnal.materiPembelajaran}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Riwayat Jurnal */}
        {detailTab === 'jurnal' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
            <h2 className="text-base font-bold mb-4">Riwayat Pertemuan Pembelajaran Kelas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                    <th className="py-3 pr-4">No. Jurnal</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Pertemuan</th>
                    <th className="py-3 px-4">Materi Pembelajaran</th>
                    <th className="py-3 pl-4 text-right">Nilai Santri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                  {sessionGrades.map((sg) => (
                    <tr key={sg.jurnal.jurnalId}>
                      <td className="py-3 pr-4 font-mono text-xs">{sg.jurnal.nomorJurnal}</td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums">{formatDateShortId(sg.jurnal.tanggal)}</td>
                      <td className="py-3 px-4 text-xs">Ke-{sg.jurnal.pertemuanKe}</td>
                      <td className="py-3 px-4 text-xs font-medium">{sg.jurnal.materiPembelajaran}</td>
                      <td className="py-3 pl-4 text-right font-mono text-xs font-bold tabular-nums">
                        {sg.finalScore !== null ? `${sg.finalScore} (${sg.predikat})` : 'Belum Dinilai'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Riwayat Absensi */}
        {detailTab === 'absensi' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-base font-bold">Riwayat Kehadiran Santri</h2>
              <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]">
                Kewajiban Pertemuan (sejak bergabung {formatDateShortId(selectedSantri.tanggalBergabung)}): {attendanceSummary.totalKewajibanPertemuan} · Hadir: {attendanceSummary.hadir} · Izin: {attendanceSummary.izin} · Sakit: {attendanceSummary.sakit} · Alpa: {attendanceSummary.alpa} ({attendanceSummary.persentaseKehadiran}%)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                    <th className="py-3 pr-4">Tanggal</th>
                    <th className="py-3 px-4">Pertemuan</th>
                    <th className="py-3 px-4">Materi</th>
                    <th className="py-3 px-4">Status Kehadiran</th>
                    <th className="py-3 pl-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                  {sessionGrades.map((sg) => (
                    <tr key={sg.jurnal.jurnalId}>
                      <td className="py-3 pr-4 font-mono text-xs tabular-nums">{formatDateShortId(sg.jurnal.tanggal)}</td>
                      <td className="py-3 px-4 text-xs">Ke-{sg.jurnal.pertemuanKe}</td>
                      <td className="py-3 px-4 text-xs">{sg.jurnal.materiPembelajaran}</td>
                      <td className="py-3 px-4 text-xs font-semibold">{sg.statusKehadiran}</td>
                      <td className="py-3 pl-4 text-xs text-[#6B776D] dark:text-[#A3D1B3]/80">{sg.keteranganAbsen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Riwayat Penilaian */}
        {detailTab === 'penilaian' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-6">
            <h2 className="text-base font-bold">Rincian Penilaian per Pertemuan</h2>
            {sessionGrades.map((sg) => (
              <div
                key={sg.jurnal.jurnalId}
                className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
                  <div>
                    <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                      {sg.jurnal.nomorJurnal} · {formatDateLongId(sg.jurnal.tanggal)}
                    </p>
                    <p className="text-sm font-bold mt-0.5">{sg.jurnal.materiPembelajaran}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#6B776D] dark:text-[#A3D1B3]">Nilai Akhir: </span>
                    <span className="font-mono text-sm font-bold text-[#19432D] dark:text-[#A3D1B3]">
                      {sg.finalScore !== null ? `${sg.finalScore} (Predikat ${sg.predikat})` : 'Belum Dinilai'}
                    </span>
                  </div>
                </div>
                {sg.items.length > 0 ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sg.items.map((item) => (
                      <div key={item.penilaianId} className="text-xs">
                        <div className="flex justify-between font-medium">
                          <span>{item.namaAspek} ({item.bobot}%)</span>
                          <span className="font-mono font-bold tabular-nums">{item.nilai ?? '-'}</span>
                        </div>
                        {item.catatanPenilaian && (
                          <p className="text-[#6B776D] dark:text-[#A3D1B3]/75 mt-0.5">
                            {item.catatanPenilaian}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[#6B776D]">Belum ada aspek yang dinilai pada pertemuan ini.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Rapor Harian */}
        {detailTab === 'rapor-harian' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Arsip Rapor Harian Santri</h2>
              <button
                type="button"
                onClick={() => navigate(`${rolePrefix}/rapor-harian`)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
              >
                Buat / Cetak Rapor Harian
              </button>
            </div>
            {santriRaporHarian.length > 0 ? (
              <div className="space-y-3">
                {santriRaporHarian.map((r) => (
                  <div
                    key={r.raporId}
                    className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                        {r.nomorRapor} · Versi {r.versiRapor}
                      </p>
                      <p className="text-sm font-bold mt-0.5">Periode: {r.periodeLabel}</p>
                      <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                        Nilai Akhir: {r.nilaiAkhir ?? '-'} (Predikat {r.predikat})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/print/rapor-harian/${r.raporId}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
                    >
                      Cetak A4
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B776D]">Belum ada arsip rapor harian yang disimpan untuk santri ini.</p>
            )}
          </div>
        )}

        {/* Tab 6: Rapor Bulanan */}
        {detailTab === 'rapor-bulanan' && (
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Arsip Rapor Bulanan Santri</h2>
              <button
                type="button"
                onClick={() => navigate(isAdmin ? '/admin/rapor-bulanan' : '/guru/rapor')}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
              >
                Buat / Cetak Rapor Bulanan
              </button>
            </div>
            {santriRaporBulanan.length > 0 ? (
              <div className="space-y-3">
                {santriRaporBulanan.map((r) => (
                  <div
                    key={r.raporId}
                    className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                        {r.nomorRapor} · Versi {r.versiRapor} · {r.statusRapor}
                      </p>
                      <p className="text-sm font-bold mt-0.5">Periode: {r.periodeLabel}</p>
                      <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
                        Rata-rata: {r.nilaiAkhir ?? '-'} (Predikat {r.predikat}) · Kehadiran: {r.persentaseKehadiran}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/print/rapor-bulanan/${r.raporId}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
                    >
                      Cetak A4
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6B776D]">Belum ada arsip rapor bulanan untuk santri ini.</p>
            )}
          </div>
        )}

        {/* Tab 7: Catatan Perkembangan */}
        {detailTab === 'catatan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
              <h2 className="text-base font-bold mb-3">Tambah Catatan Perkembangan</h2>
              <form onSubmit={handleAddCatatan} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1">Kategori Catatan</label>
                  <select
                    value={newCatatanKategori}
                    onChange={(e) => setNewCatatanKategori(e.target.value as typeof newCatatanKategori)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="Perkembangan">Perkembangan</option>
                    <option value="Koreksi">Koreksi Kaidah</option>
                    <option value="Apresiasi">Apresiasi</option>
                    <option value="Latihan">Rekomendasi Latihan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Isi Evaluasi / Catatan Guru</label>
                  <textarea
                    rows={4}
                    value={newCatatanIsi}
                    onChange={(e) => setNewCatatanIsi(e.target.value)}
                    placeholder="Contoh: Bentuk huruf sudah semakin baik, perlu memperhatikan proporsi ukuran huruf..."
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#19432D] hover:bg-[#315B43] text-white text-xs font-semibold"
                >
                  Simpan Catatan Perkembangan
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 space-y-3">
              <h2 className="text-base font-bold mb-2">Riwayat Catatan Guru ({santriCatatan.length})</h2>
              {santriCatatan.length > 0 ? (
                santriCatatan.map((c) => (
                  <div
                    key={c.catatanId}
                    className="p-4 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]">
                        {formatDateLongId(c.tanggal)} · {c.kategoriCatatan} · Oleh {c.namaGuru}
                      </p>
                      <p className="text-sm mt-1 leading-relaxed">{c.isiCatatan}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCatatanPerkembangan(c.catatanId)}
                      aria-label="Hapus Catatan"
                      className="text-[#B44238] hover:opacity-80 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6B776D]">Belum ada catatan khusus untuk santri ini.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== MAIN DATA SANTRI LIST VIEW ====================
  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Master Data Santri Belajar Khot
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Pusat data peserta pembelajaran yang terintegrasi dengan jurnal, absensi, dan rapor akademik
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Santri</span>
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Santri</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-[#6B776D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama santri atau ID Member (BK-00001)..."
            aria-label="Cari nama santri atau ID Member"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
        </div>

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
          value={filterMetode}
          onChange={(e) => setFilterMetode(e.target.value)}
          aria-label="Filter Metode Pembelajaran"
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Metode</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter Status Keanggotaan"
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            <option value="ALL">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Cuti">Cuti</option>
            <option value="Lulus">Lulus</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
          <button
            type="button"
            onClick={resetFilters}
            title="Reset Filter"
            aria-label="Reset Filter"
            className="p-2 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] text-[#6B776D] dark:text-[#A3D1B3]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#F3F7F2]/60 dark:bg-[#1B2B22]/60 text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                <th className="py-3.5 pl-6 pr-3">ID Member</th>
                <th className="py-3.5 px-3">Nama Lengkap Santri</th>
                <th className="py-3.5 px-3">Program &amp; Metode</th>
                <th className="py-3.5 px-3">Kelas / Kelompok</th>
                <th className="py-3.5 px-3">Guru Pengajar</th>
                <th className="py-3.5 px-3">Tgl Bergabung</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C] text-sm">
              {filteredSantri.length > 0 ? (
                filteredSantri.map((s) => (
                  <tr
                    key={s.santriId}
                    className="hover:bg-[#F3F7F2]/50 dark:hover:bg-[#1B2B22]/50 transition-colors"
                  >
                    <td className="py-3.5 pl-6 pr-3 font-mono text-xs font-semibold tabular-nums text-[#19432D] dark:text-[#A3D1B3] whitespace-nowrap">
                      {s.memberId}
                    </td>
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalDetailId(s.santriId);
                          navigate(`${rolePrefix}/santri/${s.santriId}`);
                        }}
                        className="font-semibold text-[#26332A] dark:text-[#ECF3EE] hover:text-[#19432D] dark:hover:text-[#A3D1B3] text-left"
                      >
                        {s.namaLengkap}
                      </button>
                      {s.isDemo && (
                        <span className="block text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/70">
                          Data Demonstrasi (DEMO)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-medium text-[#26332A] dark:text-[#ECF3EE]">
                        {s.programKhot}
                      </span>
                      <span className="text-[#6B776D] dark:text-[#A3D1B3]/80"> · {s.metodePembelajaran}</span>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[#26332A] dark:text-[#ECF3EE]">
                      {s.namaKelas}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[#6B776D] dark:text-[#A3D1B3]/90">
                      {s.namaGuru}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs tabular-nums text-[#6B776D] dark:text-[#A3D1B3]">
                      {formatDateShortId(s.tanggalBergabung)}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold text-[#3B7551] dark:text-[#A3D1B3]">
                      {s.statusKeanggotaan}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setLocalDetailId(s.santriId);
                            navigate(`${rolePrefix}/santri/${s.santriId}`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(s)}
                              aria-label={`Edit ${s.namaLengkap}`}
                              className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] dark:hover:text-white hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSantri(s)}
                              aria-label={`Hapus ${s.namaLengkap}`}
                              className="p-1.5 rounded-lg text-[#B44238] hover:bg-[#B44238]/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-[#6B776D]">
                    Tidak ada data santri yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Santri Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-santri-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 id="modal-santri-title" className="text-lg font-bold">
                {editingSantri ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup Modal"
                className="p-1 text-[#6B776D] hover:text-[#26332A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSantri} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">ID Member / ID Santri</label>
                  <input
                    type="text"
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    placeholder="BK-00007"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tanggal Bergabung</label>
                  <input
                    type="date"
                    value={formTanggalGabung}
                    onChange={(e) => setFormTanggalGabung(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Nama Lengkap Santri</label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Masukkan nama lengkap santri"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Kelas / Kelompok Belajar (Otomatis menyelaraskan Program &amp; Guru)
                </label>
                <select
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                >
                  {db.kelas.map((k) => (
                    <option key={k.kelasId} value={k.kelasId}>
                      {k.namaKelas} — {k.programKhot} ({k.metodePembelajaran})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Status Keanggotaan</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StatusKeanggotaan)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nomor WhatsApp (Opsional)</label>
                  <input
                    type="text"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white"
                >
                  Simpan Data Santri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {importModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold">Import Data Santri dari Master Member</h2>
            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-1">
              Masukkan baris CSV dengan format: <code className="font-mono">ID_Member, Nama_Lengkap</code> (satu santri per baris). Sistem otomatis mencegah duplikasi ID Member.
            </p>
            <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
              <textarea
                rows={5}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={'BK-00007, Salman Al-Farisi\nBK-00008, Bilal bin Rabah'}
                className="w-full p-3 text-xs font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
                >
                  Proses Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
