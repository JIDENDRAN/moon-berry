import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3999;

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(join(__dirname, 'moonberry.db'));
db.pragma('journal_mode = WAL');

// Products table
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    price       REAL    NOT NULL,
    oldPrice    REAL,
    image       TEXT,
    amazonLink  TEXT,
    whatsappLink TEXT,
    mainCategory TEXT,
    subCategory  TEXT,
    isBestSeller INTEGER DEFAULT 0,
    createdAt   INTEGER DEFAULT (unixepoch())
  );
`);

// Config key/value table
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// ── Products API ───────────────────────────────────────────────────────────────
// GET all products
app.get('/api/products', (req, res) => {
    const rows = db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
    // convert isBestSeller int → bool
    res.json(rows.map(r => ({ ...r, isBestSeller: r.isBestSeller === 1 })));
});

// POST add product
app.post('/api/products', (req, res) => {
    const { name, price, oldPrice, image, amazonLink, whatsappLink, mainCategory, subCategory, isBestSeller } = req.body;
    const stmt = db.prepare(`
    INSERT INTO products (name, price, oldPrice, image, amazonLink, whatsappLink, mainCategory, subCategory, isBestSeller)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const info = stmt.run(name, price, oldPrice || null, image, amazonLink, whatsappLink, mainCategory, subCategory || 'All', isBestSeller ? 1 : 0);
    res.json({ id: info.lastInsertRowid, message: 'Product added' });
});

// PUT update product
app.put('/api/products/:id', (req, res) => {
    const { name, price, oldPrice, image, amazonLink, whatsappLink, mainCategory, subCategory, isBestSeller } = req.body;
    db.prepare(`
    UPDATE products SET name=?, price=?, oldPrice=?, image=?, amazonLink=?, whatsappLink=?, mainCategory=?, subCategory=?, isBestSeller=?
    WHERE id=?
  `).run(name, price, oldPrice || null, image, amazonLink, whatsappLink, mainCategory, subCategory || 'All', isBestSeller ? 1 : 0, req.params.id);
    res.json({ message: 'Product updated' });
});

// PATCH toggle bestSeller
app.patch('/api/products/:id/bestseller', (req, res) => {
    const { isBestSeller } = req.body;
    db.prepare('UPDATE products SET isBestSeller=? WHERE id=?').run(isBestSeller ? 1 : 0, req.params.id);
    res.json({ message: 'Updated' });
});

// DELETE one product
app.delete('/api/products/:id', (req, res) => {
    db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
    res.json({ message: 'Product deleted' });
});

// DELETE all products
app.delete('/api/products', (req, res) => {
    db.prepare('DELETE FROM products').run();
    res.json({ message: 'All products cleared' });
});

// ── Config API ─────────────────────────────────────────────────────────────────
// GET a config key
app.get('/api/config/:key', (req, res) => {
    const row = db.prepare('SELECT value FROM config WHERE key=?').get(req.params.key);
    if (!row) return res.status(404).json({ error: 'Not found' });
    try { res.json(JSON.parse(row.value)); }
    catch { res.json({ value: row.value }); }
});

// POST/PUT set a config key
app.post('/api/config/:key', (req, res) => {
    db.prepare('INSERT INTO config (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
        .run(req.params.key, JSON.stringify(req.body));
    res.json({ message: 'Config saved' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🌙 Moon Berry API running at http://localhost:${PORT}`));
