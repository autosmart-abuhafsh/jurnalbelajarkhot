import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AktivitasPage: React.FC = () => {
  const { db } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('ALL');
  const [filterAksi, setFilterAksi] = useState('ALL');

  const uniqueJenis = Array.from(new Set(db.activityLogs.map((l) => l.jenisData)));

  const filteredLogs = useMemo(() => {
    return db.activityLogs.filter((l) => {
      const q = searchQuery.trim().toLowerCase();
      if (
        q &&
        !l.namaPengguna.toLowerCase().includes(q) &&
        !l.keterangan.toLowerCase().includes(q) &&
        !l.nilaiTerbaru.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterJenis !== 'ALL' && l.jenisData !== filterJenis) return false;
      if (filterAksi !== 'ALL' && l.aksi !== filterAksi) return false;
      return true;
    });
  }, [db.activityLogs, searchQuery, filterJenis, filterAksi]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#26332A] dark:text-[#ECF3EE]">
          Riwayat Aktivitas &amp; Audit Log Akademik
        </h1>
        <p className="text-xs text-[#6B776D] dark:text-[#A3D1B3]/80 mt-0.5">
          Catatan audit seluruh perubahan data jurnal, absensi, koreksi nilai, dan penerbitan rapor
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-[#6B776D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengguna, keterangan, atau data yang diubah..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          />
        </div>

        <select
          value={filterJenis}
          onChange={(e) => setFilterJenis(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
        >
          <option value="ALL">Semua Jenis Data</option>
          {uniqueJenis.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <select
            value={filterAksi}
            onChange={(e) => setFilterAksi(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#FAFCF9] dark:bg-[#1B2B22] border border-[#E3EAE3] dark:border-[#24382C]"
          >
            <option value="ALL">Semua Aksi</option>
            <option value="TAMBAH">TAMBAH</option>
            <option value="EDIT">EDIT / KOREKSI</option>
            <option value="HAPUS">HAPUS</option>
            <option value="CETAK">CETAK / TERBIT</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterJenis('ALL');
              setFilterAksi('ALL');
            }}
            aria-label="Reset Filter Log"
            className="p-2 rounded-lg bg-[#F3F7F2] dark:bg-[#1B2B22] text-[#6B776D]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#142019] border border-[#E3EAE3] dark:border-[#24382C] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E3EAE3] dark:border-[#24382C] bg-[#F3F7F2]/60 dark:bg-[#1B2B22]/60 font-semibold text-[#6B776D] dark:text-[#A3D1B3]">
                <th className="py-3.5 pl-6 pr-3">Waktu Perubahan</th>
                <th className="py-3.5 px-3">Pengguna</th>
                <th className="py-3.5 px-3">Jenis Data &amp; Aksi</th>
                <th className="py-3.5 px-3">Data Sebelumnya</th>
                <th className="py-3.5 px-3">Data Terbaru</th>
                <th className="py-3.5 pl-3 pr-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3EAE3] dark:divide-[#24382C]">
              {filteredLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-[#F3F7F2]/40 dark:hover:bg-[#1B2B22]/40">
                  <td className="py-3.5 pl-6 pr-3 font-mono tabular-nums whitespace-nowrap text-[#6B776D] dark:text-[#A3D1B3]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.timestamp.replace('T', ' ').slice(0, 16)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold whitespace-nowrap">
                    {log.namaPengguna}
                    <span className="block font-normal text-[#6B776D] dark:text-[#A3D1B3]/80">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-[#19432D] dark:text-[#A3D1B3] whitespace-nowrap">
                    {log.jenisData} · {log.aksi}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#6B776D] dark:text-[#A3D1B3]/80 max-w-[180px] truncate">
                    {log.nilaiSebelumnya}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-semibold text-[#26332A] dark:text-[#ECF3EE] max-w-[220px] truncate">
                    {log.nilaiTerbaru}
                  </td>
                  <td className="py-3.5 pl-3 pr-6 text-[#26332A] dark:text-[#ECF3EE]">
                    {log.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
