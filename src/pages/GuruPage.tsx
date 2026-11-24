import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  KeyRound,
  History,
  X,
  Copy,
  Check,
  Users,
  UserCheck,
  BookOpen,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role, User } from '../types';
import { generateNextGuruId } from '../utils/academicRules';

export const GuruPage: React.FC = () => {
  const {
    db,
    saveGuru,
    deleteGuru,
    resetUserPassword,
    askConfirm,
    closeConfirm,
    showToast,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formGuruId, setFormGuruId] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formRole, setFormRole] = useState<Role>('GURU');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formKelasIds, setFormKelasIds] = useState<string[]>([]);

  // Password Reset Modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Teacher Activity Log Modal
  const [activityUser, setActivityUser] = useState<User | null>(null);

  // Copy feedback + newly created teacher notice (non-sensitive ID + username only)
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [recentCreatedNotice, setRecentCreatedNotice] = useState<{
    nama: string;
    guruId: string;
    username: string;
  } | null>(null);

  const summary = useMemo(() => {
    const teachers = db.users.filter((u) => u.role === 'GURU');
    const activeTeachers = teachers.filter((u) => u.statusAkun === 'Aktif');
    const coveredClassIds = new Set<string>();
    for (const u of teachers) {
      for (const id of u.kelasDiampu || []) coveredClassIds.add(id);
      if (u.guruId) {
        for (const k of db.kelas) {
          if (k.guruId === u.guruId) coveredClassIds.add(k.kelasId);
        }
      }
    }
    return {
      totalTeachers: teachers.length,
      activeTeachers: activeTeachers.length,
      coveredClasses: coveredClassIds.size,
      totalJournals: db.jurnal.length,
    };
  }, [db.users, db.kelas, db.jurnal]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormGuruId(generateNextGuruId(db.users));
    setFormNama('');
    setFormUsername('');
    setFormPassword('');
    setFormWhatsapp('');
    setFormRole('GURU');
    setFormStatus('Aktif');
    setFormKelasIds([]);
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormGuruId(u.guruId || u.userId);
    setFormNama(u.namaLengkap);
    setFormUsername(u.username);
    setFormPassword('');
    setFormWhatsapp(u.whatsapp || '');
    setFormRole(u.role);
    setFormStatus(u.statusAkun);
    const linkedKelas = db.kelas
      .filter(
        (k) =>
          (u.kelasDiampu || []).includes(k.kelasId) ||
          (Boolean(u.guruId) && k.guruId === u.guruId)
      )
      .map((k) => k.kelasId);
    setFormKelasIds(linkedKelas);
    setModalOpen(true);
  };

  const toggleClassSelection = (kelasId: string) => {
    setFormKelasIds((prev) =>
      prev.includes(kelasId) ? prev.filter((id) => id !== kelasId) : [...prev, kelasId]
    );
  };

  const handleCopyLoginInfo = async (u: User) => {
    const loginId = u.guruId || u.username;
    const text = `Akses Portal Guru Belajar Khot\nNama: ${u.namaLengkap}\nID Guru: ${loginId}\nUsername: ${u.username}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUserId(u.userId);
      setTimeout(() => setCopiedUserId(null), 2000);
      showToast(
        'info',
        'Info Login Disalin',
        `ID Guru (${loginId}) dan username ${u.username} disalin ke clipboard.`
      );
    } catch {
      showToast('info', 'Info Login Guru', `ID Guru: ${loginId} · Username: ${u.username}`);
    }
  };

  const handleSaveGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNama = formNama.trim();
    const normalizedUsername = formUsername.trim().toLowerCase();
    const normalizedGuruId = formGuruId.trim().toUpperCase();

    if (!trimmedNama || !normalizedUsername || !normalizedGuruId) {
      showToast(
        'warning',
        'Data Belum Lengkap',
        'ID Guru, Nama Lengkap, dan Username wajib diisi.'
      );
      return;
    }

    const duplicateUsername = db.users.some(
      (u) =>
        u.userId !== editingUser?.userId &&
        u.username.trim().toLowerCase() === normalizedUsername
    );
    if (duplicateUsername) {
      showToast(
        'error',
        'Username Sudah Digunakan',
        `Username "${normalizedUsername}" sudah terdaftar pada akun lain.`
      );
      return;
    }

    const duplicateGuruId = db.users.some(
      (u) =>
        u.userId !== editingUser?.userId &&
        (u.guruId || '').trim().toUpperCase() === normalizedGuruId
    );
    if (duplicateGuruId) {
      showToast(
        'error',
        'ID Guru Sudah Digunakan',
        `ID Guru "${normalizedGuruId}" sudah terdaftar pada akun lain.`
      );
      return;
    }

    if (!editingUser && formPassword.trim().length < 5) {
      showToast(
        'warning',
        'Password Awal Minimal 5 Karakter',
        'Tentukan password awal minimal 5 karakter untuk akun baru.'
      );
      return;
    }

    const record: User = {
      userId: editingUser ? editingUser.userId : 'USR-' + Date.now(),
      guruId: normalizedGuruId,
      namaLengkap: trimmedNama,
      username: normalizedUsername,
      role: formRole,
      whatsapp: formWhatsapp.trim(),
      kelasDiampu: formKelasIds,
      statusAkun: formStatus,
      isDemo: editingUser ? editingUser.isDemo : false,
    };

    const ok = await saveGuru(record, !editingUser, formPassword.trim() || undefined);
    if (ok) {
      if (!editingUser && record.role === 'GURU') {
        setRecentCreatedNotice({
          nama: record.namaLengkap,
          guruId: record.guruId || record.userId,
          username: record.username,
        });
      }
      setModalOpen(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || newPasswordInput.trim().length < 5) {
      showToast('warning', 'Password Terlalu Pendek', 'Password baru minimal 5 karakter.');
      return;
    }
    const res = await resetUserPassword(resetTarget.userId, newPasswordInput.trim());
    if (res.success) {
      setResetTarget(null);
      setNewPasswordInput('');
    }
  };

  const handleDelete = (u: User) => {
    if (u.username === 'admin') {
      showToast('warning', 'Akses Dilindungi', 'Akun Administrator utama tidak dapat dihapus.');
      return;
    }
    askConfirm({
      title: `Hapus Data Pengajar ${u.namaLengkap}?`,
      message: `Akun pengguna ${u.username} (${u.guruId || u.userId}) akan dihapus secara permanen dari sistem.`,
      confirmLabel: 'Ya, Hapus Pengajar',
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        await deleteGuru(u.userId);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
            Modul Data Guru &amp; ID Login Pengajar
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Kelola ID Login Guru, pembagian kelas binaan untuk pengisian jurnal &amp; absensi, serta
            keamanan kredensial akses
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 self-start whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Tambah Guru / Pengajar</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4">
          <div className="flex items-center justify-between text-xs text-[#6B776D] dark:text-[#A3D1B3]">
            <span>Total Pengajar</span>
            <Users className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3]" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{summary.totalTeachers}</p>
        </div>
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4">
          <div className="flex items-center justify-between text-xs text-[#6B776D] dark:text-[#A3D1B3]">
            <span>Akun Guru Aktif</span>
            <UserCheck className="w-4 h-4 text-[#3B7551]" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#3B7551] dark:text-[#A3D1B3]">
            {summary.activeTeachers}
          </p>
        </div>
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4">
          <div className="flex items-center justify-between text-xs text-[#6B776D] dark:text-[#A3D1B3]">
            <span>Kelas Terampu</span>
            <BookOpen className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3]" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{summary.coveredClasses}</p>
        </div>
        <div className="rounded-xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4">
          <div className="flex items-center justify-between text-xs text-[#6B776D] dark:text-[#A3D1B3]">
            <span>Total Jurnal Pertemuan</span>
            <FileText className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3]" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{summary.totalJournals}</p>
        </div>
      </div>

      {recentCreatedNotice && (
        <div className="rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#3B7551]/40 p-4 flex items-center justify-between gap-4">
          <div className="text-xs">
            <p className="font-bold text-[#19432D] dark:text-[#A3D1B3]">
              Akun Guru Berhasil Dibuat — {recentCreatedNotice.nama}
            </p>
            <p className="mt-1 text-[#26332A] dark:text-[#ECF3EE]">
              Berikan ID Login Guru{' '}
              <span className="font-mono font-bold">{recentCreatedNotice.guruId}</span> (atau
              username <span className="font-mono font-bold">{recentCreatedNotice.username}</span>)
              kepada pengajar untuk masuk melalui tab <span className="font-semibold">Portal Guru</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRecentCreatedNotice(null)}
            aria-label="Tutup pemberitahuan"
            className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#26332A] dark:hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#F3F7F2]/60 dark:bg-[#1B2B22]/60 text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                <th className="py-3.5 pl-6 pr-3">ID Login Guru</th>
                <th className="py-3.5 px-3">Nama Lengkap</th>
                <th className="py-3.5 px-3">Username &amp; Hak Akses</th>
                <th className="py-3.5 px-3">WhatsApp</th>
                <th className="py-3.5 px-3">Kelas yang Diampu</th>
                <th className="py-3.5 px-3">Status Akun</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
              {db.users.map((u) => {
                const assignedNames = db.kelas
                  .filter(
                    (k) =>
                      (u.kelasDiampu || []).includes(k.kelasId) ||
                      (Boolean(u.guruId) && k.guruId === u.guruId)
                  )
                  .map((k) => k.namaKelas);
                return (
                  <tr key={u.userId} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                    <td className="py-3.5 pl-6 pr-3 font-mono text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3]">
                      {u.guruId || u.userId}
                    </td>
                    <td className="py-3.5 px-3 font-semibold">{u.namaLengkap}</td>
                    <td className="py-3.5 px-3 text-xs">
                      <span className="font-mono font-semibold">{u.username}</span>
                      <span className="text-[#6B776D] dark:text-[#A3D1B3]"> · {u.role}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-[#6B776D] dark:text-[#A3D1B3]">
                      {u.whatsapp || '-'}
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      {u.role === 'ADMIN' ? (
                        <span className="text-[#6B776D] dark:text-[#A3D1B3]">
                          Semua Kelas (Administrator)
                        </span>
                      ) : assignedNames.length > 0 ? (
                        assignedNames.join(', ')
                      ) : (
                        <span className="text-[#A06A18]">Belum Ditugaskan</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-semibold">
                      <span
                        className={
                          u.statusAkun === 'Aktif'
                            ? 'text-[#3B7551] dark:text-[#A3D1B3]'
                            : 'text-[#B44238]'
                        }
                      >
                        {u.statusAkun}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {u.role === 'GURU' && (
                          <button
                            type="button"
                            onClick={() => handleCopyLoginInfo(u)}
                            title="Salin ID Guru & Username"
                            aria-label={`Salin Info Login ${u.namaLengkap}`}
                            className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                          >
                            {copiedUserId === u.userId ? (
                              <Check className="w-4 h-4 text-[#3B7551]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActivityUser(u)}
                          title="Lihat Aktivitas Guru"
                          aria-label={`Riwayat Aktivitas ${u.namaLengkap}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(u);
                            setNewPasswordInput('');
                          }}
                          title="Reset Password"
                          aria-label={`Reset Password ${u.namaLengkap}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          aria-label={`Edit ${u.namaLengkap}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            aria-label={`Hapus ${u.namaLengkap}`}
                            className="p-1.5 rounded-lg text-[#B44238] hover:bg-[#B44238]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Guru Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 className="text-lg font-bold">
                {editingUser ? 'Edit Data Pengajar' : 'Tambah Guru / Pengajar Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup Form Pengajar"
                className="p-1 text-[#6B776D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGuru} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guru-id-input" className="block font-semibold mb-1">
                    ID Login Guru
                  </label>
                  <input
                    id="guru-id-input"
                    type="text"
                    value={formGuruId}
                    onChange={(e) => setFormGuruId(e.target.value)}
                    placeholder="GRU-003"
                    className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
                <div>
                  <label htmlFor="guru-status-select" className="block font-semibold mb-1">
                    Status Akun
                  </label>
                  <select
                    id="guru-status-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="guru-nama-input" className="block font-semibold mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  id="guru-nama-input"
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Ustadz Syamsu Muhajir"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guru-username-input" className="block font-semibold mb-1">
                    Username Login
                  </label>
                  <input
                    id="guru-username-input"
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: ahmad"
                    className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
                <div>
                  <label htmlFor="guru-role-select" className="block font-semibold mb-1">
                    Hak Akses
                  </label>
                  <select
                    id="guru-role-select"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="GURU">GURU / PENGAJAR</option>
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guru-wa-input" className="block font-semibold mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    id="guru-wa-input"
                    type="text"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="0813-xxxx-xxxx"
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label htmlFor="guru-pw-input" className="block font-semibold mb-1">
                      Password Awal (Min. 5 Karakter)
                    </label>
                    <input
                      id="guru-pw-input"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Buat password awal guru"
                      className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1.5">Kelas yang Diampu</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]">
                  {db.kelas.map((k) => (
                    <label key={k.kelasId} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formKelasIds.includes(k.kelasId)}
                        onChange={() => toggleClassSelection(k.kelasId)}
                        className="accent-[#19432D]"
                      />
                      <span>{k.namaKelas}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E3EAE3] dark:border-[#24382C] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg font-semibold bg-[#19432D] text-white"
                >
                  Simpan Pengajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-base font-bold">
              Reset Password — {resetTarget.namaLengkap}
            </h2>
            <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-1">
              Password baru akan di-hash secara kriptografis menggunakan scrypt di server.
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Masukkan password baru (minimal 5 karakter)"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F3F7F2] dark:bg-[#1B2B22]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#19432D] text-white"
                >
                  Simpan Password Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Activity Modal */}
      {activityUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 className="text-base font-bold">
                Riwayat Aktivitas — {activityUser.namaLengkap}
              </h2>
              <button
                type="button"
                onClick={() => setActivityUser(null)}
                className="text-xs px-3 py-1 rounded bg-[#F3F7F2] dark:bg-[#1B2B22]"
              >
                Tutup
              </button>
            </div>
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2.5 text-xs">
              {db.activityLogs
                .filter((l) => l.namaPengguna === activityUser.namaLengkap || l.userId === activityUser.userId)
                .map((l) => (
                  <div
                    key={l.logId}
                    className="p-3 rounded-xl bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <div className="flex justify-between font-semibold text-[#19432D] dark:text-[#A3D1B3]">
                      <span>{l.jenisData} ({l.aksi})</span>
                      <span className="font-mono">{l.timestamp.slice(0, 10)}</span>
                    </div>
                    <p className="mt-1">{l.keterangan}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
