/**
 * CODE.GS — ENDPOINT API JURNAL AKADEMIK BELAJAR KHOT
 * Backend Integrasi Google Sheets & Sinkronisasi Master Member Belajar Khot
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    let payload = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || 'ping';

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'Jurnal Akademik Belajar Khot GAS API terhubung.',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'setup') {
      const setupResult = setupJurnalAkademikDatabase();
      return jsonResponse(setupResult);
    }

    if (action === 'fetchAll') {
      setupJurnalAkademikDatabase();
      return jsonResponse({
        success: true,
        data: {
          santri: readSheetRecords('Members', 'santriId'),
          kelas: readSheetRecords('Classes', 'kelasId'),
          jurnal: readSheetRecords('JurnalPembelajaran', 'jurnalId'),
          absensi: readSheetRecords('Absensi', 'absensiId'),
          penilaian: readSheetRecords('Penilaian', 'penilaianId'),
          rubrik: readSheetRecords('RubrikPenilaian', 'aspekId'),
          catatanPerkembangan: readSheetRecords('CatatanPerkembangan', 'catatanId'),
          riwayatRapor: readSheetRecords('RiwayatRapor', 'raporId'),
          activityLogs: readSheetRecords('ActivityLogs', 'logId'),
          pengaturan: readSheetRecords('PengaturanAkademik', 'settingKey')
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'upsertRecord') {
      const sheetName = payload.sheetName;
      const primaryKey = payload.primaryKey;
      const record = payload.record;
      if (!sheetName || !primaryKey || !record) {
        return jsonResponse({ success: false, error: 'Parameter tidak lengkap.' });
      }
      // Proteksi duplikasi absensi: kombinasi jurnalId dan santriId
      if (sheetName === 'Absensi') {
        const res = upsertAbsensiUnique(record);
        return jsonResponse({ success: true, result: res });
      }
      const res = upsertSheetRecord(sheetName, primaryKey, record);
      return jsonResponse({ success: true, result: res });
    }

    if (action === 'syncSnapshot') {
      setupJurnalAkademikDatabase();
      const state = payload.state || {};
      if (Array.isArray(state.jurnal)) {
        state.jurnal.forEach(function(r) { upsertSheetRecord('JurnalPembelajaran', 'jurnalId', r); });
      }
      if (Array.isArray(state.absensi)) {
        state.absensi.forEach(function(r) { upsertAbsensiUnique(r); });
      }
      if (Array.isArray(state.penilaian)) {
        state.penilaian.forEach(function(r) { upsertSheetRecord('Penilaian', 'penilaianId', r); });
      }
      if (Array.isArray(state.rubrik)) {
        state.rubrik.forEach(function(r) { upsertSheetRecord('RubrikPenilaian', 'aspekId', r); });
      }
      if (Array.isArray(state.riwayatRapor)) {
        state.riwayatRapor.forEach(function(r) { upsertSheetRecord('RiwayatRapor', 'raporId', r); });
      }
      return jsonResponse({
        success: true,
        message: 'Sinkronisasi ke Google Sheets berhasil.',
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({ success: false, error: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function readSheetRecords(sheetName, primaryKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(String);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[i][c];
    }
    if (obj[primaryKey]) {
      rows.push(obj);
    }
  }
  return rows;
}

function upsertSheetRecord(sheetName, primaryKey, record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const pkIndex = headers.indexOf(primaryKey);
  if (pkIndex === -1) throw new Error('Primary key tidak ditemukan: ' + primaryKey);

  const rowValues = headers.map(function(h) {
    const val = record[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });

  if (lastRow > 1) {
    const pkColumnValues = sheet.getRange(2, pkIndex + 1, lastRow - 1, 1).getValues();
    for (let r = 0; r < pkColumnValues.length; r++) {
      if (String(pkColumnValues[r][0]) === String(record[primaryKey])) {
        sheet.getRange(r + 2, 1, 1, headers.length).setValues([rowValues]);
        return { updated: true, id: record[primaryKey] };
      }
    }
  }

  sheet.appendRow(rowValues);
  return { inserted: true, id: record[primaryKey] };
}

function upsertAbsensiUnique(record) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Absensi');
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const jIdx = headers.indexOf('jurnalId');
  const sIdx = headers.indexOf('santriId');

  const rowValues = headers.map(function(h) {
    return record[h] !== undefined && record[h] !== null ? record[h] : '';
  });

  if (lastRow > 1 && jIdx !== -1 && sIdx !== -1) {
    const allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (let r = 0; r < allData.length; r++) {
      if (
        String(allData[r][jIdx]) === String(record.jurnalId) &&
        String(allData[r][sIdx]) === String(record.santriId)
      ) {
        sheet.getRange(r + 2, 1, 1, headers.length).setValues([rowValues]);
        return { updated: true, jurnalId: record.jurnalId, santriId: record.santriId };
      }
    }
  }

  sheet.appendRow(rowValues);
  return { inserted: true, jurnalId: record.jurnalId, santriId: record.santriId };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
