const fs = require('fs');
const path = require('path');
const { getDatabase, closeDatabase, saveDatabase } = require('./database');

const SQL_PATH = path.join(__dirname, 'init.sql');

async function initDatabase() {
    console.log('Inicialitzant base de dades...');

    try {
        const db = await getDatabase();
        const sql = fs.readFileSync(SQL_PATH, 'utf8');

        // Executar cada statement per separat
        const statements = sql.split(';').filter(s => s.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                db.run(statement + ';');
            }
        }

        saveDatabase();
        console.log('Base de dades inicialitzada correctament!');
        console.log('Fitxer: ' + DB_PATH);
        closeDatabase();
    } catch (error) {
        console.error('Error inicialitzant la base de dades:', error.message);
        process.exit(1);
    }
}

const DB_PATH = path.join(__dirname, 'notbook.db');
initDatabase();
