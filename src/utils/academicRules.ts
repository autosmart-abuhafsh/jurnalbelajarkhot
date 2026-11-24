import {
  Absensi,
  BatasPredikat,
  JurnalPembelajaran,
  Penilaian,
  RubrikPenilaian,
  Santri,
} from '../types';

/**
 * Nilai Akhir per pertemuan:
 * Nilai Akhir = Total (Nilai Kriteria × Bobot) / Total Bobot Kriteria yang Dinilai.
 * Nilai yang belum diisi (null) tidak boleh masuk sebagai nilai nol dalam perhitungan.
 */
export function calculateSessionFinalScore(
  scores: Array<{ nilai: number | null; bobot: number }>
): number | null {
  const validScores = scores.filter(
    (s): s is { nilai: number; bobot: number } =>
      s.nilai !== null && s.nilai !== undefined && !Number.isNaN(s.nilai) && s.bobot > 0
  );

  if (validScores.length === 0) {
    return null;
  }

  const totalWeighted = validScores.reduce((acc, item) => acc + item.nilai * item.bobot, 0);
  const totalWeight = validScores.reduce((acc, item) => acc + item.bobot, 0);

  if (totalWeight <= 0) {
    return null;
  }

  return Number((totalWeighted / totalWeight).toFixed(2));
}

/**
 * Rata-rata Nilai Bulanan:
 * Rata-rata Nilai Bulanan = Total Nilai Akhir Pertemuan yang Sudah Dinilai / Jumlah Pertemuan yang Sudah Dinilai.
 * Nilai yang belum diisi (null) tidak boleh masuk sebagai nilai nol.
 */
export function calculateMonthlyAverageScore(sessionFinalScores: Array<number | null>): number | null {
  const graded = sessionFinalScores.filter(
    (val): val is number => val !== null && val !== undefined && !Number.isNaN(val)
  );
  if (graded.length === 0) {
    return null;
  }
  const sum = graded.reduce((acc, v) => acc + v, 0);
  return Number((sum / graded.length).toFixed(2));
}

/**
 * Menentukan Predikat (A, B, C, D, atau '-') dari nilai numerik dan batas predikat.
 */
export function getGradePredicate(
  score: number | null,
  thresholds: BatasPredikat = { A: 90, B: 80, C: 70 }
): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return 'Belum Dinilai';
  }
  if (score >= thresholds.A) return 'A';
  if (score >= thresholds.B) return 'B';
  if (score >= thresholds.C) return 'C';
  return 'D';
}

/**
 * Deskripsi kualitatif singkat berdasarkan predikat.
 */
export function getPredicateLabel(predikat: string): string {
  switch (predikat) {
    case 'A':
      return 'Sangat Baik (Mumtaz)';
    case 'B':
      return 'Baik (Jayyid Jiddan)';
    case 'C':
      return 'Cukup (Jayyid)';
    case 'D':
      return 'Perlu Pembinaan (Maqbul)';
    default:
      return 'Belum Dinilai';
  }
}

/**
 * Persentase Kehadiran:
 * Persentase Kehadiran = (Jumlah Hadir / Total Pertemuan yang Menjadi Kewajiban Santri) × 100%.
 * Santri yang baru bergabung tidak boleh dihitung absen pada pertemuan sebelum tanggal bergabungnya.
 */
export interface AttendanceSummary {
  totalKewajibanPertemuan: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  belumDicatat: number;
  persentaseKehadiran: number;
}

