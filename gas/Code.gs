/**
 * CODE.GS — ENDPOINT API & SINKRONISASI 2 ARAH (HP & PC) JURNAL AKADEMIK BELAJAR KHOT
 * File 2 dari 2 (Pasang bersama Setup.gs di Extensions > Apps Script pada Google Sheets)
 *
 * Fitur Utama:
 * 1. Mendukung akses dari Vercel (vercel.app) maupun GitHub Pages (github.io) bebas blokir CORS.
 * 2. Sinkronisasi otomatis lintas perangkat (ketika diisi di HP dan dibuka di PC atau sebaliknya).
 * 3. Menulis seluruh tabel secara rapi ke sheet Google Sheets (Users, Members, Classes,
 *    JurnalPembelajaran, Absensi, Penilaian, RubrikPenilaian, CatatanPerkembangan,
 *    RiwayatRapor, PengaturanAkademik, ActivityLogs, dan Settings) TANPA pernah clear().
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

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
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      return jsonResponse({
        success: true,
        message: 'Jurnal Akademik Belajar Khot GAS API terhubung (Siap Sinkron HP & PC).',
        spreadsheetName: ss ? ss.getName() : '',
        lastSyncAt: readLastSyncTimestamp(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'setup') {
      var setupResult = setupJurnalAkademikDatabase();
      return jsonResponse(setupResult);
    }

    if (action === 'getState' || action === 'fetchAll') {
      setupJurnalAkademikDatabase();
      var savedState = readFullStateFromSheet();
      return jsonResponse({
        success: true,
        state: savedState,
        data: savedState,
        lastSyncAt: readLastSyncTimestamp(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'syncSnapshot') {
      var lock = LockService.getScriptLock();
      lock.waitLock(15000);
      try {
        setupJurnalAkademikDatabase();
        var syncTime = new Date().toISOString();
        if (payload.state) {
          if (payload.state.pengaturan) {
            payload.state.pengaturan.lastSyncAt = syncTime;
          }
          saveFullStateToSheet(payload.state, syncTime);
        }
        return jsonResponse({
          success: true,
          message: 'Sinkronisasi ke Google Sheets berhasil (HP & PC Tersinkron).',
          lastSyncAt: syncTime,
          timestamp: syncTime
        });
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'upsertRecord') {
      var uLock = LockService.getScriptLock();
      uLock.waitLock(15000);
      try {
        setupJurnalAkademikDatabase();
        var sheetName = payload.sheetName;
        var primaryKey = payload.primaryKey;
        var record = payload.record;
        if (!sheetName || !primaryKey || !record) {
          return jsonResponse({ success: false, error: 'Parameter tidak lengkap.' });
        }
        var ssUpsert = SpreadsheetApp.getActiveSpreadsheet();
        if (sheetName === 'Absensi') {
          upsertAbsensiUnique(ssUpsert, record);
        } else {
          upsertSheetRowsById(ssUpsert, sheetName, primaryKey, [record]);
        }
        return jsonResponse({
          success: true,
          timestamp: new Date().toISOString()
        });
      } finally {
        uLock.releaseLock();
      }
    }

    return jsonResponse({ success: false, error: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function saveFullStateToSheet(state, syncTime) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = syncTime || new Date().toISOString();

  // 1. Simpan snapshot JSON utuh pada sheet Settings (key = FULL_DB_SNAPSHOT & LAST_SYNC_AT)
  upsertKeyValueRow(ss, 'Settings', 'key', 'value', 'FULL_DB_SNAPSHOT', JSON.stringify(state), now);
  upsertKeyValueRow(ss, 'Settings', 'key', 'value', 'LAST_SYNC_AT', now, now);

  // 2. Sinkronkan seluruh data tabel secara terstruktur agar muncul rapi di setiap tab Google Sheets
  if (Array.isArray(state.users)) {
    var formattedUsers = state.users.map(function(u) {
      var copy = {};
      for (var k in u) copy[k] = u[k];
      if (Array.isArray(u.kelasDiampu)) copy.kelasDiampu = u.kelasDiampu.join(', ');
      copy.updatedAt = now;
      return copy;
    });
    upsertSheetRowsById(ss, 'Users', 'userId', formattedUsers);
  }

  upsertSheetRowsById(ss, 'Members', 'santriId', state.santri || []);
  upsertSheetRowsById(ss, 'Classes', 'kelasId', state.kelas || []);
  upsertSheetRowsById(ss, 'JurnalPembelajaran', 'jurnalId', state.jurnal || []);

  if (Array.isArray(state.absensi)) {
    state.absensi.forEach(function(a) {
      upsertAbsensiUnique(ss, a);
    });
  }

  if (Array.isArray(state.penilaian)) {
    var formattedPenilaian = state.penilaian.map(function(p) {
      var copy = {};
      for (var k in p) copy[k] = p[k];
      copy.riwayatEditJson = p.riwayatEdit ? JSON.stringify(p.riwayatEdit) : '[]';
      return copy;
    });
    upsertSheetRowsById(ss, 'Penilaian', 'penilaianId', formattedPenilaian);
  }

  upsertSheetRowsById(ss, 'RubrikPenilaian', 'aspekId', state.rubrik || []);
  upsertSheetRowsById(ss, 'CatatanPerkembangan', 'catatanId', state.catatanPerkembangan || []);

  if (Array.isArray(state.riwayatRapor)) {
    var formattedRapor = state.riwayatRapor.map(function(r) {
      var copy = {};
      for (var k in r) copy[k] = r[k];
      copy.evaluasiJson = r.evaluasi ? JSON.stringify(r.evaluasi) : '{}';
      return copy;
    });
    upsertSheetRowsById(ss, 'RiwayatRapor', 'raporId', formattedRapor);
  }

  if (state.pengaturan && typeof state.pengaturan === 'object') {
    Object.keys(state.pengaturan).forEach(function(sKey) {
      var rawVal = state.pengaturan[sKey];
      var strVal = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal !== undefined ? rawVal : '');
      upsertKeyValueRow(ss, 'PengaturanAkademik', 'settingKey', 'settingValue', sKey, strVal, now);
    });
  }

  if (Array.isArray(state.activityLogs)) {
    upsertSheetRowsById(ss, 'ActivityLogs', 'logId', state.activityLogs.slice(0, 150));
  }
}

function upsertKeyValueRow(ss, sheetName, keyColName, valColName, keyStr, valStr, now) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(keyStr)) {
        foundRow = i + 2;
        break;
      }
    }
  }
  if (foundRow !== -1) {
    sheet.getRange(foundRow, 2, 1, 2).setValues([[valStr, now]]);
  } else {
    sheet.appendRow([keyStr, valStr, now]);
  }
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
    if (!itemId) return;
    if (existingMap[itemId]) {
      sheet.getRange(existingMap[itemId], 1, 1, headers.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
      lastRow++;
      existingMap[itemId] = lastRow;
    }
  });
}

function upsertAbsensiUnique(ss, record) {
  var sheet = ss.getSheetByName('Absensi');
  if (!sheet || !record) return;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var jIdx = headers.indexOf('jurnalId');
  var sIdx = headers.indexOf('santriId');

  var rowValues = headers.map(function(h) {
    var val = record[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });

  if (lastRow > 1 && jIdx !== -1 && sIdx !== -1) {
    var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (var r = 0; r < allData.length; r++) {
      if (
        String(allData[r][jIdx]) === String(record.jurnalId) &&
        String(allData[r][sIdx]) === String(record.santriId)
      ) {
        sheet.getRange(r + 2, 1, 1, headers.length).setValues([rowValues]);
        return { updated: true };
      }
    }
  }
  sheet.appendRow(rowValues);
  return { inserted: true };
}

function readSheetRecords(sheetName, primaryKey) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[i][c];
    }
    if (obj[primaryKey]) {
      rows.push(obj);
    }
  }
  return rows;
}

function readLastSyncTimestamp() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet || settingsSheet.getLastRow() < 2) return '';
  var rows = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === 'LAST_SYNC_AT' && rows[i][1]) {
      return String(rows[i][1]);
    }
  }
  return '';
}

function readFullStateFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingsSheet = ss.getSheetByName('Settings');
  var snapshotState = null;

  if (settingsSheet && settingsSheet.getLastRow() >= 2) {
    var rows = settingsSheet.getRange(2, 1, settingsSheet.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === 'FULL_DB_SNAPSHOT' && rows[i][1]) {
        try {
          snapshotState = JSON.parse(String(rows[i][1]));
        } catch (e) {
          snapshotState = null;
        }
        break;
      }
    }
  }

  // Baca juga baris dari sheet Members & Classes jika ada penambahan langsung dari Google Sheets
  var sheetMembers = readSheetRecords('Members', 'santriId');
  var sheetClasses = readSheetRecords('Classes', 'kelasId');

  if (snapshotState && snapshotState.santri) {
    // Gabungkan jika ada member baru yang ditambah manual langsung di tabel Google Sheets
    if (sheetMembers.length > 0) {
      var existingIds = {};
      snapshotState.santri.forEach(function(s) { existingIds[String(s.santriId)] = true; });
      sheetMembers.forEach(function(sm) {
        if (!existingIds[String(sm.santriId)]) {
          snapshotState.santri.push(sm);
        }
      });
    }
    if (sheetClasses.length > 0) {
      var existingClassIds = {};
      snapshotState.kelas.forEach(function(k) { existingClassIds[String(k.kelasId)] = true; });
      sheetClasses.forEach(function(sc) {
        if (!existingClassIds[String(sc.kelasId)]) {
          snapshotState.kelas.push(sc);
        }
      });
    }
    return snapshotState;
  }

  // Jika belum ada FULL_DB_SNAPSHOT namun tabel Members sudah terisi di Google Sheets
  if (sheetMembers.length > 0 || sheetClasses.length > 0) {
    return {
      santri: sheetMembers,
      kelas: sheetClasses,
      jurnal: readSheetRecords('JurnalPembelajaran', 'jurnalId'),
      absensi: readSheetRecords('Absensi', 'absensiId'),
      penilaian: readSheetRecords('Penilaian', 'penilaianId'),
      rubrik: readSheetRecords('RubrikPenilaian', 'aspekId'),
      catatanPerkembangan: readSheetRecords('CatatanPerkembangan', 'catatanId'),
      riwayatRapor: readSheetRecords('RiwayatRapor', 'raporId'),
      activityLogs: readSheetRecords('ActivityLogs', 'logId')
    };
  }

  return null;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
