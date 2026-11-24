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
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Role, User } from '../types';
import { generateNextAdminId, generateNextGuruId } from '../utils/academicRules';

export const GuruPage: React.FC = () => {
  const {
    db,
    currentUser,
    saveGuru,
    deleteGuru,
    resetUserPassword,
    askConfirm,
    closeConfirm,
    showToast,
  } = useApp();

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'GURU'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formGuruId, setFormGuruId] = useState('');
  const [idManuallyEdited, setIdManuallyEdited] = useState(false);
  const [formNama, setFormNama] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formRole, setFormRole] = useState<Role>('GURU');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formKelasIds, setFormKelasIds] = useState<string[]>([]);

  // Password Reset Modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Teacher Activity Log Modal
  const [activityUser, setActivityUser] = useState<User | null>(null);

  // Copy feedback + newly created/updated login ID notice
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [recentCreatedNotice, setRecentCreatedNotice] = useState<{
    nama: string;
    loginId: string;
    username: string;
    role: Role;
    action: 'created' | 'updated';
  } | null>(null);

  const summary = useMemo(() => {
    const teachers = db.users.filter((u) => u.role === 'GURU');
    const admins = db.users.filter((u) => u.role === 'ADMIN');
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
      totalAdmins: admins.length,
      activeTeachers: activeTeachers.length,
      coveredClasses: coveredClassIds.size,
    };
  }, [db.users, db.kelas]);

  const displayedUsers = useMemo(() => {
    if (roleFilter === 'ALL') return db.users;
    return db.users.filter((u) => u.role === roleFilter);
  }, [db.users, roleFilter]);

  const openAddModal = (defaultRole: Role = 'GURU') => {
    setEditingUser(null);
    setFormRole(defaultRole);
    setFormGuruId(
      defaultRole === 'ADMIN' ? generateNextAdminId(db.users) : generateNextGuruId(db.users)
    );
    setIdManuallyEdited(false);
    setFormNama('');
    setFormUsername('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormWhatsapp('');
    setFormStatus('Aktif');
    setFormKelasIds([]);
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormGuruId(u.guruId || u.userId);
    setIdManuallyEdited(true);
    setFormNama(u.namaLengkap);
    setFormUsername(u.username);
    setFormPassword('');
    setShowFormPassword(false);
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

  const handleRoleChangeInModal = (nextRole: Role) => {
    setFormRole(nextRole);
    if (!editingUser && !idManuallyEdited) {
      setFormGuruId(
        nextRole === 'ADMIN' ? generateNextAdminId(db.users) : generateNextGuruId(db.users)
      );
    }
  };

  const handleRegenerateId = () => {
    setFormGuruId(
      formRole === 'ADMIN' ? generateNextAdminId(db.users) : generateNextGuruId(db.users)
    );
    setIdManuallyEdited(false);
  };

  const toggleClassSelection = (kelasId: string) => {
    setFormKelasIds((prev) =>
      prev.includes(kelasId) ? prev.filter((id) => id !== kelasId) : [...prev, kelasId]
    );
  };

  const handleCopyLoginInfo = async (u: User) => {
    const loginId = u.guruId || u.userId;
    const portalName = u.role === 'ADMIN' ? 'Administrator' : 'Portal Guru';
    const idLabel = u.role === 'ADMIN' ? 'ID Login Admin' : 'ID Guru';
    const text = `Akses ${portalName} Belajar Khot\nNama: ${u.namaLengkap}\n${idLabel}: ${loginId}\nUsername: ${u.username}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUserId(u.userId);
      setTimeout(() => setCopiedUserId(null), 2000);
      showToast(
        'info',
        'Info Login Disalin',
        `${idLabel} (${loginId}) dan username ${u.username} disalin ke clipboard.`
      );
    } catch {
      showToast('info', `Info Login ${portalName}`, `${idLabel}: ${loginId} · Username: ${u.username}`);
    }
  };

  const handleSaveGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNama = formNama.trim();
    const normalizedUsername = formUsername.trim().toLowerCase();
    const trimmedLoginId = formGuruId.trim();
    const normalizedLoginId = trimmedLoginId.toLowerCase();

    if (!trimmedNama || !normalizedUsername || !trimmedLoginId) {
      showToast(
        'warning',
        'Data Belum Lengkap',
        `${formRole === 'ADMIN' ? 'ID Login Admin' : 'ID Login Guru'}, Nama Lengkap, dan Username wajib diisi.`
      );
      return;
    }

    const duplicateUsername = db.users.some(
      (u) =>
        u.userId !== editingUser?.userId &&
        (u.username.trim().toLowerCase() === normalizedUsername ||
          (u.guruId || '').trim().toLowerCase() === normalizedUsername)
    );
    if (duplicateUsername) {
      showToast(
        'error',
        'Username Sudah Digunakan',
        `Username "${normalizedUsername}" sudah digunakan oleh akun lain.`
      );
      return;
    }

    const duplicateLoginId = db.users.some(
      (u) =>
        u.userId !== editingUser?.userId &&
        ((u.guruId || '').trim().toLowerCase() === normalizedLoginId ||
          u.username.trim().toLowerCase() === normalizedLoginId)
    );
    if (duplicateLoginId) {
      showToast(
        'error',
        'ID Login Sudah Digunakan',
        `ID Login "${trimmedLoginId}" sudah terdaftar pada akun lain.`
      );
      return;
    }

    const trimmedPassword = formPassword.trim();
    if (!editingUser && trimmedPassword.length < 5) {
      showToast(
        'warning',
        'Password Awal Minimal 5 Karakter',
        'Tentukan password awal minimal 5 karakter untuk akun baru.'
      );
      return;
    }

    if (editingUser && trimmedPassword.length > 0 && trimmedPassword.length < 5) {
      showToast(
        'warning',
        'Password Baru Minimal 5 Karakter',
        'Password baru minimal 5 karakter, atau kosongkan jika tidak ingin mengubah password.'
      );
      return;
    }

    const record: User = {
      userId: editingUser ? editingUser.userId : 'USR-' + Date.now(),
      guruId: trimmedLoginId,
      namaLengkap: trimmedNama,
      username: normalizedUsername,
      role: formRole,
      whatsapp: formWhatsapp.trim(),
      kelasDiampu: formRole === 'ADMIN' ? [] : formKelasIds,
      statusAkun: formStatus,
      isDemo: editingUser ? editingUser.isDemo : false,
    };

    const ok = await saveGuru(record, !editingUser, trimmedPassword || undefined);
    if (ok) {
      const idOrUsernameChanged =
        !editingUser ||
        (editingUser.guruId || '') !== trimmedLoginId ||
        editingUser.username !== normalizedUsername ||
        editingUser.role !== formRole;
      if (idOrUsernameChanged) {
        setRecentCreatedNotice({
          nama: record.namaLengkap,
          loginId: trimmedLoginId,
          username: record.username,
          role: record.role,
          action: editingUser ? 'updated' : 'created',
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
    if (u.userId === 'USR-ADMIN-01') {
      showToast('warning', 'Akses Dilindungi', 'Akun Administrator utama tidak dapat dihapus.');
      return;
    }
    if (currentUser?.userId === u.userId) {
      showToast('warning', 'Sedang Digunakan', 'Anda tidak dapat menghapus akun yang sedang aktif login.');
      return;
    }
    askConfirm({
      title: `Hapus Akun ${u.namaLengkap}?`,
      message: `Akun pengguna ${u.username} (${u.guruId || u.userId}) akan dihapus secara permanen dari sistem.`,
      confirmLabel: 'Ya, Hapus Akun',
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
            Modul Data Guru &amp; ID Login Admin
          </h1>
          <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
            Atur ID Login Administrator maupun ID Login Guru secara bebas, ubah username/password,
            serta atur pembagian kelas binaan pengajar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openAddModal('ADMIN')}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#FFFFFF] dark:bg-[#142019] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22] text-[#19432D] dark:text-[#A3D1B3] border border-[#E3EAE3] dark:border-[#24382C] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>+ Tambah Admin</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal('GURU')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#19432D] hover:bg-[#315B43] text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Tambah Guru / Pengajar</span>
          </button>
        </div>
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
            <span>Total Administrator</span>
            <ShieldCheck className="w-4 h-4 text-[#19432D] dark:text-[#A3D1B3]" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{summary.totalAdmins}</p>
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
      </div>

      {recentCreatedNotice && (
        <div className="rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#3B7551]/40 p-4 flex items-center justify-between gap-4">
          <div className="text-xs">
            <p className="font-bold text-[#19432D] dark:text-[#A3D1B3]">
              {recentCreatedNotice.role === 'ADMIN'
                ? `Akun Administrator Berhasil ${recentCreatedNotice.action === 'created' ? 'Dibuat' : 'Diperbarui'}`
                : `Akun Guru Berhasil ${recentCreatedNotice.action === 'created' ? 'Dibuat' : 'Diperbarui'}`}{' '}
              — {recentCreatedNotice.nama}
            </p>
            <p className="mt-1 text-[#26332A] dark:text-[#ECF3EE]">
              Gunakan {recentCreatedNotice.role === 'ADMIN' ? 'ID Login Admin' : 'ID Login Guru'}{' '}
              <span className="font-mono font-bold">{recentCreatedNotice.loginId}</span> (atau
              username <span className="font-mono font-bold">{recentCreatedNotice.username}</span>)
              untuk masuk melalui tab{' '}
              <span className="font-semibold">
                {recentCreatedNotice.role === 'ADMIN' ? 'Administrator' : 'Portal Guru'}
              </span>
              .
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

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter Peran Akun"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          {(
            [
              { key: 'ALL', label: `Semua Akun (${db.users.length})` },
              { key: 'ADMIN', label: `Administrator (${summary.totalAdmins})` },
              { key: 'GURU', label: `Guru / Pengajar (${summary.totalTeachers})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={roleFilter === tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                roleFilter === tab.key
                  ? 'bg-[#FFFFFF] dark:bg-[#142019] text-[#19432D] dark:text-[#A3D1B3] shadow-xs border border-[#E3EAE3] dark:border-[#24382C]'
                  : 'text-[#6B776D] dark:text-[#ECF3EE]/70 hover:text-[#26332A] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#F3F7F2]/60 dark:bg-[#1B2B22]/60 text-xs font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                <th className="py-3.5 pl-6 pr-3">ID Login (Admin / Guru)</th>
                <th className="py-3.5 px-3">Nama Lengkap</th>
                <th className="py-3.5 px-3">Username &amp; Hak Akses</th>
                <th className="py-3.5 px-3">WhatsApp</th>
                <th className="py-3.5 px-3">Kelas yang Diampu</th>
                <th className="py-3.5 px-3">Status Akun</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
              {displayedUsers.map((u) => {
                const assignedNames = db.kelas
                  .filter(
                    (k) =>
                      (u.kelasDiampu || []).includes(k.kelasId) ||
                      (Boolean(u.guruId) && k.guruId === u.guruId)
                  )
                  .map((k) => k.namaKelas);
                const canDelete = u.userId !== 'USR-ADMIN-01' && currentUser?.userId !== u.userId;
                return (
                  <tr key={u.userId} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                    <td className="py-3.5 pl-6 pr-3 font-mono text-xs font-semibold text-[#19432D] dark:text-[#A3D1B3] whitespace-nowrap">
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
                        <button
                          type="button"
                          onClick={() => handleCopyLoginInfo(u)}
                          title={
                            u.role === 'ADMIN'
                              ? 'Salin ID Login Admin & Username'
                              : 'Salin ID Guru & Username'
                          }
                          aria-label={`Salin Info Login ${u.namaLengkap}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          {copiedUserId === u.userId ? (
                            <Check className="w-4 h-4 text-[#3B7551]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityUser(u)}
                          title="Lihat Aktivitas Akun"
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
                          title="Edit ID Login & Data Akun"
                          aria-label={`Edit ${u.namaLengkap}`}
                          className="p-1.5 rounded-lg text-[#6B776D] hover:text-[#19432D] hover:bg-[#F3F7F2] dark:hover:bg-[#1B2B22]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u)}
                            title="Hapus Akun"
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

      {/* Add/Edit Account Modal (Guru & Administrator) */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        >
          <div className="bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EAE3] dark:border-[#24382C]">
              <h2 className="text-lg font-bold">
                {editingUser
                  ? formRole === 'ADMIN'
                    ? 'Edit ID Login & Data Administrator'
                    : 'Edit Data Pengajar'
                  : formRole === 'ADMIN'
                    ? 'Tambah Akun Administrator Baru'
                    : 'Tambah Guru / Pengajar Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup Form Akun"
                className="p-1 text-[#6B776D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGuru} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label htmlFor="guru-id-input" className="block font-semibold">
                      {formRole === 'ADMIN' ? 'ID Login Admin' : 'ID Login Guru'}
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateId}
                      className="text-[11px] font-semibold text-[#19432D] dark:text-[#A3D1B3] hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Otomatis</span>
                    </button>
                  </div>
                  <input
                    id="guru-id-input"
                    type="text"
                    value={formGuruId}
                    onChange={(e) => {
                      setFormGuruId(e.target.value);
                      setIdManuallyEdited(true);
                    }}
                    placeholder={formRole === 'ADMIN' ? 'Bebas, misal: ADM-001' : 'Misal: GRU-003'}
                    className="w-full px-3 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  />
                  <p className="mt-1 text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/75">
                    Dapat diubah bebas dan dipakai untuk login.
                  </p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guru-username-input" className="block font-semibold mb-1">
                    Username Login
                  </label>
                  <input
                    id="guru-username-input"
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Contoh: ustadzsyamsu"
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
                    onChange={(e) => handleRoleChangeInModal(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                  >
                    <option value="GURU">GURU / PENGAJAR</option>
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label htmlFor="guru-pw-input" className="block font-semibold mb-1">
                    {editingUser ? 'Password Baru (Opsional)' : 'Password Awal (Min. 5 Karakter)'}
                  </label>
                  <div className="relative">
                    <input
                      id="guru-pw-input"
                      type={showFormPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={
                        editingUser ? 'Kosongkan jika tetap' : 'Buat password awal akun'
                      }
                      className="w-full pl-3 pr-9 py-2 font-mono rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword((prev) => !prev)}
                      aria-label={
                        showFormPassword ? 'Sembunyikan password form' : 'Tampilkan password form'
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B776D] hover:text-[#19432D] dark:hover:text-[#A3D1B3]"
                    >
                      {showFormPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {formRole === 'ADMIN' ? (
                <div className="p-3 rounded-xl bg-[#F3F7F2] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C] text-[#26332A] dark:text-[#ECF3EE] leading-relaxed">
                  <p className="font-semibold text-[#19432D] dark:text-[#A3D1B3]">
                    Hak Akses Administrator Penuh
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B776D] dark:text-[#A3D1B3]/80">
                    Akun Administrator memiliki akses penuh ke seluruh kelas, data santri, guru, dan
                    pengaturan lembaga. Login menggunakan ID Login Admin atau Username melalui tab{' '}
                    <span className="font-semibold">Administrator</span>.
                  </p>
                </div>
              ) : (
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
              )}

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
                  className="px-5 py-2 rounded-lg font-semibold bg-[#19432D] text-white whitespace-nowrap"
                >
                  {formRole === 'ADMIN' ? 'Simpan Administrator' : 'Simpan Pengajar'}
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
