const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');
const upload = require('../middleware/upload');

// Helper per executar queries
function runQuery(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function runExec(db, sql, params = []) {
    db.run(sql, params);
}

// Desar els documents pujats juntament amb una nota
function desarDocumentsNota(db, files, { nota_id, alumne_id, assignatura_id }) {
    files.forEach(file => {
        runExec(db, `
            INSERT INTO documents (nota_id, alumne_id, assignatura_id, nom_fitxer, ruta_fitxer, tipus_mime, mida_bytes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [nota_id || null, alumne_id || null, assignatura_id || null, file.originalname, 'documents/' + file.filename, file.mimetype, file.size]);
    });
}

// Llistat de notes
router.get('/', async (req, res) => {
    const db = await getDatabase();
    const notes = runQuery(db, `
        SELECT n.*, al.nom, al.cognoms, tn.nom AS tipus_nom, tn.trimestre, a.nom AS assignatura_nom
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        ORDER BY al.cognoms, al.nom, a.nom, tn.trimestre
    `);
    res.render('notes/llistat', { title: 'Notes', notes });
});

// Formulari crear nota
router.get('/crear', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, `
        SELECT DISTINCT al.*
        FROM alumnes al
        JOIN alumne_assignatura aa ON al.id = aa.alumne_id
        WHERE aa.actiu = 1
        ORDER BY al.cognoms, al.nom
    `);
    const assignatures = runQuery(db, 'SELECT * FROM assignatures ORDER BY nom');
    res.render('notes/formulari', { title: 'Crear Nota', nota: null, alumnes, assignatures, tipusNota: [] });
});

// Obtenir tipus de nota per assignatura (AJAX)
router.get('/tipus_nota/:assignatura_id', async (req, res) => {
    const db = await getDatabase();
    const tipusNota = runQuery(db, 'SELECT * FROM tipus_nota WHERE assignatura_id = ? ORDER BY trimestre, nom', [req.params.assignatura_id]);
    res.json(tipusNota);
});

// Crear nota
router.post('/crear', upload.array('fitxers'), async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, tipus_nota_id, nota, data, observacions } = req.body;

    try {
        runExec(db, 'INSERT INTO notes (alumne_id, tipus_nota_id, nota, data, observacions) VALUES (?, ?, ?, ?, ?)',
            [alumne_id, tipus_nota_id, nota, data || new Date().toISOString().split('T')[0], observacions || null]);

        if (req.files && req.files.length > 0) {
            const notaIdResult = runQuery(db, 'SELECT last_insert_rowid() as id');
            const tipusNotaResult = runQuery(db, 'SELECT assignatura_id FROM tipus_nota WHERE id = ?', [tipus_nota_id]);
            desarDocumentsNota(db, req.files, {
                nota_id: notaIdResult[0].id,
                alumne_id,
                assignatura_id: tipusNotaResult[0]?.assignatura_id
            });
        }

        res.redirect('/notes');
    } catch (error) {
        const alumnes = runQuery(db, 'SELECT * FROM alumnes ORDER BY cognoms, nom');
        const assignatures = runQuery(db, 'SELECT * FROM assignatures ORDER BY nom');
        res.render('notes/formulari', { title: 'Crear Nota', nota: req.body, alumnes, assignatures, tipusNota: [], error: error.message });
    }
});

// Detall nota
router.get('/:id', async (req, res) => {
    const db = await getDatabase();
    const notes = runQuery(db, `
        SELECT n.*, al.nom, al.cognoms, tn.nom AS tipus_nom, tn.trimestre, 
               tn.pes_trimestre, tn.pes_global, a.nom AS assignatura_nom
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        WHERE n.id = ?
    `, [req.params.id]);

    const nota = notes[0];

    if (!nota) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const documents = runQuery(db, 'SELECT * FROM documents WHERE nota_id = ? ORDER BY data_pujada DESC', [req.params.id]);

    res.render('notes/detall', { title: 'Nota - ' + nota.cognoms + ', ' + nota.nom, nota, documents });
});

// Formulari modificar nota
router.get('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const notes = runQuery(db, 'SELECT * FROM notes WHERE id = ?', [req.params.id]);
    const nota = notes[0];

    if (!nota) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const alumnes = runQuery(db, 'SELECT * FROM alumnes ORDER BY cognoms, nom');
    const assignatures = runQuery(db, 'SELECT * FROM assignatures ORDER BY nom');
    const tipusNota = runQuery(db, `
        SELECT tn.*, a.nom AS assignatura_nom
        FROM tipus_nota tn
        JOIN assignatures a ON tn.assignatura_id = a.id
        ORDER BY a.nom, tn.trimestre, tn.nom
    `);

    res.render('notes/formulari', { title: 'Modificar Nota', nota, alumnes, assignatures, tipusNota });
});

// Modificar nota
router.post('/:id/editar', upload.array('fitxers'), async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, tipus_nota_id, nota, data, observacions } = req.body;

    try {
        runExec(db, 'UPDATE notes SET alumne_id = ?, tipus_nota_id = ?, nota = ?, data = ?, observacions = ? WHERE id = ?',
            [alumne_id, tipus_nota_id, nota, data, observacions || null, req.params.id]);

        if (req.files && req.files.length > 0) {
            const tipusNotaResult = runQuery(db, 'SELECT assignatura_id FROM tipus_nota WHERE id = ?', [tipus_nota_id]);
            desarDocumentsNota(db, req.files, {
                nota_id: req.params.id,
                alumne_id,
                assignatura_id: tipusNotaResult[0]?.assignatura_id
            });
        }

        res.redirect('/notes/' + req.params.id);
    } catch (error) {
        const alumnes = runQuery(db, 'SELECT * FROM alumnes ORDER BY cognoms, nom');
        const assignatures = runQuery(db, 'SELECT * FROM assignatures ORDER BY nom');
        const tipusNota = runQuery(db, 'SELECT * FROM tipus_nota ORDER BY assignatura_id, trimestre, nom');
        const notaData = { id: req.params.id, alumne_id, tipus_nota_id, nota, data, observacions };
        res.render('notes/formulari', { title: 'Modificar Nota', nota: notaData, alumnes, assignatures, tipusNota, error: error.message });
    }
});

// Eliminar nota
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'DELETE FROM notes WHERE id = ?', [req.params.id]);
    res.redirect('/notes');
});

// API: Actualitzar nota (AJAX)
router.post('/api/update', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, tipus_nota_id, nota, observacions } = req.body;

    try {
        // Obtenir el tipus del tipus_nota
        const tipusNotaResult = runQuery(db, 'SELECT tipus FROM tipus_nota WHERE id = ?', [tipus_nota_id]);
        const tipus = tipusNotaResult[0]?.tipus || 'Nota';

        // Buscar si ja existeix una nota per aquest alumne i tipus
        const existing = runQuery(db, 
            'SELECT id FROM notes WHERE alumne_id = ? AND tipus_nota_id = ?',
            [alumne_id, tipus_nota_id]);

        let notaId = null;

        if (nota === null || nota === undefined) {
            // Eliminar nota
            if (existing.length > 0) {
                runExec(db, 'DELETE FROM notes WHERE id = ?', [existing[0].id]);
            }
        } else if (existing.length > 0) {
            // Actualitzar nota existent
            runExec(db, 'UPDATE notes SET nota = ?, tipus = ?, data = ?, observacions = ? WHERE id = ?',
                [nota, tipus, new Date().toISOString().split('T')[0], observacions || null, existing[0].id]);
            notaId = existing[0].id;
        } else {
            // Crear nova nota
            runExec(db, 'INSERT INTO notes (alumne_id, tipus_nota_id, nota, tipus, data, observacions) VALUES (?, ?, ?, ?, ?, ?)',
                [alumne_id, tipus_nota_id, nota, tipus, new Date().toISOString().split('T')[0], observacions || null]);
            const idResult = runQuery(db, 'SELECT last_insert_rowid() as id');
            notaId = idResult[0].id;
        }

        res.json({ success: true, nota_id: notaId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