export function calculateStudentAttendanceSummary(
  santri: Pick<Santri, 'santriId' | 'kelasId' | 'tanggalBergabung'>,
  classJournals: Array<Pick<JurnalPembelajaran, 'jurnalId' | 'kelasId' | 'tanggal'>>,
  attendanceRecords: Array<Pick<Absensi, 'jurnalId' | 'santriId' | 'statusKehadiran'>>
): AttendanceSummary {
  // Filter jurnal yang berada di kelas santri DAN tanggal >= tanggalBergabung santri
  const eligibleJournals = classJournals.filter(
    (j) => j.kelasId === santri.kelasId && j.tanggal >= santri.tanggalBergabung
  );

  const eligibleJournalIds = new Set(eligibleJournals.map((j) => j.jurnalId));
  let hadir = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;

  const seenJournals = new Set<string>();

  for (const rec of attendanceRecords) {
    if (
      rec.santriId === santri.santriId &&
      eligibleJournalIds.has(rec.jurnalId) &&
      !seenJournals.has(rec.jurnalId)
    ) {
      seenJournals.add(rec.jurnalId);
      if (rec.statusKehadiran === 'Hadir') hadir++;
      else if (rec.statusKehadiran === 'Izin') izin++;
      else if (rec.statusKehadiran === 'Sakit') sakit++;
      else if (rec.statusKehadiran === 'Alpa') alpa++;
    }
  }

  const totalKewajibanPertemuan = eligibleJournals.length;
  const belumDicatat = Math.max(0, totalKewajibanPertemuan - (hadir + izin + sakit + alpa));
  const persentaseKehadiran =
    totalKewajibanPertemuan > 0
      ? Number(((hadir / totalKewajibanPertemuan) * 100).toFixed(2))
      : 0;

  return {
    totalKewajibanPertemuan,
    hadir,
    izin,
    sakit,
    alpa,
    belumDicatat,
    persentaseKehadiran,
  };
}

/**
 * Validasi skala nilai 0 - 100.
 */
export function validateScoreInput(value: number | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (value === null || value === undefined) {
    return { valid: true }; // Belum dinilai diperbolehkan
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return { valid: false, error: 'Nilai harus berupa angka yang valid.' };
  }
  if (value < 0 || value > 100) {
    return { valid: false, error: 'Nilai harus berada dalam rentang 0 hingga 100.' };
  }
  return { valid: true };
}

/**
 * Validasi total bobot rubrik aktif untuk satu program Khot harus 100%.
 */
export function validateProgramRubricWeights(
  rubriks: Array<Pick<RubrikPenilaian, 'programKhot' | 'bobot' | 'statusAktif'>>,
  programKhot: string
): { valid: boolean; totalBobot: number; error?: string } {
  const activeRubriks = rubriks.filter(
    (r) => r.programKhot === programKhot && r.statusAktif
  );
  const totalBobot = activeRubriks.reduce((sum, r) => sum + Number(r.bobot || 0), 0);

  if (Math.round(totalBobot * 100) / 100 !== 100) {
    return {
      valid: false,
      totalBobot,
      error: `Total bobot kriteria aktif untuk ${programKhot} saat ini ${totalBobot}%. Total bobot wajib tepat 100%.`,
    };
  }
  return { valid: true, totalBobot: 100 };
}

/**
 * Mencegah absensi ganda untuk kombinasi jurnalId dan santriId yang sama.
 */
export function upsertAttendanceRecord(
  existingList: Absensi[],
  newRecord: Absensi
): Absensi[] {
  const idx = existingList.findIndex(
    (a) => a.jurnalId === newRecord.jurnalId && a.santriId === newRecord.santriId
  );
  if (idx >= 0) {
    const updated = [...existingList];
    updated[idx] = {
      ...existingList[idx],
      statusKehadiran: newRecord.statusKehadiran,
      keterangan: newRecord.keterangan,
      updatedAt: newRecord.updatedAt,
    };
    return updated;
  }
  return [...existingList, newRecord];
}

/**
 * Menghitung rata-rata per aspek penilaian untuk rapor bulanan.
 */
