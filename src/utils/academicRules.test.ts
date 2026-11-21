import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSessionFinalScore,
  calculateMonthlyAverageScore,
  getGradePredicate,
  calculateStudentAttendanceSummary,
  validateScoreInput,
  validateProgramRubricWeights,
  upsertAttendanceRecord,
  generateNomorJurnal,
} from './academicRules';
import {
  detectBasePathPrefix,
  normalizeInternalRoute,
  buildBrowserHistoryUrl,
  resolveGasEnvironmentConfig,
  extractGasUrlFromSearch,
} from './deploymentConfig';
import { Absensi, JurnalPembelajaran } from '../types';

test('calculateSessionFinalScore computes weighted average accurately', () => {
  // Example from PRD Section 11.B & 11.C:
  // Bentuk Huruf (25%): 90, Kaidah (20%): 85, Proporsi (20%): 88, Kerapian (15%): 90, Konsistensi (10%): 90, Tugas (10%): 88
  const score = calculateSessionFinalScore([
    { nilai: 90, bobot: 25 },
    { nilai: 85, bobot: 20 },
    { nilai: 88, bobot: 20 },
    { nilai: 90, bobot: 15 },
    { nilai: 90, bobot: 10 },
    { nilai: 88, bobot: 10 },
  ]);
  // (2250 + 1700 + 1760 + 1350 + 900 + 880) / 100 = 8840 / 100 = 88.4
  assert.equal(score, 88.4);
});

test('calculateSessionFinalScore ignores ungraded (null) criteria instead of counting as zero', () => {
  const score = calculateSessionFinalScore([
    { nilai: 90, bobot: 50 },
    { nilai: null, bobot: 50 },
  ]);
  // Only graded criteria count: (90 * 50) / 50 = 90
  assert.equal(score, 90);

  const allNull = calculateSessionFinalScore([
    { nilai: null, bobot: 60 },
    { nilai: null, bobot: 40 },
  ]);
  assert.equal(allNull, null);
});

test('calculateMonthlyAverageScore ignores null sessions', () => {
  const avg = calculateMonthlyAverageScore([90, 86, null, 88]);
  assert.equal(avg, 88);

  const emptyAvg = calculateMonthlyAverageScore([null, null]);
  assert.equal(emptyAvg, null);
});

test('getGradePredicate respects configurable thresholds', () => {
  const thresholds = { A: 90, B: 80, C: 70 };
  assert.equal(getGradePredicate(92, thresholds), 'A');
  assert.equal(getGradePredicate(85.5, thresholds), 'B');
  assert.equal(getGradePredicate(72, thresholds), 'C');
  assert.equal(getGradePredicate(65, thresholds), 'D');
  assert.equal(getGradePredicate(null, thresholds), 'Belum Dinilai');
});

test('calculateStudentAttendanceSummary excludes sessions prior to student tanggalBergabung', () => {
  const santri = {
    santriId: 'S-1',
    kelasId: 'K-1',
    tanggalBergabung: '2026-11-10',
  };
  const journals = [
    { jurnalId: 'J-1', kelasId: 'K-1', tanggal: '2026-11-01' }, // before join date!
    { jurnalId: 'J-2', kelasId: 'K-1', tanggal: '2026-11-10' }, // on join date
    { jurnalId: 'J-3', kelasId: 'K-1', tanggal: '2026-11-17' }, // after join date
  ];
  const attendance = [
    { jurnalId: 'J-2', santriId: 'S-1', statusKehadiran: 'Hadir' as const },
    { jurnalId: 'J-3', santriId: 'S-1', statusKehadiran: 'Izin' as const },
  ];

  const summary = calculateStudentAttendanceSummary(santri, journals, attendance);
  assert.equal(summary.totalKewajibanPertemuan, 2);
  assert.equal(summary.hadir, 1);
  assert.equal(summary.izin, 1);
  assert.equal(summary.persentaseKehadiran, 50);
});

test('validateScoreInput enforces 0-100 range and allows null', () => {
  assert.equal(validateScoreInput(null).valid, true);
  assert.equal(validateScoreInput(0).valid, true);
  assert.equal(validateScoreInput(100).valid, true);
  assert.equal(validateScoreInput(88.5).valid, true);
  assert.equal(validateScoreInput(-5).valid, false);
  assert.equal(validateScoreInput(105).valid, false);
});

