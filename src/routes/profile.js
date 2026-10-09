const express = require('express');
const router = express.Router();
const db = require('../db/sqlite');

router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  res.json(profile);
});

router.put('/', (req, res) => {
  const currentProfile = db.prepare('SELECT * FROM profile WHERE id = 1').get() || {};
  const newProfile = { ...currentProfile };

  if (req.body.namaPeserta !== undefined) newProfile.namaPeserta = req.body.namaPeserta;
  if (req.body.tempatPkl !== undefined) newProfile.tempatPkl = req.body.tempatPkl;
  if (req.body.namaInstruktur !== undefined) newProfile.namaInstruktur = req.body.namaInstruktur;
  if (req.body.namaPembimbing !== undefined) newProfile.namaPembimbing = req.body.namaPembimbing;
  if (req.body.nipPembimbing !== undefined) newProfile.nipPembimbing = req.body.nipPembimbing;
  if (req.body.nidnInstruktur !== undefined) newProfile.nidnInstruktur = req.body.nidnInstruktur;
  if (req.body.geminiApiKey !== undefined) newProfile.geminiApiKey = req.body.geminiApiKey;
  if (req.body.apiProvider !== undefined) newProfile.apiProvider = req.body.apiProvider;
  if (req.body.openRouterApiKey !== undefined) newProfile.openRouterApiKey = req.body.openRouterApiKey;
  if (req.body.ollamaUrl !== undefined) newProfile.ollamaUrl = req.body.ollamaUrl;

  db.prepare(`
    UPDATE profile SET 
      namaPeserta = ?, 
      tempatPkl = ?, 
      namaInstruktur = ?, 
      namaPembimbing = ?, 
      nipPembimbing = ?,
      nidnInstruktur = ?,
      geminiApiKey = ?,
      apiProvider = ?,
      openRouterApiKey = ?,
      ollamaUrl = ?
    WHERE id = 1
  `).run(
    newProfile.namaPeserta,
    newProfile.tempatPkl,
    newProfile.namaInstruktur,
    newProfile.namaPembimbing,
    newProfile.nipPembimbing || '',
    newProfile.nidnInstruktur || '',
    newProfile.geminiApiKey,
    newProfile.apiProvider,
    newProfile.openRouterApiKey,
    newProfile.ollamaUrl
  );
  
  res.json(newProfile);
});

module.exports = router;
