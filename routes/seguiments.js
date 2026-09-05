const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db/database');

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

const TIPUS_LABELS = {
    academic: 'Acadèmic',
    absentisme: 'Absentisme',
    comportament: 'Comportament',
    convivencia: 'Convivència',
    personal: 'Personal',
    orientacio: 'Orientació',
    altres: 'Altres'
};

const ESTAT_LABELS = {
    obert: 'Obert',
    en_seguiment: 'En seguiment',
    resolucio: 'Resolució',
    tancat: 'Tancat'
};

// Formulari nou seguiment
router.get('/crear', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [req.query.alumne_id]);
    const alumne = alumnes[0];

    if (!alumne) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    res.render('seguiments/formulari', { title: 'Nou Seguiment', alumne, tipusLabels: TIPUS_LABELS });
});

// Crear seguiment
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, tipus, responsable, motiu } = req.body;

    try {
        runExec(db, 'INSERT INTO seguiments (alumne_id, tipus, responsable, motiu) VALUES (?, ?, ?, ?)',
            [alumne_id, tipus, responsable || null, motiu]);
        const idResult = runQuery(db, 'SELECT last_insert_rowid() as id');
        res.redirect('/seguiments/' + idResult[0].id);
    } catch (error) {
        const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [alumne_id]);
        res.render('seguiments/formulari', { title: 'Nou Seguiment', alumne: alumnes[0], tipusLabels: TIPUS_LABELS, error: error.message });
    }
});

// Detall d'un seguiment
router.get('/:id', async (req, res) => {
    const db = await getDatabase();
    const seguiments = runQuery(db, `
        SELECT s.*, al.nom, al.cognoms
        FROM seguiments s
        JOIN alumnes al ON s.alumne_id = al.id
        WHERE s.id = ?
    `, [req.params.id]);

    const seguiment = seguiments[0];

    if (!seguiment) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const accions = runQuery(db, 'SELECT * FROM seguiment_accions WHERE seguiment_id = ? ORDER BY data DESC, created_at DESC', [req.params.id]);
    const tutoriesRelacionades = runQuery(db, 'SELECT * FROM tutories_individuals WHERE seguiment_id = ? ORDER BY data DESC', [req.params.id]);

    res.render('seguiments/detall', {
        title: 'Seguiment #' + seguiment.id,
        seguiment,
        accions,
        tutoriesRelacionades,
        tipusLabels: TIPUS_LABELS,
        estatLabels: ESTAT_LABELS
    });
});

// Afegir acció al seguiment
router.post('/:id/accions', async (req, res) => {
    const db = await getDatabase();
    const { data, descripcio } = req.body;

    try {
        runExec(db, 'INSERT INTO seguiment_accions (seguiment_id, data, descripcio) VALUES (?, ?, ?)',
            [req.params.id, data || new Date().toISOString().split('T')[0], descripcio]);
    } catch (error) {
        // Es mostrarà l'error a la propera càrrega si cal
    }

    res.redirect('/seguiments/' + req.params.id);
});

// Marcar/desmarcar una acció com a feta
router.post('/accions/:accio_id/toggle', async (req, res) => {
    const db = await getDatabase();
    const accions = runQuery(db, 'SELECT * FROM seguiment_accions WHERE id = ?', [req.params.accio_id]);
    const accio = accions[0];

    if (!accio) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    runExec(db, 'UPDATE seguiment_accions SET fet = ? WHERE id = ?', [accio.fet ? 0 : 1, req.params.accio_id]);
    res.redirect('/seguiments/' + accio.seguiment_id);
});

// Canviar l'estat d'un seguiment
router.post('/:id/estat', async (req, res) => {
    const db = await getDatabase();
    const { estat } = req.body;

    const dataTancament = estat === 'tancat' ? new Date().toISOString().split('T')[0] : null;
    runExec(db, 'UPDATE seguiments SET estat = ?, data_tancament = ? WHERE id = ?', [estat, dataTancament, req.params.id]);

    res.redirect('/seguiments/' + req.params.id);
});

// Eliminar seguiment
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    const seguiments = runQuery(db, 'SELECT alumne_id FROM seguiments WHERE id = ?', [req.params.id]);
    const alumneId = seguiments[0]?.alumne_id;

    runExec(db, 'DELETE FROM seguiments WHERE id = ?', [req.params.id]);

    res.redirect(alumneId ? '/alumnes/' + alumneId : '/alumnes');
});

module.exports = router;
