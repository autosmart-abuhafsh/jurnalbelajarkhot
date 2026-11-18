export type Role = 'ADMIN' | 'GURU';

export type ProgramKhot = 'Khot Naskhi' | "Khot Riq'ah" | string;
export type MetodePembelajaran = 'Online' | 'Offline';
export type StatusKeanggotaan = 'Aktif' | 'Cuti' | 'Lulus' | 'Nonaktif';
export type StatusKehadiran = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
export type StatusJurnal = 'Draft' | 'Selesai';

export interface User {
  userId: string;
  username: string;
  namaLengkap: string;
  role: Role;
  guruId?: string;
  foto?: string;
  whatsapp?: string;
  kelasDiampu: string[]; // array of kelasId
  statusAkun: 'Aktif' | 'Nonaktif';
  isDemo?: boolean;
}

export interface Santri {
  santriId: string;
  memberId: string; // e.g., BK-00001
  namaLengkap: string;
  fotoProfil?: string;
  programKhot: ProgramKhot;
  metodePembelajaran: MetodePembelajaran;
  kelasId: string;
  namaKelas: string;
  guruId: string;
  namaGuru: string;
  tanggalBergabung: string; // YYYY-MM-DD
  statusKeanggotaan: StatusKeanggotaan;
  whatsapp?: string;
  isDemo?: boolean;
}

export interface Kelas {
  kelasId: string;
  namaKelas: string;
  programKhot: ProgramKhot;
  metodePembelajaran: MetodePembelajaran;
  guruId: string;
  namaGuru: string;
  jadwal?: string;
  statusKelas: 'Aktif' | 'Nonaktif';
  isDemo?: boolean;
}

export interface JurnalPembelajaran {
  jurnalId: string;
  nomorJurnal: string; // e.g., JRN-202611-001
  tanggal: string; // YYYY-MM-DD
  hari: string;
  kelasId: string;
  namaKelas: string;
  programKhot: ProgramKhot;
  metodePembelajaran: MetodePembelajaran;
  guruId: string;
  namaGuru: string;
  pertemuanKe: number;
  materiPembelajaran: string;
  targetPembelajaran: string;
  ringkasanKegiatan: string;
  catatanGuru: string;
  statusJurnal: StatusJurnal;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDemo?: boolean;
}

export interface Absensi {
  absensiId: string;
  jurnalId: string;
  tanggal: string; // YYYY-MM-DD
  santriId: string;
  memberId: string;
  namaSantri: string;
  kelasId: string;
  statusKehadiran: StatusKehadiran;
  keterangan: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export interface RubrikPenilaian {
  aspekId: string;
  namaAspek: string;
  deskripsi: string;
  programKhot: ProgramKhot;
  bobot: number; // percentage 0-100
  urutan: number;
  statusAktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PenilaianEditRecord {
  editedAt: string;
  editedBy: string;
  nilaiLama: number | null;
  nilaiBaru: number | null;
  alasanKoreksi: string;
}

export interface Penilaian {
  penilaianId: string;
  jurnalId: string;
  tanggal: string; // YYYY-MM-DD
  santriId: string;
  memberId: string;
  aspekId: string;
  namaAspek: string;
  nilai: number | null; // 0-100 or null if Belum Dinilai
  bobot: number; // historical weight at time of grading
  catatanPenilaian: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  riwayatEdit?: PenilaianEditRecord[];
  isDemo?: boolean;
}

export interface CatatanPerkembangan {
  catatanId: string;
  santriId: string;
  jurnalId: string;
  tanggal: string;
  kategoriCatatan: 'Perkembangan' | 'Koreksi' | 'Apresiasi' | 'Latihan';
  isiCatatan: string;
  guruId: string;
  namaGuru: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface EvaluasiBulanan {
  perkembanganDicapai: string;
  halPerluDitingkatkan: string;
  rekomendasiLatihan: string;
  kesimpulanGuru: string;
}

export interface RiwayatRapor {
  raporId: string;
  nomorRapor: string;
  santriId: string;
  memberId: string;
  namaSantri: string;
  kelasId: string;
  namaKelas: string;
  programKhot: ProgramKhot;
  jenisRapor: 'HARIAN' | 'BULANAN';
  jurnalId?: string; // for Rapor Harian
  periodeAwal: string; // YYYY-MM-DD
  periodeAkhir: string; // YYYY-MM-DD
  periodeLabel: string; // e.g., "November 2026" or "15 November 2026"
  nilaiAkhir: number | null;
  predikat: string;
  persentaseKehadiran: number;
  evaluasiBulanan?: EvaluasiBulanan;
  catatanHarian?: string;
  tanggalPenerbitan: string;
  tempatPenerbitan: string;
  diterbitkanOleh: string;
  versiRapor: number;
  statusRapor: 'Draft' | 'Diterbitkan';
  isDemo?: boolean;
}

export interface ActivityLog {
  logId: string;
  userId: string;
  namaPengguna: string;
  role: Role;
  jenisData: string; // e.g. 'Penilaian', 'Absensi', 'Jurnal', 'Santri', 'Rapor', 'Rubrik'
  aksi: 'TAMBAH' | 'EDIT' | 'HAPUS' | 'CETAK' | 'LOGIN';
  entitasId: string;
  nilaiSebelumnya: string;
  nilaiTerbaru: string;
  keterangan: string;
  timestamp: string;
}

export interface BatasPredikat {
  A: number; // default 90
  B: number; // default 80
  C: number; // default 70
}

export interface LogoConfig {
  mode: 'vector' | 'image';
  imageUrl?: string;
  arabicSymbol?: string;
  nibColor?: string;
  showStarAndBook?: boolean;
  frameShape?: 'rounded' | 'circle' | 'square';
}

export interface TemaConfig {
  presetId: string;
  warnaUtama: string;
  warnaGradasi: string;
  warnaAksen: string;
}

export interface PengaturanAkademik {
  namaLembaga: string;
  subJudulLembaga: string;
  alamatLembaga: string;
  kotaPenerbitan: string;
  kepalaLembaga: string;
  nipKepalaLembaga: string;
  periodeAktif: string;
  tahunAkademik: string;
  skalaNilaiMin: number;
  skalaNilaiMaks: number;
  batasPredikat: BatasPredikat;
  izinkanGuruCetakRapor: boolean;
  tampilkanDataDemo: boolean;
  gasWebAppUrl: string;
  spreadsheetId: string;
  lastSyncAt: string;
  programs: string[];
  logoConfig?: LogoConfig;
  temaConfig?: TemaConfig;
}

export interface DatabaseState {
  users: User[];
  santri: Santri[];
  kelas: Kelas[];
  jurnal: JurnalPembelajaran[];
  absensi: Absensi[];
  rubrik: RubrikPenilaian[];
  penilaian: Penilaian[];
  catatanPerkembangan: CatatanPerkembangan[];
  riwayatRapor: RiwayatRapor[];
  activityLogs: ActivityLog[];
  pengaturan: PengaturanAkademik;
}
