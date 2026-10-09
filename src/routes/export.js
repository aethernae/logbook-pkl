const express = require('express');
const router = express.Router();
const { ZipArchive } = require('archiver');
const db = require('../db/sqlite');
const { monthKey, monthTitle, weekKey, weekRangeLabel } = require('../utils/dateHelper');
const { generateDayDocx } = require('../generators/docxDay');
const { generateMonthDocx } = require('../generators/docxMonth');
const { generateDayPdf, generateCombinedPdf } = require('../generators/pdfDay');
const { generateMonthPdf, generateMonthCombinedPdf } = require('../generators/pdfMonth');

// Parse kolom photos dengan aman — SATU baris korup tidak boleh menjatuhkan seluruh request
function safeParsePhotos(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getWeekEntries(wk) {
  const dbEntries = db.prepare('SELECT * FROM entries WHERE isDeleted = 0').all();
  return dbEntries.filter(e => weekKey(e.tanggal) === wk).map(e => {
    e.photos = safeParsePhotos(e.photos);
    return e;
  });
}

function getMonthEntries(mk) {
  const dbEntries = db.prepare('SELECT * FROM entries WHERE isDeleted = 0').all();
  return dbEntries.filter(e => monthKey(e.tanggal) === mk).map(e => {
    e.photos = safeParsePhotos(e.photos);
    return e;
  });
}

function getProfile() {
  return db.prepare('SELECT * FROM profile WHERE id = 1').get() || {};
}

router.get('/day/:id/docx', async (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (entry) entry.photos = safeParsePhotos(entry.photos);
  if (!entry || entry.isDeleted) return res.status(404).json({ error: 'Entri tidak ditemukan' });
  try {
    const buffer = await generateDayDocx(getProfile(), entry);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Catatan-${entry.tanggal}.docx"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file Word' });
  }
});

router.get('/day/:id/pdf', async (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id);
  if (entry) entry.photos = safeParsePhotos(entry.photos);
  if (!entry || entry.isDeleted) return res.status(404).json({ error: 'Entri tidak ditemukan' });
  try {
    const buffer = await generateDayPdf(getProfile(), entry);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Catatan-${entry.tanggal}.pdf"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file PDF' });
  }
});

router.get('/week/:weekKey/docx', async (req, res) => {
  const wk = req.params.weekKey;
  const entries = getWeekEntries(wk);
  if (entries.length === 0) return res.status(404).json({ error: 'Tidak ada entri pada minggu ini' });
  try {
    const buffer = await generateMonthDocx(getProfile(), wk, entries);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Jurnal-Minggu-${wk}.docx"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file Word' });
  }
});

router.get('/week/:weekKey/pdf', async (req, res) => {
  const wk = req.params.weekKey;
  const entries = getWeekEntries(wk);
  if (entries.length === 0) return res.status(404).json({ error: 'Tidak ada entri pada minggu ini' });
  try {
    const buffer = await generateMonthPdf(getProfile(), wk, entries);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Jurnal-Minggu-${wk}.pdf"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file PDF' });
  }
});

// ─── Jurnal bulanan (pengganti mingguan — hemat kertas) ───
router.get('/month/:monthKey/docx', async (req, res) => {
  const mk = req.params.monthKey;
  const entries = getMonthEntries(mk);
  if (entries.length === 0) return res.status(404).json({ error: 'Tidak ada entri pada bulan ini' });
  try {
    const buffer = await generateMonthDocx(getProfile(), mk, entries);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Jurnal-Bulan-${mk}.docx"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file Word' });
  }
});

router.get('/month/:monthKey/pdf', async (req, res) => {
  const mk = req.params.monthKey;
  const entries = getMonthEntries(mk);
  if (entries.length === 0) return res.status(404).json({ error: 'Tidak ada entri pada bulan ini' });
  try {
    const buffer = await generateMonthPdf(getProfile(), mk, entries);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Jurnal-Bulan-${mk}.pdf"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file PDF' });
  }
});

// Download All Month PDFs as ZIP Archive
router.get('/week/:weekKey/zip', async (req, res) => {
  const wk = req.params.weekKey;
  const profile = getProfile();
  const entries = getWeekEntries(wk);
  if (entries.length === 0) return res.status(404).json({ error: 'Tidak ada entri pada minggu ini' });

  try {
    const sortedEntries = [...entries].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // Generate Weekly Summary PDF
    const weekPdfBuffer = await generateMonthPdf(profile, wk, sortedEntries);

    // Generate Daily PDFs concurrently
    const dayPdfs = await Promise.all(
      sortedEntries.map(async (entry) => {
        const dayPdfBuffer = await generateDayPdf(profile, entry);
        return {
          name: `Catatan_Harian_${entry.tanggal}_${entry.hari || 'Hari'}.pdf`,
          buffer: dayPdfBuffer
        };
      })
    );

    const folderName = `Minggu ${weekRangeLabel(wk, sortedEntries)}`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      res.status(500).end();
    });

    archive.pipe(res);

    // Append files into the zip inside the labeled folder
    archive.append(weekPdfBuffer, { name: `${folderName}/Jurnal_Kegiatan_Mingguan_${wk}.pdf` });
    dayPdfs.forEach((dp) => {
      archive.append(dp.buffer, { name: `${folderName}/${dp.name}` });
    });

    await archive.finalize();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file ZIP laporan mingguan' });
  }
});

