const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat); // untuk parsing ketat dayjs(str, 'YYYY-MM-DD', true)
const getHoliday = require('./holiday');
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jumat", 'Sabtu'];
const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validasi string tanggal YYYY-MM-DD: harus cocok format DAN valid secara kalender.
// Parsing ketat — mis. "2026-02-30" ditolak, bukan di-rollover menjadi Maret.
function isValidDateStr(str) {
  if (typeof str !== 'string' || !DATE_ONLY_RE.test(str)) return false;
  return dayjs(str, 'YYYY-MM-DD', true).isValid();
}

function namaHari(dateStr) {
  const d = dayjs(dateStr);
  return HARI_ID[d.day()];
}

function tanggalIndo(dateStr) {
  const d = dayjs(dateStr);
  const tgl = String(d.date()).padStart(2, '0');
  return `${tgl} ${BULAN_ID[d.month()]} ${d.year()}`;
}

function hariTanggalIndo(dateStr) {
  return `${namaHari(dateStr)}, ${tanggalIndo(dateStr)}`;
}

// Returns a stable key identifying the Mon-Sun week a date falls in, e.g. monday "2026-08-04"
// (LEGACY mingguan — dipertahankan sampai UI/export bulanan selesai, lalu dihapus total)
function weekKey(dateStr) {
  const d = dayjs(dateStr);
  // ISO week: Monday start
  const dow = (d.day() + 6) % 7; // 0=Mon ... 6=Sun
  const monday = d.subtract(dow, 'day');
  return monday.format('YYYY-MM-DD'); // key = Monday's date of that week
}

// Kunci grup jurnal bulanan: "YYYY-MM" dari bulan tempat minggu (Senin–Minggu)
// BERAKHIR. Aturan tempel minggu nyebrang, dua arah:
// - Senin 28 Sep – Min 04 Okt → minggu berakhir di Okt → kunci "2026-10"
// - Sen 30 Sep (Rabu) ikut ketempel ke Oktober; jurnal September kehilangan 3 hari itu.
// - Akhir Okt yang nyebrang ke Nov ikut ketempel ke November.
// Minggu utuh dalam satu bulan tidak berubah (bulan mulai = bulan berakhir).
function monthKey(dateStr) {
  const d = dayjs(dateStr);
  if (!d.isValid()) {
    const raw = String(dateStr).slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(raw)) return raw;
    return String(dateStr);
  }
  const dow = (d.day() + 6) % 7; // 0=Senin ... 6=Minggu
  const sunday = d.add(6 - dow, 'day'); // akhir minggu tempat tanggal ini berada
  return sunday.format('YYYY-MM');
}

// Label rentang dari entri yang ada, mis. "30 September - 08 Oktober 2026".
// Dipakai untuk judul periode jurnal bulanan. Kalau kosong, fallback ke bulan kalender penuh.
// Sengaja pakai tanggal penuh (bukan nomor saja) karena minggu tempel bisa nyebrang bulan.
function monthRangeLabel(mKey, entries = []) {
  const [y, m] = String(mKey).split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return String(mKey);
  const monthName = BULAN_ID[m - 1];
  const daysInMonth = dayjs(`${y}-${String(m).padStart(2, '0')}-01`).daysInMonth() || 31;

  let sorted = [];
  if (entries && entries.length > 0) {
    sorted = [...entries]
      .map(e => e.tanggal)
      .filter(Boolean)
      .sort();
  }
  if (sorted.length === 0) {
    return `01 - ${daysInMonth} ${monthName} ${y}`;
  }
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === last) {
    return tanggalIndo(first);
  }
  return `${tanggalIndo(first)} - ${tanggalIndo(last)}`;
}

// Nama bulan + tahun saja, mis. "Agustus 2026" — untuk judul grup UI & nama folder.
function monthTitle(mKey) {
  const [y, m] = String(mKey).split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return String(mKey);
  return `${BULAN_ID[m - 1]} ${y}`;
}

// "Negara, 31 Agustus 2026" — tanggal jurnal terakhir di bulan itu untuk slot tanda tangan.
function monthSignDate(mKey, entries = []) {
  let sorted = [];
  if (entries && entries.length > 0) {
    sorted = [...entries]
      .map(e => e.tanggal)
      .filter(Boolean)
      .sort();
  }
  const lastDate = sorted.length > 0 ? sorted[sorted.length - 1] : `${mKey}-01`;
  return `Negara, ${tanggalIndo(lastDate)}`;
}

function weekRangeLabel(mondayKey, entries = []) {
  let daysCount = 5;
  if (entries && entries.length > 0) {
    const hasSat = entries.some(e => dayjs(e.tanggal).day() === 6);
    const hasSun = entries.some(e => dayjs(e.tanggal).day() === 0);
    if (hasSun) daysCount = 7;
    else if (hasSat) daysCount = 6;
  }
  
  const days = [];
  for (let i = 0; i < daysCount; i++) {
    days.push(dayjs(mondayKey).add(i, 'day'));
  }

  let startIdx = 0;
  while (startIdx < days.length && getHoliday(days[startIdx].format('YYYY-MM-DD'))) {
    startIdx++;
  }
  if (startIdx === days.length) startIdx = 0;

  let endIdx = days.length - 1;
  while (endIdx >= startIdx && getHoliday(days[endIdx].format('YYYY-MM-DD'))) {
    endIdx--;
  }

  const startDay = days[startIdx];
  const endDay = days[endIdx];

  if (startDay.isSame(endDay, 'day')) {
    return tanggalIndo(startDay.format('YYYY-MM-DD'));
  }
  return `${tanggalIndo(startDay.format('YYYY-MM-DD'))} - ${tanggalIndo(endDay.format('YYYY-MM-DD'))}`;
}


module.exports = { namaHari, tanggalIndo, hariTanggalIndo, weekKey, weekRangeLabel, monthKey, monthRangeLabel, monthTitle, monthSignDate, isValidDateStr, HARI_ID, BULAN_ID };
