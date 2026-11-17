export const SETUP_GS_SOURCE = `/**
 * SETUP.GS — INISIALISASI DATABASE JURNAL AKADEMIK BELAJAR KHOT
 * Sistem Pendamping Aplikasi Membership Management Belajar Khot
 *
 * Ketentuan Keamanan Database:
 * 1. Membuat sheet secara otomatis apabila belum tersedia.
 * 2. Mempertahankan seluruh data lama pada spreadsheet.
 * 3. TIDAK PERNAH menjalankan clear() atau menghapus baris data yang sudah ada.
 * 4. Jika sheet sudah memiliki data (Users, Members, Classes), hanya menambahkan
 *    kolom yang diperlukan secara aman tanpa merusak struktur lama.
 */

const REQUIRED_SHEETS_SCHEMA = {
  Users: ['userId', 'username', 'passwordHash', 'namaLengkap', 'role', 'guruId', 'foto', 'whatsapp', 'kelasDiampu', 'statusAkun', 'updatedAt'],
  Members: ['santriId', 'memberId', 'namaLengkap', 'fotoProfil', 'programKhot', 'metodePembelajaran', 'kelasId', 'namaKelas', 'guruId', 'namaGuru', 'tanggalBergabung', 'statusKeanggotaan', 'whatsapp'],
  Classes: ['kelasId', 'namaKelas', 'programKhot', 'metodePembelajaran', 'guruId', 'namaGuru', 'jadwal', 'statusKelas'],
  JurnalPembelajaran: ['jurnalId', 'nomorJurnal', 'tanggal', 'hari', 'kelasId', 'namaKelas', 'programKhot', 'metodePembelajaran', 'guruId', 'namaGuru', 'pertemuanKe', 'materiPembelajaran', 'targetPembelajaran', 'ringkasanKegiatan', 'catatanGuru', 'statusJurnal', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
  Absensi: ['absensiId', 'jurnalId', 'tanggal', 'santriId', 'memberId', 'namaSantri', 'kelasId', 'statusKehadiran', 'keterangan', 'createdAt', 'updatedAt'],
  Penilaian: ['penilaianId', 'jurnalId', 'tanggal', 'santriId', 'memberId', 'aspekId', 'namaAspek', 'nilai', 'bobot', 'catatanPenilaian', 'createdBy', 'updatedAt', 'updatedBy', 'riwayatEditJson'],
  RubrikPenilaian: ['aspekId', 'namaAspek', 'deskripsi', 'programKhot', 'bobot', 'urutan', 'statusAktif', 'createdAt', 'updatedAt'],
  CatatanPerkembangan: ['catatanId', 'santriId', 'jurnalId', 'tanggal', 'kategoriCatatan', 'isiCatatan', 'guruId', 'namaGuru', 'createdAt'],
  RiwayatRapor: ['raporId', 'nomorRapor', 'santriId', 'memberId', 'namaSantri', 'kelasId', 'namaKelas', 'programKhot', 'jenisRapor', 'jurnalId', 'periodeAwal', 'periodeAkhir', 'periodeLabel', 'nilaiAkhir', 'predikat', 'persentaseKehadiran', 'evaluasiJson', 'tanggalPenerbitan', 'tempatPenerbitan', 'diterbitkanOleh', 'versiRapor', 'statusRapor'],
  PengaturanAkademik: ['settingKey', 'settingValue', 'updatedAt'],
  ActivityLogs: ['logId', 'userId', 'namaPengguna', 'role', 'jenisData', 'aksi', 'entitasId', 'nilaiSebelumnya', 'nilaiTerbaru', 'keterangan', 'timestamp'],
  Settings: ['key', 'value', 'updatedAt']
};

function setupJurnalAkademikDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = [];
  Object.keys(REQUIRED_SHEETS_SCHEMA).forEach(function(sheetName) {
    const requiredColumns = REQUIRED_SHEETS_SCHEMA[sheetName];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, requiredColumns.length).setValues([requiredColumns]);
      sheet.setFrozenRows(1);
      report.push('Sheet dibuat: ' + sheetName);
    } else {
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.getRange(1, 1, 1, requiredColumns.length).setValues([requiredColumns]);
        sheet.setFrozenRows(1);
      } else {
        const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
        const missingCols = requiredColumns.filter(function(col) { return existingHeaders.indexOf(col) === -1; });
        if (missingCols.length > 0) {
          sheet.getRange(1, lastCol + 1, 1, missingCols.length).setValues([missingCols]);
          report.push('Kolom ditambahkan pada ' + sheetName + ': ' + missingCols.join(', '));
        }
      }
    }
  });
  return { success: true, details: report, timestamp: new Date().toISOString() };
}`;

export const CODE_GS_SOURCE = `/**
 * CODE.GS — ENDPOINT API JURNAL AKADEMIK BELAJAR KHOT
 * Menangani sinkronisasi aman antara Web App dan Google Sheets
 */

function doGet(e) { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  try {
    var payload = (method === 'POST' && e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents)
      : (e && e.parameter ? e.parameter : {});
    var action = payload.action || 'ping';

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'Jurnal Akademik Belajar Khot GAS API aktif.' });
    }
    if (action === 'setup') {
      return jsonResponse(setupJurnalAkademikDatabase());
    }
    if (action === 'syncSnapshot') {
      setupJurnalAkademikDatabase();
      return jsonResponse({ success: true, message: 'Sinkronisasi ke Google Sheets berhasil.', timestamp: new Date().toISOString() });
    }
    return jsonResponse({ success: false, error: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;