// Unduh 1 file PDF multi-page: catatan harian dulu kronologis, jurnal bulanan di akhir.
// Memudahkan tukang print — tidak perlu ekstrak ZIP berisi banyak file.
router.get('/month/:monthKey/zip', async (req, res) => {
  const mk = req.params.monthKey;
  const profile = getProfile();
  const entries = getMonthEntries(mk);
  if (entries.length === 0) return res.status(404).json({ error: 'Tidak ada entri pada bulan ini' });

  try {
    const sortedEntries = [...entries].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const buffer = await generateMonthCombinedPdf(profile, mk, sortedEntries);

    const fileName = `Laporan-PKL-${monthTitle(mk).replace(/ /g, '-')}-${mk}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat file PDF laporan bulanan' });
  }
});

// ─── Multi-select: Preview selected entries as combined PDF ───
router.post('/batch/pdf', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Tidak ada entri yang dipilih' });
  }

  const profile = getProfile();
  const entries = ids.map(id => {
    const entry = db.prepare('SELECT * FROM entries WHERE id = ? AND isDeleted = 0').get(id);
    if (entry) entry.photos = safeParsePhotos(entry.photos);
    return entry;
  }).filter(Boolean);

  if (entries.length === 0) {
    return res.status(404).json({ error: 'Tidak ada entri yang ditemukan' });
  }

  // Sort by date
  entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  try {
    const PDFDocument = require('pdfkit');
    const dayPdfs = await Promise.all(
      entries.map(async entry => {
        try {
          return { entry, buffer: await generateDayPdf(profile, entry) };
        } catch (err) {
          console.error(`Gagal membuat PDF untuk entri ${entry.tanggal}:`, err);
          return null;
        }
      })
    );

    const validPdfs = dayPdfs.filter(item => item !== null);

    if (validPdfs.length === 0) {
      return res.status(500).json({ error: 'Seluruh entri gagal diproses menjadi PDF.' });
    }

    // Combine all PDFs into a single merged PDF using pdfkit
    // Each day PDF is a standalone document — we use a simple approach:
    // generate each as a buffer and package them in a ZIP for download,
    // but for *preview* we'll just show the first one and let the user
    // navigate. A better approach: merge pages.
    // 
    // Since pdfkit can't merge existing PDFs, for preview we'll return
    // the first PDF with a header indicating total count.
    // For a proper multi-page preview, we generate all pages fresh.

    // Simpler, more useful: return a ZIP with individual PDFs
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Catatan-PKL-${entries.length}-entri.zip"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      res.status(500).end();
    });
    archive.pipe(res);

    // Group entries by monthKey so we can label the folders correctly
    const entriesByMonth = {};
    validPdfs.forEach(({ entry, buffer }) => {
      const mk = monthKey(entry.tanggal);
      if (!entriesByMonth[mk]) entriesByMonth[mk] = [];
      entriesByMonth[mk].push({ entry, buffer });
    });

    Object.keys(entriesByMonth).forEach(mk => {
      // Folder seperti 'Agustus 2026'
      const folderName = monthTitle(mk);

      entriesByMonth[mk].forEach(({ entry, buffer }) => {
        archive.append(buffer, {
          name: `${folderName}/Catatan_Harian_${entry.tanggal}_${entry.hari || 'Hari'}.pdf`
        });
      });
    });

    await archive.finalize();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat batch PDF' });
  }
});

// ─── Multi-select: Preview selected entries as single merged PDF ───
router.post('/batch/preview', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Tidak ada entri yang dipilih' });
  }

  const profile = getProfile();
  const entries = ids.map(id => {
    const entry = db.prepare('SELECT * FROM entries WHERE id = ? AND isDeleted = 0').get(id);
    if (entry) entry.photos = safeParsePhotos(entry.photos);
    return entry;
  }).filter(Boolean);

  if (entries.length === 0) {
    return res.status(404).json({ error: 'Tidak ada entri yang ditemukan' });
  }

  entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  try {
    // Generate a single combined PDF document
    const combinedPdfBuffer = await generateCombinedPdf(profile, entries);

    res.setHeader('Content-Type', 'application/pdf');
    // Using inline disposition so it opens in the browser tab for preview
    res.setHeader('Content-Disposition', 'inline; filename="Preview-Catatan-PKL.pdf"');
    res.send(combinedPdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Gagal membuat preview batch' });
  }
});

module.exports = router;

