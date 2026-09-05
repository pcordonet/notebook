const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'notbook.db');

let db;

async function getDatabase() {
    if (!db) {
        const SQL = await initSqlJs();

        // Carregar base de dades existent o crear-ne de nova
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
        } else {
            db = new SQL.Database();
        }

        // Configurar PRAGMA
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA foreign_keys = ON');
    }
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

function closeDatabase() {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
    }
}

// Guardar automàticament cada 5 segons
setInterval(() => {
    if (db) {
        saveDatabase();
    }
}, 5000);

module.exports = { getDatabase, saveDatabase, closeDatabase };
