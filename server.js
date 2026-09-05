const express = require('express');
const path = require('path');
const { getDatabase, closeDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS com a motor de plantilles
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware per injectar la BD a les rutes
app.use(async (req, res, next) => {
    try {
        req.db = await getDatabase();
        next();
    } catch (error) {
        next(error);
    }
});

// =============================================
// RUTES
// =============================================

// Dashboard
app.get('/', async (req, res) => {
    const db = req.db;

    const alumnes = db.exec('SELECT COUNT(*) as count FROM alumnes');
    const aules = db.exec('SELECT COUNT(*) as count FROM aules');
    const assignatures = db.exec('SELECT COUNT(*) as count FROM assignatures');
    const notes = db.exec('SELECT COUNT(*) as count FROM notes');

    const ultimesNotes = db.exec(`
        SELECT n.*, al.nom, al.cognoms, tn.nom AS tipus_nom, a.nom AS assignatura_nom
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        ORDER BY n.created_at DESC
        LIMIT 5
    `);

    // Convertir resultats a objectes
    const stats = {
        alumnes: alumnes.length > 0 ? alumnes[0].values[0][0] : 0,
        aules: aules.length > 0 ? aules[0].values[0][0] : 0,
        assignatures: assignatures.length > 0 ? assignatures[0].values[0][0] : 0,
        notes: notes.length > 0 ? notes[0].values[0][0] : 0
    };

    const ultimesNotesData = ultimesNotes.length > 0 ?
        ultimesNotes[0].values.map(row => ({
            alumne_nom: row[1],
            alumne_cognoms: row[2],
            tipus_nom: row[5],
            assignatura_nom: row[6],
            nota: row[3]
        })) : [];

    res.render('index', {
        title: 'Dashboard',
        stats,
        ultimesNotes: ultimesNotesData
    });
});

// Routes
app.use('/aules', require('./routes/aules'));
app.use('/alumnes', require('./routes/alumnes'));
app.use('/assignatures', require('./routes/assignatures'));
app.use('/assignatures/:id/tipus_nota', require('./routes/tipus_nota'));
app.use('/assignatures/:id/comportament', require('./routes/comportament'));
app.use('/notes', require('./routes/notes'));
app.use('/documents', require('./routes/documents'));
app.use('/llibre', require('./routes/llibre'));
app.use('/informes', require('./routes/informes'));
app.use('/seguiments', require('./routes/seguiments'));
app.use('/tutories', require('./routes/tutories'));

// 404
app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'No trobat' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('errors/500', { title: 'Error del servidor', error: err });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor executant-se a http://localhost:${PORT}`);
});

// Tancar BD al tancar l'aplicació
process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
});