export function calculateAspectAveragesForPeriod(
  penilaianList: Penilaian[],
  santriId: string,
  validJournalIds: Set<string>,
  thresholds: BatasPredikat
): Array<{
  aspekId: string;
  namaAspek: string;
  rataRata: number | null;
  predikat: string;
  bobotTerakhir: number;
}> {
  const filtered = penilaianList.filter(
    (p) => p.santriId === santriId && validJournalIds.has(p.jurnalId)
  );

  const grouped = new Map<
    string,
    { namaAspek: string; values: number[]; bobot: number }
  >();

  for (const item of filtered) {
    if (!grouped.has(item.aspekId)) {
      grouped.set(item.aspekId, {
        namaAspek: item.namaAspek,
        values: [],
        bobot: item.bobot,
      });
    }
    const entry = grouped.get(item.aspekId)!;
    if (item.nilai !== null && item.nilai !== undefined && !Number.isNaN(item.nilai)) {
      entry.values.push(item.nilai);
    }
  }

  const results: Array<{
    aspekId: string;
    namaAspek: string;
    rataRata: number | null;
    predikat: string;
    bobotTerakhir: number;
  }> = [];

  for (const [aspekId, data] of grouped.entries()) {
    const avg =
      data.values.length > 0
        ? Number(
            (data.values.reduce((a, b) => a + b, 0) / data.values.length).toFixed(2)
          )
        : null;
    results.push({
      aspekId,
      namaAspek: data.namaAspek,
      rataRata: avg,
      predikat: getGradePredicate(avg, thresholds),
      bobotTerakhir: data.bobot,
    });
  }

  return results;
}

/**
 * Helper nama hari Bahasa Indonesia dari tanggal YYYY-MM-DD
 */
export function getIndonesianDayName(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '-';
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()] || '-';
}

/**
 * Format tanggal YYYY-MM-DD menjadi DD/MM/YYYY atau "17 November 2026"
 */
export function formatDateLongId(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${parts[2]} ${months[parts[1] - 1] || ''} ${parts[0]}`;
}

export function formatDateShortId(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Generate nomor jurnal otomatis unik: JRN-YYYYMM-XXX
 */
export function generateNomorJurnal(tanggal: string, existingJournals: JurnalPembelajaran[]): string {
  const ym = tanggal ? tanggal.slice(0, 7).replace('-', '') : '202611';
  const prefix = `JRN-${ym}-`;
  let maxNum = 0;
  for (const j of existingJournals) {
    if (j.nomorJurnal && j.nomorJurnal.startsWith(prefix)) {
      const numPart = parseInt(j.nomorJurnal.slice(prefix.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Generate ID Guru unik berikutnya (GRU-001, GRU-002, ...)
 */
export function generateNextGuruId(
  users: Array<{ guruId?: string; userId: string }>
): string {
  const prefix = 'GRU-';
  let maxNum = 0;
  for (const u of users) {
    const candidate = (u.guruId || '').trim().toUpperCase();
    if (candidate.startsWith(prefix)) {
      const parsed = parseInt(candidate.slice(prefix.length), 10);
      if (!Number.isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Generate ID Login Admin unik berikutnya (ADM-001, ADM-002, ...)
 */
export function generateNextAdminId(
  users: Array<{ guruId?: string; userId: string }>
): string {
  const prefix = 'ADM-';
  const taken = new Set(
    users
      .flatMap((u) => [u.guruId || '', u.userId || ''])
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
  let num = 1;
  while (taken.has(`${prefix}${String(num).padStart(3, '0')}`)) {
    num++;
  }
  return `${prefix}${String(num).padStart(3, '0')}`;
}

/**
 * Mencari akun pengguna berdasarkan Username ATAU ID Guru (case-insensitive).
 */
export function findUserByLoginIdentifier<
  T extends { username: string; guruId?: string }
>(users: T[], identifier: string): T | undefined {
  const norm = identifier.trim().toLowerCase();
  if (!norm) return undefined;
  return users.find(
    (u) =>
      u.username.toLowerCase() === norm ||
      (Boolean(u.guruId) && u.guruId!.trim().toLowerCase() === norm)
  );
}

/**
 * Validasi akses portal login antara Portal Guru dan Portal Administrator.
 */
export function validatePortalRoleAccess(
  userRole: 'ADMIN' | 'GURU',
  portalMode?: 'GURU' | 'ADMIN'
): { allowed: boolean; error?: string } {
  if (!portalMode) return { allowed: true };
  if (portalMode === 'GURU' && userRole !== 'GURU') {
    return {
      allowed: false,
      error: 'Akun Administrator harus masuk melalui tab Administrator.',
    };
  }
  if (portalMode === 'ADMIN' && userRole !== 'ADMIN') {
    return {
      allowed: false,
      error: 'Akun Guru silakan masuk melalui tab Portal Guru menggunakan ID Guru atau Username.',
    };
  }
  return { allowed: true };
}

