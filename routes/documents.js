const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
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

// Formulari pujar document
router.get('/pujar', async (req, res) => {
    const db = await getDatabase();
    const notes = runQuery(db, `
        SELECT n.*, al.nom, al.cognoms, tn.nom AS tipus_nom, a.nom AS assignatura_nom
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        ORDER BY al.cognoms, al.nom, a.nom
    `);
    const alumnes = runQuery(db, 'SELECT * FROM alumnes ORDER BY cognoms, nom');
    const assignatures = runQuery(db, 'SELECT * FROM assignatures ORDER BY nom');
    res.render('documents/pujar', { title: 'Pujar Document', notes, alumnes, assignatures, nota_id: req.query.nota_id || '' });
});

// Pujar document
router.post('/pujar', upload.single('fitxer'), async (req, res) => {
    const db = await getDatabase();
    const { nota_id, alumne_id, assignatura_id, descripcio } = req.body;

    if (!req.file) {
        return res.status(400).render('errors/500', { title: 'Error', error: new Error('No s\'ha pujat cap fitxer') });
    }

    try {
        runExec(db, `
            INSERT INTO documents (nota_id, alumne_id, assignatura_id, nom_fitxer, ruta_fitxer, tipus_mime, mida_bytes, descripcio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nota_id || null,
            alumne_id || null,
            assignatura_id || null,
            req.file.originalname,
            'documents/' + req.file.filename,
            req.file.mimetype,
            req.file.size,
            descripcio || null
        ]);

        // Redirigir segons d'on ve
        if (nota_id) {
            res.redirect('/notes/' + nota_id);
        } else if (alumne_id) {
            res.redirect('/alumnes/' + alumne_id);
        } else if (assignatura_id) {
            res.redirect('/assignatures/' + assignatura_id);
        } else {
            res.redirect('/documents');
        }
    } catch (error) {
        res.status(500).render('errors/500', { title: 'Error', error });
    }
});

// Descarregar document
router.get('/:id', async (req, res) => {
    const db = await getDatabase();
    const documents = runQuery(db, 'SELECT * FROM documents WHERE id = ?', [req.params.id]);
    const doc = documents[0];

    if (!doc) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', doc.ruta_fitxer);

    if (!fs.existsSync(filePath)) {
        return res.status(404).render('errors/404', { title: 'Fitxer no trobat' });
    }

    res.download(filePath, doc.nom_fitxer);
});

// Veure document (inline)
router.get('/:id/veure', async (req, res) => {
    const db = await getDatabase();
    const documents = runQuery(db, 'SELECT * FROM documents WHERE id = ?', [req.params.id]);
    const doc = documents[0];

    if (!doc) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', doc.ruta_fitxer);

    if (!fs.existsSync(filePath)) {
        return res.status(404).render('errors/404', { title: 'Fitxer no trobat' });
    }

    res.setHeader('Content-Type', doc.tipus_mime);
    res.setHeader('Content-Disposition', 'inline; filename="' + doc.nom_fitxer + '"');
    fs.createReadStream(filePath).pipe(res);
});

// Eliminar document
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    const documents = runQuery(db, 'SELECT * FROM documents WHERE id = ?', [req.params.id]);
    const doc = documents[0];

    if (doc) {
        // Eliminar fitxer del disc
        const filePath = path.join(__dirname, '..', 'uploads', doc.ruta_fitxer);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar registre de la BD
        runExec(db, 'DELETE FROM documents WHERE id = ?', [req.params.id]);
    }

    // Redirigir segons d'on ve
    if (doc && doc.nota_id) {
        res.redirect('/notes/' + doc.nota_id);
    } else if (doc && doc.alumne_id) {
        res.redirect('/alumnes/' + doc.alumne_id);
    } else if (doc && doc.assignatura_id) {
        res.redirect('/assignatures/' + doc.assignatura_id);
    } else {
        res.redirect('/documents');
    }
});

// Llistat de tots els documents
router.get('/', async (req, res) => {
    const db = await getDatabase();
    const documents = runQuery(db, `
        SELECT d.*,
               al.nom AS alumne_nom, al.cognoms AS alumne_cognoms,
               a.nom AS assignatura_nom,
               n.nota AS nota_valor
        FROM documents d
        LEFT JOIN alumnes al ON d.alumne_id = al.id
        LEFT JOIN assignatures a ON d.assignatura_id = a.id
        LEFT JOIN notes n ON d.nota_id = n.id
        ORDER BY d.data_pujada DESC
    `);
    res.render('documents/llistat', { title: 'Documents', documents });
});

module.exports = router;
