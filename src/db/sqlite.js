const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open the SQLite database
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize schema if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    namaPeserta TEXT,
    tempatPkl TEXT,
    namaInstruktur TEXT,
    namaPembimbing TEXT,
    geminiApiKey TEXT
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    tanggal TEXT,
    hari TEXT,
    kegiatan TEXT,
    photos TEXT, -- stored as JSON array
    createdAt TEXT,
    isDeleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    subject TEXT,
    deadline TEXT,
    description TEXT,
    referenceUrl TEXT,
    status TEXT,
    attachmentPath TEXT,
    attachmentName TEXT,
    createdAt TEXT,
    isDeleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS quick_notes (
    id TEXT PRIMARY KEY,
    tanggal TEXT,
    teks TEXT,
    createdAt TEXT,
    isUsed INTEGER DEFAULT 0
  );
`);

// Migrate columns for AI settings if they don't exist
try { db.exec("ALTER TABLE profile ADD COLUMN apiProvider TEXT DEFAULT 'gemini'"); } catch (e) {}
try { db.exec("ALTER TABLE profile ADD COLUMN openRouterApiKey TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE profile ADD COLUMN ollamaUrl TEXT DEFAULT 'http://localhost:11434'"); } catch (e) {}
// Migrasi NIP/NIDN untuk slot tanda tangan jurnal bulanan
try { db.exec("ALTER TABLE profile ADD COLUMN nipPembimbing TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE profile ADD COLUMN nidnInstruktur TEXT DEFAULT ''"); } catch (e) {}

// Insert default profile if not exists
const profileExists = db.prepare('SELECT 1 FROM profile WHERE id = 1').get();
if (!profileExists) {
  db.prepare(`
    INSERT INTO profile (id, namaPeserta, tempatPkl, namaInstruktur, namaPembimbing, geminiApiKey)
    VALUES (1, '', '', '', '', '')
  `).run();
}

module.exports = db;
