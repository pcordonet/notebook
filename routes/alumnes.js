const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');

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

// Llistat d'alumnes
router.get('/', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, 'SELECT * FROM alumnes ORDER BY cognoms, nom');
    res.render('alumnes/llistat', { title: 'Alumnes', alumnes });
});

// Formulari crear alumne
router.get('/crear', (req, res) => {
    res.render('alumnes/formulari', { title: 'Crear Alumne', alumne: null });
});

// Crear alumne
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { nom, cognoms, data_naixement } = req.body;

    try {
        runExec(db, 'INSERT INTO alumnes (nom, cognoms, data_naixement) VALUES (?, ?, ?)',
            [nom, cognoms, data_naixement || null]);
        res.redirect('/alumnes');
    } catch (error) {
        res.render('alumnes/formulari', { title: 'Crear Alumne', alumne: req.body, error: error.message });
    }
});

// Fitxa alumne
router.get('/:id', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [req.params.id]);
    const alumne = alumnes[0];

    if (!alumne) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const assignatures = runQuery(db, `
        SELECT a.*, aa.data_inscripcio, aa.actiu
        FROM assignatures a
        JOIN alumne_assignatura aa ON a.id = aa.assignatura_id
        WHERE aa.alumne_id = ?
        ORDER BY a.nom
    `, [req.params.id]);

    const notes = runQuery(db, `
        SELECT n.*, tn.nom AS tipus_nom, tn.trimestre, a.nom AS assignatura_nom
        FROM notes n
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        WHERE n.alumne_id = ?
        ORDER BY a.nom, tn.trimestre
    `, [req.params.id]);

    const documents = runQuery(db, 'SELECT * FROM documents WHERE alumne_id = ? ORDER BY data_pujada DESC', [req.params.id]);

    // Obtenir totes les assignatures per al modal d'inscripció
    const totesAssignatures = runQuery(db, 'SELECT * FROM assignatures ORDER BY nom');

    // Grup de tutoria de l'alumne (si n'hi ha)
    const tutories_grup = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs
        FROM assignatures a
        JOIN alumne_assignatura aa ON a.id = aa.assignatura_id
        JOIN aules au ON a.aula_id = au.id
        WHERE aa.alumne_id = ? AND aa.actiu = 1 AND a.es_tutoria = 1
    `, [req.params.id]);

    // Seguiments de l'alumne
    const seguiments = runQuery(db, 'SELECT * FROM seguiments WHERE alumne_id = ? ORDER BY data_obertura DESC', [req.params.id]);

    // Tutories individuals de l'alumne
    const tutoriesIndividuals = runQuery(db, 'SELECT * FROM tutories_individuals WHERE alumne_id = ? ORDER BY data DESC', [req.params.id]);

    res.render('alumnes/fitxa', {
        title: alumne.nom + ' ' + alumne.cognoms,
        alumne, assignatures, notes, documents, totesAssignatures,
        grupTutoria: tutories_grup[0] || null,
        seguiments,
        tutoriesIndividuals
    });
});

// Formulari modificar alumne
router.get('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [req.params.id]);
    const alumne = alumnes[0];

    if (!alumne) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    res.render('alumnes/formulari', { title: 'Modificar Alumne', alumne });
});

// Modificar alumne
router.post('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const { nom, cognoms, data_naixement } = req.body;

    try {
        runExec(db, 'UPDATE alumnes SET nom = ?, cognoms = ?, data_naixement = ? WHERE id = ?',
            [nom, cognoms, data_naixement || null, req.params.id]);
        res.redirect('/alumnes');
    } catch (error) {
        const alumne = { id: req.params.id, nom, cognoms, data_naixement };
        res.render('alumnes/formulari', { title: 'Modificar Alumne', alumne, error: error.message });
    }
});

// Eliminar alumne
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'DELETE FROM alumnes WHERE id = ?', [req.params.id]);
    res.redirect('/alumnes');
});

// Inscriure alumne a assignatura
router.post('/:id/inscriure', async (req, res) => {
    const db = await getDatabase();
    const { assignatura_id } = req.body;

    try {
        runExec(db, 'INSERT OR IGNORE INTO alumne_assignatura (alumne_id, assignatura_id) VALUES (?, ?)',
            [req.params.id, assignatura_id]);
        res.redirect('/alumnes/' + req.params.id);
    } catch (error) {
        res.redirect('/alumnes/' + req.params.id);
    }
});

// Donar de baixa alumne d'assignatura
router.post('/:id/baixa/:assignatura_id', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'UPDATE alumne_assignatura SET actiu = 0 WHERE alumne_id = ? AND assignatura_id = ?',
        [req.params.id, req.params.assignatura_id]);
    res.redirect('/alumnes/' + req.params.id);
});

module.exports = router;
