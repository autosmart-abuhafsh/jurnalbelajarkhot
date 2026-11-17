import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Users, BookOpen, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Kelas, MetodePembelajaran } from '../types';

export const KelasPage: React.FC = () => {
  const {
    db,
    currentUser,
    visibleKelas,
    saveKelas,
    deleteKelas,
    askConfirm,
    closeConfirm,
    navigate,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';
  const rolePrefix = isAdmin ? '/admin' : '/guru';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [formKelasId, setFormKelasId] = useState('');
  const [formNamaKelas, setFormNamaKelas] = useState('');
  const [formProgram, setFormProgram] = useState('Khot Naskhi');
  const [formMetode, setFormMetode] = useState<MetodePembelajaran>('Online');
  const [formGuruId, setFormGuruId] = useState('');
  const [formJadwal, setFormJadwal] = useState('');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  const guruList = db.users.filter((u) => u.role === 'GURU' || u.role === 'ADMIN');

  const openAddModal = () => {
    setEditingKelas(null);
    setFormKelasId(`KLS-${Date.now().toString().slice(-4)}`);
    setFormNamaKelas('');
    setFormProgram(db.pengaturan.programs[0] || 'Khot Naskhi');
    setFormMetode('Online');
    setFormGuruId(guruList[0]?.guruId || guruList[0]?.userId || 'GRU-001');
    setFormJadwal('Sabtu, 19.30 WIB');
    setFormStatus('Aktif');
    setModalOpen(true);
  };

  const openEditModal = (k: Kelas) => {
    setEditingKelas(k);
    setFormKelasId(k.kelasId);
    setFormNamaKelas(k.namaKelas);
    setFormProgram(k.programKhot);
    setFormMetode(k.metodePembelajaran);
    setFormGuruId(k.guruId);
    setFormJadwal(k.jadwal || '');
    setFormStatus(k.statusKelas);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaKelas.trim() || !formKelasId.trim()) {
      showToast('warning', 'Data Belum Lengkap', 'ID Kelas dan Nama Kelas wajib diisi.');
      return;
    }
    const guruObj = guruList.find((g) => g.guruId === formGuruId || g.userId === formGuruId);
    const record: Kelas = {
      kelasId: editingKelas ? editingKelas.kelasId : formKelasId.trim().toUpperCase(),
      namaKelas: formNamaKelas.trim(),
      programKhot: formProgram,
      metodePembelajaran: formMetode,
      guruId: formGuruId,
      namaGuru: guruObj?.namaLengkap || 'Ustadz Syamsu Muhajir',
      jadwal: formJadwal.trim(),
      statusKelas: formStatus,
      isDemo: editingKelas ? editingKelas.isDemo : false,
    };
    const ok = await saveKelas(record, !editingKelas);
    if (ok) setModalOpen(false);
  };

  const handleDelete = (k: Kelas) => {
    askConfirm({
      title: `Hapus ${k.namaKelas}?`,
      message: `Apakah Anda yakin ingin menghapus kelas ${k.namaKelas}?`,
      confirmLabel: 'Ya, Hapus Kelas',
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        await deleteKelas(k.kelasId);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Kelas &amp; Kelompok Pembelajaran
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Pengelolaan kelompok belajar Khot Naskhi dan Khot Riq&apos;ah beserta daftar santri aktif
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas / Kelompok</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleKelas.map((k) => {
          const classSantri = db.santri.filter((s) => s.kelasId === k.kelasId);
          const classJurnalCount = db.jurnal.filter((j) => j.kelasId === k.kelasId).length;
          return (
            <div
              key={k.kelasId}
              className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-[#6B776D] dark:text-[#A3D1B3]">
                      {k.kelasId} · {k.metodePembelajaran} · {k.statusKelas}
                    </p>
                    <h2 className="text-lg font-bold text-[#26332A] dark:text-[#ECF3EE] mt-1">
                      {k.namaKelas}
                    </h2>
                    <p className="text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] mt-0.5">
                      Program: {k.programKhot}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(k)}
                        aria-label={`Edit ${k.namaKelas}`}
                        className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(k)}
                        aria-label={`Hapus ${k.namaKelas}`}
                        className="p-1.5 rounded-lg text-[#B44238] hover:bg-[#B44238]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E3EAE3] dark:border-[#24382C] text-xs space-y-1.5 text-[#6B776D] dark:text-[#A3D1B3]/85">
                  <p>
                    <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">Guru Pengajar:</span>{' '}
                    {k.namaGuru}
                  </p>
                  {k.jadwal && (
                    <p>
                      <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">Jadwal:</span>{' '}
                      {k.jadwal}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold text-[#26332A] dark:text-[#ECF3EE]">Total Pertemuan:</span>{' '}
                    {classJurnalCount} Jurnal
                  </p>
                </div>

                {/* Daftar Santri di Kelas */}
                <div className="mt-4 pt-3 border-t border-[#E3EAE3] dark:border-[#24382C]">
                  <p className="text-xs font-semibold text-[#26332A] dark:text-[#ECF3EE] mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#19432D] dark:text-[#A3D1B3]" />
                    <span>Daftar Santri ({classSantri.length})</span>
                  </p>
                  {classSantri.length > 0 ? (
                    <ul className="space-y-1.5">
                      {classSantri.map((s) => (
                        <li
                          key={s.santriId}
                          className="text-xs flex items-center justify-between py-1 px-2.5 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22]"
                        >
                          <button
                            type="button"
                            onClick={() => navigate(`${rolePrefix}/santri/${s.santriId}`)}
                            className="font-medium text-[#26332A] dark:text-[#ECF3EE] hover:underline text-left"
                          >
                            {s.namaLengkap}
                          </button>
                          <span className="font-mono text-[11px] text-[#6B776D] dark:text-[#A3D1B3]">
                            {s.memberId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#6B776D]">Belum ada santri di kelas ini.</p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`${rolePrefix}/jurnal`)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] dark:hover:bg-[#24382C] text-[#19432D] dark:text-[#ECF3EE] flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lihat Jurnal Kelas</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Kelas Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 className="text-lg font-bold">
                {editingKelas ? 'Edit Kelas / Kelompok' : 'Tambah Kelas / Kelompok Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup"
                className="p-1 text-[#6B776D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">ID Kelas</label>
                  <input
                    type="text"
                    value={formKelasId}
                    disabled={!!editingKelas}
                    onChange={(e) => setFormKelasId(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status Kelas</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Nama Kelas / Kelompok</label>
                <input
                  type="text"
                  value={formNamaKelas}
                  onChange={(e) => setFormNamaKelas(e.target.value)}
                  placeholder="Contoh: Kelompok Naskhi C"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Program Khot</label>
                  <select
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    {db.pengaturan.programs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Metode Pembelajaran</label>
                  <select
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value as MetodePembelajaran)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Guru Pengajar</label>
                  <select
                    value={formGuruId}
                    onChange={(e) => setFormGuruId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    {guruList.map((g) => (
                      <option key={g.userId} value={g.guruId || g.userId}>
                        {g.namaLengkap}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Jadwal Pertemuan</label>
                  <input
                    type="text"
                    value={formJadwal}
                    onChange={(e) => setFormJadwal(e.target.value)}
                    placeholder="Selasa & Sabtu, 19.30 WIB"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E3EAE3] dark:border-[#24382C] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
