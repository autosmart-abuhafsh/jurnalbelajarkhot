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
 * CODE.GS — ENDPOINT API JURNAL AKADEMIK BELAJAR KHOT (VERCEL.APP & GITHUB.IO READY)
 * Menangani sinkronisasi langsung 2 arah antara Web App (Vercel / GitHub Pages) & Google Sheets
 * Tanpa pernah menjalankan clear() agar seluruh data historis tetap aman.
 */

function doGet(e) { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  try {
    var payload = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    var action = payload.action || 'ping';

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'Jurnal Akademik Belajar Khot GAS API aktif & siap sinkronisasi.',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'setup') {
      return jsonResponse(setupJurnalAkademikDatabase());
    }

    if (action === 'getState') {
      setupJurnalAkademikDatabase();
      var savedState = readFullStateFromSheet();
      return jsonResponse({
        success: true,
        state: savedState,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'syncSnapshot') {
      setupJurnalAkademikDatabase();
      if (payload.state) {
        saveFullStateToSheet(payload.state);
      }
      return jsonResponse({
        success: true,
        message: 'Sinkronisasi ke Google Sheets berhasil.',
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({ success: false, error: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function saveFullStateToSheet(state) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date().toISOString();

  // 1. Simpan snapshot JSON utuh pada sheet Settings (key = FULL_DB_SNAPSHOT) tanpa clear()
  var settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet) {
    var lastRow = settingsSheet.getLastRow();
    var foundRow = -1;
    if (lastRow >= 2) {
      var keys = settingsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]) === 'FULL_DB_SNAPSHOT') {
          foundRow = i + 2;
          break;
        }
      }
    }
    var jsonStr = JSON.stringify(state);
    if (foundRow !== -1) {
      settingsSheet.getRange(foundRow, 2, 1, 2).setValues([[jsonStr, now]]);
    } else {
      settingsSheet.appendRow(['FULL_DB_SNAPSHOT', jsonStr, now]);
    }
  }

  // 2. Sinkronkan baris terstruktur ke sheet Members, Classes, JurnalPembelajaran, Absensi, Penilaian, RiwayatRapor
  upsertSheetRowsById(ss, 'Members', 'santriId', state.santri || []);
  upsertSheetRowsById(ss, 'Classes', 'kelasId', state.kelas || []);
  upsertSheetRowsById(ss, 'JurnalPembelajaran', 'jurnalId', state.jurnal || []);
  upsertSheetRowsById(ss, 'Absensi', 'absensiId', state.absensi || []);
  upsertSheetRowsById(ss, 'Penilaian', 'penilaianId', state.penilaian || []);
  upsertSheetRowsById(ss, 'RiwayatRapor', 'raporId', state.riwayatRapor || []);
}

function upsertSheetRowsById(ss, sheetName, idField, items) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || !items || !items.length) return;
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var idColIdx = headers.indexOf(idField);
  if (idColIdx === -1) return;

  var lastRow = sheet.getLastRow();
  var existingMap = {};
  if (lastRow >= 2) {
    var existingIds = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < existingIds.length; r++) {
      existingMap[String(existingIds[r][0])] = r + 2;
    }
  }

  items.forEach(function(item) {
    var rowValues = headers.map(function(h) {
      var val = item[h];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });
    var itemId = String(item[idField] || '');
    if (existingMap[itemId]) {
      sheet.getRange(existingMap[itemId], 1, 1, headers.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
  });
}

function readFullStateFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) return null;
  var lastRow = settingsSheet.getLastRow();
  if (lastRow < 2) return null;
  var rows = settingsSheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === 'FULL_DB_SNAPSHOT' && rows[i][1]) {
      return JSON.parse(String(rows[i][1]));
    }
  }
  return null;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