test('validateProgramRubricWeights requires active criteria to sum to 100%', () => {
  const rubriks = [
    { programKhot: 'Khot Naskhi', bobot: 60, statusAktif: true },
    { programKhot: 'Khot Naskhi', bobot: 40, statusAktif: true },
    { programKhot: 'Khot Naskhi', bobot: 25, statusAktif: false },
  ];
  const res = validateProgramRubricWeights(rubriks, 'Khot Naskhi');
  assert.equal(res.valid, true);
  assert.equal(res.totalBobot, 100);

  const invalidRes = validateProgramRubricWeights(
    [{ programKhot: 'Khot Naskhi', bobot: 85, statusAktif: true }],
    'Khot Naskhi'
  );
  assert.equal(invalidRes.valid, false);
});

test('upsertAttendanceRecord prevents duplicate attendance for same jurnalId and santriId', () => {
  const initial: Absensi[] = [
    {
      absensiId: 'A-1',
      jurnalId: 'J-1',
      tanggal: '2026-11-01',
      santriId: 'S-1',
      memberId: 'BK-00001',
      namaSantri: 'Ahmad Abdullah',
      kelasId: 'K-1',
      statusKehadiran: 'Hadir',
      keterangan: '',
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
    },
  ];
  const duplicateUpdate: Absensi = {
    ...initial[0],
    absensiId: 'A-2',
    statusKehadiran: 'Sakit',
    keterangan: 'Demam',
    updatedAt: '2026-11-01T09:00:00Z',
  };
  const updated = upsertAttendanceRecord(initial, duplicateUpdate);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].statusKehadiran, 'Sakit');
  assert.equal(updated[0].keterangan, 'Demam');
});

test('generateNomorJurnal increments sequential journal numbers per month', () => {
  const existing = [
    { nomorJurnal: 'JRN-202611-001' } as JurnalPembelajaran,
    { nomorJurnal: 'JRN-202611-004' } as JurnalPembelajaran,
  ];
  assert.equal(generateNomorJurnal('2026-11-17', existing), 'JRN-202611-005');
});

test('GitHub Pages (github.io) subpath & 404 redirect routes normalize without blank screen', () => {
  assert.equal(detectBasePathPrefix('/jurnal-belajar-khot/'), '/jurnal-belajar-khot');
  assert.equal(detectBasePathPrefix('/jurnal-belajar-khot/admin/santri'), '/jurnal-belajar-khot');
  assert.equal(detectBasePathPrefix('/admin/dashboard'), '');

  assert.equal(normalizeInternalRoute('/jurnal-belajar-khot/'), '/admin/dashboard');
  assert.equal(normalizeInternalRoute('/jurnal-belajar-khot/index.html'), '/admin/dashboard');
  assert.equal(normalizeInternalRoute('/jurnal-belajar-khot/admin/pengaturan'), '/admin/pengaturan');
  assert.equal(normalizeInternalRoute('/jurnal-belajar-khot/', '?p=/admin/rapor-bulanan'), '/admin/rapor-bulanan');
  assert.equal(normalizeInternalRoute('/jurnal-belajar-khot/', '', '#/guru/jurnal'), '/guru/jurnal');

  assert.equal(
    buildBrowserHistoryUrl('/admin/santri', '/jurnal-belajar-khot/admin/dashboard', ''),
    '/jurnal-belajar-khot/admin/santri'
  );
  assert.equal(
    buildBrowserHistoryUrl('/admin/santri', '/jurnal-belajar-khot/', '', true),
    '/jurnal-belajar-khot/#/admin/santri'
  );
  assert.equal(
    buildBrowserHistoryUrl('/admin/santri', '/admin/dashboard', '?autostart=1'),
    '/admin/santri?autostart=1'
  );
  assert.equal(
    extractGasUrlFromSearch('?gas=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2FABC123%2Fexec'),
    'https://script.google.com/macros/s/ABC123/exec'
  );
});

test('resolveGasEnvironmentConfig prioritizes Vercel environment variables', () => {
  const resolved = resolveGasEnvironmentConfig(
    'https://script.google.com/macros/s/OLD_ID/exec',
    'OLD_SHEET',
    {
      GAS_WEB_APP_URL: 'https://script.google.com/macros/s/VERCEL_ENV_ID/exec',
      GAS_SPREADSHEET_ID: 'VERCEL_SHEET_ID',
    }
  );
  assert.equal(resolved.gasWebAppUrl, 'https://script.google.com/macros/s/VERCEL_ENV_ID/exec');
  assert.equal(resolved.spreadsheetId, 'VERCEL_SHEET_ID');
  assert.equal(resolved.isEnvInjected, true);
  assert.equal(resolved.autoSyncEnabled, true);
});

