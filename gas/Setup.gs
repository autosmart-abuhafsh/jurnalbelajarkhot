/**
 * SETUP.GS — INISIALISASI DATABASE JURNAL AKADEMIK BELAJAR KHOT
 * File 1 dari 2 (Pasang bersama Code.gs di Extensions > Apps Script pada Google Sheets)
 *
 * Ketentuan Keamanan Database:
 * 1. Membuat 12 sheet tabel database secara otomatis di Google Sheets apabila belum tersedia.
 * 2. Mempertahankan seluruh data lama pada spreadsheet.
 * 3. TIDAK PERNAH menjalankan clear() atau menghapus baris data yang sudah ada.
 * 4. Jika sheet sudah memiliki data (Users, Members, Classes, dll), hanya menambahkan
 *    kolom yang diperlukan secara aman di sebelah kanan tanpa merusak struktur lama.
 */

var REQUIRED_SHEETS_SCHEMA = {
  Users: [
    'userId', 'username', 'passwordHash', 'namaLengkap', 'role',
    'guruId', 'foto', 'whatsapp', 'kelasDiampu', 'statusAkun', 'updatedAt'
  ],
  Members: [
    'santriId', 'memberId', 'namaLengkap', 'fotoProfil', 'programKhot',
    'metodePembelajaran', 'kelasId', 'namaKelas', 'guruId', 'namaGuru',
    'tanggalBergabung', 'statusKeanggotaan', 'whatsapp'
  ],
  Classes: [
    'kelasId', 'namaKelas', 'programKhot', 'metodePembelajaran',
    'guruId', 'namaGuru', 'jadwal', 'statusKelas'
  ],
  JurnalPembelajaran: [
    'jurnalId', 'nomorJurnal', 'tanggal', 'hari', 'kelasId', 'namaKelas',
    'programKhot', 'metodePembelajaran', 'guruId', 'namaGuru', 'pertemuanKe',
    'materiPembelajaran', 'targetPembelajaran', 'ringkasanKegiatan',
    'catatanGuru', 'statusJurnal', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'
  ],
  Absensi: [
    'absensiId', 'jurnalId', 'tanggal', 'santriId', 'memberId',
    'namaSantri', 'kelasId', 'statusKehadiran', 'keterangan', 'createdAt', 'updatedAt'
  ],
  Penilaian: [
    'penilaianId', 'jurnalId', 'tanggal', 'santriId', 'memberId',
    'aspekId', 'namaAspek', 'nilai', 'bobot', 'catatanPenilaian',
    'createdBy', 'updatedAt', 'updatedBy', 'riwayatEditJson'
  ],
  RubrikPenilaian: [
    'aspekId', 'namaAspek', 'deskripsi', 'programKhot',
    'bobot', 'urutan', 'statusAktif', 'createdAt', 'updatedAt'
  ],
  CatatanPerkembangan: [
    'catatanId', 'santriId', 'jurnalId', 'tanggal',
    'kategoriCatatan', 'isiCatatan', 'guruId', 'namaGuru', 'createdAt'
  ],
  RiwayatRapor: [
    'raporId', 'nomorRapor', 'santriId', 'memberId', 'namaSantri',
    'kelasId', 'namaKelas', 'programKhot', 'jenisRapor', 'jurnalId',
    'periodeAwal', 'periodeAkhir', 'periodeLabel', 'nilaiAkhir', 'predikat',
    'persentaseKehadiran', 'evaluasiJson', 'tanggalPenerbitan', 'tempatPenerbitan',
    'diterbitkanOleh', 'versiRapor', 'statusRapor'
  ],
  PengaturanAkademik: [
    'settingKey', 'settingValue', 'updatedAt'
  ],
  ActivityLogs: [
    'logId', 'userId', 'namaPengguna', 'role', 'jenisData',
    'aksi', 'entitasId', 'nilaiSebelumnya', 'nilaiTerbaru', 'keterangan', 'timestamp'
  ],
  Settings: [
    'key', 'value', 'updatedAt'
  ]
};

/**
 * Menampilkan menu khusus "Jurnal Belajar Khot" di toolbar Google Sheets
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('📚 Jurnal Belajar Khot')
      .addItem('1. Inisialisasi Sheet Database (Setup)', 'setupJurnalAkademikDatabase')
      .addToUi();
  } catch (e) {
    // Abaikan jika dijalankan dari trigger Web App tanpa UI
  }
}

/**
 * Alias fungsi setup() agar mudah dijalankan dari tombol Run di editor Apps Script
 */
function setup() {
  return setupJurnalAkademikDatabase();
}

/**
 * Fungsi utama pembuatan & validasi 12 sheet database di Google Sheets
 */
function setupJurnalAkademikDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var report = [];

  Object.keys(REQUIRED_SHEETS_SCHEMA).forEach(function(sheetName) {
    var requiredColumns = REQUIRED_SHEETS_SCHEMA[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, requiredColumns.length).setValues([requiredColumns]);
      sheet.getRange(1, 1, 1, requiredColumns.length)
        .setFontWeight('bold')
        .setBackground('#19432D')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
      report.push('Sheet dibuat: ' + sheetName);
    } else {
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.getRange(1, 1, 1, requiredColumns.length).setValues([requiredColumns]);
        sheet.getRange(1, 1, 1, requiredColumns.length)
          .setFontWeight('bold')
          .setBackground('#19432D')
          .setFontColor('#FFFFFF');
        sheet.setFrozenRows(1);
        report.push('Header diinisialisasi: ' + sheetName);
      } else {
        var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
        var missingCols = requiredColumns.filter(function(col) {
          return existingHeaders.indexOf(col) === -1;
        });
        if (missingCols.length > 0) {
          sheet.getRange(1, lastCol + 1, 1, missingCols.length).setValues([missingCols]);
          sheet.getRange(1, lastCol + 1, 1, missingCols.length)
            .setFontWeight('bold')
            .setBackground('#19432D')
            .setFontColor('#FFFFFF');
          report.push('Kolom ditambahkan secara aman pada ' + sheetName + ': ' + missingCols.join(', '));
        } else {
          report.push('Sheet sudah lengkap & aman: ' + sheetName);
        }
      }
    }
  });

  return {
    success: true,
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    details: report,
    timestamp: new Date().toISOString()
  };
}
