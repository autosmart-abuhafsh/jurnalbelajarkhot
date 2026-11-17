import React, { useState, useMemo } from 'react';
import {
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RubrikPenilaian } from '../types';
import { validateProgramRubricWeights } from '../utils/academicRules';

export const RubrikPage: React.FC = () => {
  const { db, saveRubrikList, askConfirm, closeConfirm, showToast } = useApp();

  const [selectedProgram, setSelectedProgram] = useState<string>(
    db.pengaturan.programs[0] || 'Khot Naskhi'
  );
  const [localRubriks, setLocalRubriks] = useState<RubrikPenilaian[]>(() => db.rubrik);

  // Sync if db.rubrik changes externally
  React.useEffect(() => {
    setLocalRubriks(db.rubrik);
  }, [db.rubrik]);

  const programRubriks = useMemo(
    () =>
      localRubriks
        .filter((r) => r.programKhot === selectedProgram)
        .sort((a, b) => a.urutan - b.urutan),
    [localRubriks, selectedProgram]
  );

  const weightValidation = useMemo(
    () => validateProgramRubricWeights(localRubriks, selectedProgram),
    [localRubriks, selectedProgram]
  );

  // New aspect form
  const [newNama, setNewNama] = useState('');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [newBobot, setNewBobot] = useState(10);

  const handleAddAspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      showToast('warning', 'Nama Aspek Kosong', 'Masukkan nama kriteria penilaian.');
      return;
    }
    const now = new Date().toISOString();
    const nextUrutan = programRubriks.length + 1;
    const newItem: RubrikPenilaian = {
      aspekId: `ASP-${Date.now()}`,
      namaAspek: newNama.trim(),
      deskripsi: newDeskripsi.trim() || 'Kriteria evaluasi penulisan khot.',
      programKhot: selectedProgram,
      bobot: Number(newBobot) || 0,
      urutan: nextUrutan,
      statusAktif: true,
      createdAt: now,
      updatedAt: now,
    };
    setLocalRubriks((prev) => [...prev, newItem]);
    setNewNama('');
    setNewDeskripsi('');
    setNewBobot(10);
  };

  const handleUpdateField = (
    aspekId: string,
    field: keyof RubrikPenilaian,
    value: string | number | boolean
  ) => {
    setLocalRubriks((prev) =>
      prev.map((r) =>
        r.aspekId === aspekId
          ? { ...r, [field]: value, updatedAt: new Date().toISOString() }
          : r
      )
    );
  };

  const handleMoveOrder = (aspekId: string, direction: 'up' | 'down') => {
    const idx = programRubriks.findIndex((r) => r.aspekId === aspekId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= programRubriks.length) return;

    const currentItem = programRubriks[idx];
    const swapItem = programRubriks[swapIdx];

    setLocalRubriks((prev) =>
      prev.map((r) => {
        if (r.aspekId === currentItem.aspekId) return { ...r, urutan: swapItem.urutan };
        if (r.aspekId === swapItem.aspekId) return { ...r, urutan: currentItem.urutan };
        return r;
      })
    );
  };

  const handleDeleteAspect = (item: RubrikPenilaian) => {
    askConfirm({
      title: `Hapus Kriteria "${item.namaAspek}"?`,
      message:
        'Menghapus kriteria dari rubrik tidak akan menghapus nilai historis yang sudah tersimpan pada pertemuan sebelumnya. Lanjutkan?',
      confirmLabel: 'Ya, Hapus Kriteria',
      danger: true,
      onConfirm: () => {
        closeConfirm();
        setLocalRubriks((prev) => prev.filter((r) => r.aspekId !== item.aspekId));
      },
    });
  };

  const handleSaveAll = async () => {
    if (!weightValidation.valid) {
      showToast('error', 'Validasi Bobot Gagal', weightValidation.error);
      return;
    }
    await saveRubrikList(
      localRubriks,
      `Memperbarui konfigurasi rubrik penilaian ${selectedProgram} (Total Bobot Aktif: 100%)`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Pengaturan Rubrik Penilaian Khot
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Kelola kriteria, urutan, dan bobot penilaian untuk setiap program Khot. Perubahan rubrik tidak mengubah bobot nilai historis lama.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 self-start"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Rubrik Penilaian</span>
        </button>
      </div>

      {/* Program Selector & Weight Status */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {db.pengaturan.programs.map((prog) => (
            <button
              key={prog}
              type="button"
              onClick={() => setSelectedProgram(prog)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                selectedProgram === prog
                  ? 'bg-[#19432D] text-white'
                  : 'bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#26332A] dark:text-[#ECF3EE]'
              }`}
            >
              {prog}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          {weightValidation.valid ? (
            <span className="text-[#3B7551] dark:text-[#A3D1B3] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Total Bobot Aktif {selectedProgram}: 100% (Valid)</span>
            </span>
          ) : (
            <span className="text-[#B44238] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Total Bobot Aktif: {weightValidation.totalBobot}% (Harus tepat 100%)</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table of Criteria */}
        <div className="lg:col-span-8 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6">
          <h2 className="text-base font-bold mb-4">
            Daftar Aspek Penilaian — {selectedProgram}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                  <th className="py-3 pr-2">Urutan</th>
                  <th className="py-3 px-2">Nama Kriteria &amp; Deskripsi</th>
                  <th className="py-3 px-2 text-center w-24">Bobot (%)</th>
                  <th className="py-3 px-2 text-center">Aktif</th>
                  <th className="py-3 pl-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
                {programRubriks.map((r, idx) => (
                  <tr key={r.aspekId}>
                    <td className="py-3 pr-2 font-mono">
                      <div className="flex items-center gap-1">
                        <span>{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(r.aspekId, 'up')}
                          aria-label="Naikkan urutan"
                          className="p-1 hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] rounded"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(r.aspekId, 'down')}
                          aria-label="Turunkan urutan"
                          className="p-1 hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] rounded"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2 space-y-1">
                      <input
                        type="text"
                        value={r.namaAspek}
                        onChange={(e) => handleUpdateField(r.aspekId, 'namaAspek', e.target.value)}
                        className="w-full px-2.5 py-1 font-semibold rounded bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                      />
                      <input
                        type="text"
                        value={r.deskripsi}
                        onChange={(e) => handleUpdateField(r.aspekId, 'deskripsi', e.target.value)}
                        className="w-full px-2.5 py-1 text-[11px] text-[#6B776D] dark:text-[#A3D1B3] rounded bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.bobot}
                        onChange={(e) =>
                          handleUpdateField(r.aspekId, 'bobot', Number(e.target.value))
                        }
                        className="w-16 px-2 py-1.5 text-center font-mono font-bold rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={r.statusAktif}
                        onChange={(e) =>
                          handleUpdateField(r.aspekId, 'statusAktif', e.target.checked)
                        }
                        aria-label={`Status aktif ${r.namaAspek}`}
                        className="w-4 h-4 accent-[#19432D] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteAspect(r)}
                        aria-label={`Hapus ${r.namaAspek}`}
                        className="p-1.5 rounded-lg text-[#B44238] hover:bg-[#B44238]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New Aspect Form */}
        <div className="lg:col-span-4 rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-6 self-start">
          <h2 className="text-base font-bold mb-3">
            Tambah Kriteria Baru ({selectedProgram})
          </h2>
          <form onSubmit={handleAddAspect} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1">Nama Kriteria / Aspek</label>
              <input
                type="text"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                placeholder="Contoh: Ketelitian & Keterampilan"
                className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Deskripsi Indikator</label>
              <textarea
                rows={3}
                value={newDeskripsi}
                onChange={(e) => setNewDeskripsi(e.target.value)}
                placeholder="Penjelasan indikator penilaian..."
                className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Bobot Penilaian (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={newBobot}
                onChange={(e) => setNewBobot(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] hover:bg-[#E3EAE3] text-[#19432D] dark:text-[#A3D1B3] font-semibold flex items-center justify-center gap-1.5 border border-[#E3EAE3] dark:border-[#24382C]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan ke Daftar Rubrik</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
