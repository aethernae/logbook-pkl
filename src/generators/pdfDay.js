const path = require('path');
const PDFDocument = require('pdfkit');
const { hariTanggalIndo } = require('../utils/dateHelper');
const { loadScaledImage } = require('./imageHelper');

const PRIMARY = '#1F4E79';
const MUTED = '#555555';
const BORDER = '#000000';
const TEXT = '#111111';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function drawSectionLabel(doc, letter, title) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  doc.rect(x, y, width, 22).stroke(BORDER);
  doc.fillColor(TEXT).fontSize(12).font('Times-Bold')
    .text(`${letter}. ${title}`, x + 8, y + 5, { width: width - 16 });
  doc.moveDown(0.3);
  doc.fillColor(TEXT).font('Times-Roman');
}

async function drawBox(doc, drawContent) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startY = doc.y;
  const innerX = x + 10;
  const innerWidth = width - 20;
  doc.y = startY + 8;
  doc.x = innerX;
  await drawContent(innerX, innerWidth);
  const endY = doc.y + 8;
  doc.rect(x, startY, width, endY - startY).stroke(BORDER);
  doc.y = endY + 14;
  doc.x = x;
}

const INFO_LABEL_X_OFFSET = 160; // fixed offset so every colon lines up

function infoLine(doc, label, value) {
  const x = doc.page.margins.left;
  const y = doc.y;
  doc.fontSize(12).font('Times-Bold').fillColor(TEXT).text(label, x, y);
  doc.font('Times-Roman').text(`: ${value || '-'}`, x + INFO_LABEL_X_OFFSET, y);
  doc.x = x;
}

async function drawPhotos(doc, photos) {
  if (!photos || photos.length === 0) {
    doc.fontSize(10).font('Times-Italic').fillColor(MUTED).text('(Tidak ada dokumentasi)');
    doc.fillColor(TEXT).font('Times-Roman');
    return;
  }
  const x = doc.page.margins.left;
  const innerX = x + 10;
  const innerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - 20;

  const maxDim = 150;
  const gap = 12;
  const perRow = Math.max(1, Math.floor((innerWidth + gap) / (maxDim + gap)));
  let col = 0;
  let rowStartY = doc.y;
  let rowMaxHeight = 0;

  for (const filename of photos) {
    try {
      const { buffer, width, height } = await loadScaledImage(filename, maxDim);
      const xPos = innerX + col * (maxDim + gap);
      if (col === 0) rowStartY = doc.y;
      doc.image(buffer, xPos, rowStartY, { width, height });
      rowMaxHeight = Math.max(rowMaxHeight, height);
      col++;
      if (col >= perRow) {
        doc.y = rowStartY + rowMaxHeight + 10;
        col = 0;
        rowMaxHeight = 0;
      }
    } catch (e) {
      doc.fontSize(10).fillColor('#CC0000').font('Times-Italic').text('[Foto tidak ditemukan]');
      doc.fillColor(TEXT).font('Times-Roman');
    }
  }

  if (col !== 0) {
    doc.y = rowStartY + rowMaxHeight + 10;
  }
}
async function renderEntryToDoc(doc, profile, entry) {
  doc.font('Times-Bold').fontSize(14).fillColor(TEXT)
    .text('CATATAN KEGIATAN PKL', { align: 'center' });
  doc.moveDown(0.2);
  doc.font('Times-Roman').fontSize(11).fillColor(MUTED)
    .text('Praktik Kerja Lapangan', { align: 'center' });
  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor(TEXT).lineWidth(1.2).stroke();
  doc.moveDown(0.8);
  doc.fillColor(TEXT);

  function formatName(name) {
    if (!name) return '-';
    return name.replace(/, /g, ',\u00A0').replace(/\. /g, '.\u00A0');
  }

  infoLine(doc, 'Nama Peserta Didik', formatName(profile.namaPeserta));
  infoLine(doc, 'Dunia Kerja Tempat PKL', formatName(profile.tempatPkl));
  infoLine(doc, 'Nama Instruktur', formatName(profile.namaInstruktur));
  infoLine(doc, 'Nama Pembimbing', formatName(profile.namaPembimbing));
  doc.moveDown(0.8);

  drawSectionLabel(doc, 'A', 'Nama Pekerjaan');
  await drawBox(doc, async (ix, iw) => {
    doc.fontSize(12).font('Times-Roman').text(entry.kegiatan || '-', { width: iw });
  });

  drawSectionLabel(doc, 'B', 'Perencanaan Kegiatan');
  await drawBox(doc, async (ix, iw) => {
    doc.fontSize(12).font('Times-Roman').text(hariTanggalIndo(entry.tanggal), { width: iw });
  });

  drawSectionLabel(doc, 'C', 'Pelaksanaan kegiatan / hasil');
  await drawBox(doc, async (ix, iw) => {
    doc.fontSize(11).font('Times-Roman').text(entry.kegiatan || '-', { width: iw });
    doc.moveDown(1);
    doc.y += 10;
    await drawPhotos(doc, entry.photos);
  });

  drawSectionLabel(doc, 'D', 'Catatan Instruktur');
  await drawBox(doc, async () => {
    for (let i = 0; i < 3; i++) {
      doc.moveDown(1.5);
    }
  });

  doc.moveDown(2);
  const sigWidth = 280;
  const sigX = doc.page.width - doc.page.margins.right - sigWidth;

  const fullName = profile.namaInstruktur || '..........................................';

  doc.fontSize(11).font('Times-Roman')
    .text('Tanda Tangan Instruktur', sigX, doc.y, { align: 'center', width: sigWidth });
  doc.moveDown(4);

  doc.font('Times-Bold')
    .text(fullName, sigX, doc.y, { align: 'center', width: sigWidth });
}

async function generateDayPdf(profile, entry) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 45, right: 45 } });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      (async () => {
        await renderEntryToDoc(doc, profile, entry);
        doc.end();
      })().catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

async function generateCombinedPdf(profile, entries) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 45, right: 45 } });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      (async () => {
        for (let i = 0; i < entries.length; i++) {
          if (i > 0) doc.addPage();
          await renderEntryToDoc(doc, profile, entries[i]);
        }
        doc.end();
      })().catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateDayPdf, generateCombinedPdf, renderEntryToDoc };
