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

// Llistat dels grups de tutoria (assignatures marcades com a Tutoria)
router.get('/', async (req, res) => {
    const db = await getDatabase();

    const grups = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs, au.nom_aula,
               (SELECT COUNT(*) FROM alumne_assignatura aa WHERE aa.assignatura_id = a.id AND aa.actiu = 1) AS num_alumnes,
               (SELECT COUNT(*) FROM seguiments s
                    JOIN alumne_assignatura aa2 ON aa2.alumne_id = s.alumne_id AND aa2.actiu = 1
                    WHERE aa2.assignatura_id = a.id AND s.estat != 'tancat') AS seguiments_actius
        FROM assignatures a
        JOIN aules au ON a.aula_id = au.id
        WHERE a.es_tutoria = 1 AND a.actiu = 1
        ORDER BY au.any_curs DESC, au.codi_aula, a.nom
    `);

    res.render('tutories/llistat', { title: 'Tutories', grups });
});

// Formulari nova tutoria individual
router.get('/crear', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [req.query.alumne_id]);
    const alumne = alumnes[0];

    if (!alumne) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const seguimentsOberts = runQuery(db, `
        SELECT * FROM seguiments WHERE alumne_id = ? AND estat != 'tancat' ORDER BY data_obertura DESC
    `, [alumne.id]);

    res.render('tutories/formulari', { title: 'Nova Tutoria Individual', alumne, tutoria: null, seguimentsOberts });
});

// Crear tutoria individual
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, seguiment_id, data, motiu, temes_tractats, observacions, acords, data_seguiment, estat } = req.body;

    try {
        runExec(db, `
            INSERT INTO tutories_individuals (alumne_id, seguiment_id, data, motiu, temes_tractats, observacions, acords, data_seguiment, estat)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [alumne_id, seguiment_id || null, data || new Date().toISOString().split('T')[0], motiu || null, temes_tractats || null, observacions || null, acords || null, data_seguiment || null, estat || 'pendent']);

        res.redirect('/alumnes/' + alumne_id);
    } catch (error) {
        const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [alumne_id]);
        const seguimentsOberts = runQuery(db, `SELECT * FROM seguiments WHERE alumne_id = ? AND estat != 'tancat' ORDER BY data_obertura DESC`, [alumne_id]);
        res.render('tutories/formulari', { title: 'Nova Tutoria Individual', alumne: alumnes[0], tutoria: req.body, seguimentsOberts, error: error.message });
    }
});

// Formulari modificar tutoria individual
router.get('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const tutories = runQuery(db, 'SELECT * FROM tutories_individuals WHERE id = ?', [req.params.id]);
    const tutoria = tutories[0];

    if (!tutoria) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [tutoria.alumne_id]);
    const seguimentsOberts = runQuery(db, `
        SELECT * FROM seguiments WHERE alumne_id = ? AND (estat != 'tancat' OR id = ?) ORDER BY data_obertura DESC
    `, [tutoria.alumne_id, tutoria.seguiment_id || 0]);

    res.render('tutories/formulari', { title: 'Modificar Tutoria Individual', alumne: alumnes[0], tutoria, seguimentsOberts });
});

// Modificar tutoria individual
router.post('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, seguiment_id, data, motiu, temes_tractats, observacions, acords, data_seguiment, estat } = req.body;

    try {
        runExec(db, `
            UPDATE tutories_individuals
            SET seguiment_id = ?, data = ?, motiu = ?, temes_tractats = ?, observacions = ?, acords = ?, data_seguiment = ?, estat = ?
            WHERE id = ?
        `, [seguiment_id || null, data, motiu || null, temes_tractats || null, observacions || null, acords || null, data_seguiment || null, estat || 'pendent', req.params.id]);

        res.redirect('/alumnes/' + alumne_id);
    } catch (error) {
        const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [alumne_id]);
        const seguimentsOberts = runQuery(db, `SELECT * FROM seguiments WHERE alumne_id = ? AND estat != 'tancat' ORDER BY data_obertura DESC`, [alumne_id]);
        const tutoriaData = { id: req.params.id, alumne_id, seguiment_id, data, motiu, temes_tractats, observacions, acords, data_seguiment, estat };
        res.render('tutories/formulari', { title: 'Modificar Tutoria Individual', alumne: alumnes[0], tutoria: tutoriaData, seguimentsOberts, error: error.message });
    }
});

// Eliminar tutoria individual
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    const tutories = runQuery(db, 'SELECT alumne_id FROM tutories_individuals WHERE id = ?', [req.params.id]);
    const alumneId = tutories[0]?.alumne_id;

    runExec(db, 'DELETE FROM tutories_individuals WHERE id = ?', [req.params.id]);

    res.redirect(alumneId ? '/alumnes/' + alumneId : '/alumnes');
});

module.exports = router;
