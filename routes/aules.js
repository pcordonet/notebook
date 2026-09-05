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

// Llistat d'aules
router.get('/', async (req, res) => {
    const db = await getDatabase();
    const aules = runQuery(db, 'SELECT * FROM aules ORDER BY any_curs DESC, codi_aula');
    res.render('aules/llistat', { title: 'Aules', aules });
});

// Formulari crear aula
router.get('/crear', (req, res) => {
    res.render('aules/formulari', { title: 'Crear Aula', aula: null });
});

// Crear aula
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { any_curs, codi_aula, nom_aula, descripcio } = req.body;

    try {
        runExec(db, 'INSERT INTO aules (any_curs, codi_aula, nom_aula, descripcio) VALUES (?, ?, ?, ?)',
            [any_curs, codi_aula, nom_aula, descripcio]);
        res.redirect('/aules');
    } catch (error) {
        res.render('aules/formulari', { title: 'Crear Aula', aula: req.body, error: error.message });
    }
});

// Detall aula
router.get('/:id', async (req, res) => {
    const db = await getDatabase();
    const aules = runQuery(db, 'SELECT * FROM aules WHERE id = ?', [req.params.id]);
    const aula = aules[0];

    if (!aula) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE aula_id = ?', [req.params.id]);
    res.render('aules/detall', { title: aula.codi_aula, aula, assignatures });
});

// Formulari modificar aula
router.get('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const aules = runQuery(db, 'SELECT * FROM aules WHERE id = ?', [req.params.id]);
    const aula = aules[0];

    if (!aula) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    res.render('aules/formulari', { title: 'Modificar Aula', aula });
});

// Modificar aula
router.post('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const { any_curs, codi_aula, nom_aula, descripcio } = req.body;

    try {
        runExec(db, 'UPDATE aules SET any_curs = ?, codi_aula = ?, nom_aula = ?, descripcio = ? WHERE id = ?',
            [any_curs, codi_aula, nom_aula, descripcio, req.params.id]);
        res.redirect('/aules');
    } catch (error) {
        const aula = { id: req.params.id, any_curs, codi_aula, nom_aula, descripcio };
        res.render('aules/formulari', { title: 'Modificar Aula', aula, error: error.message });
    }
});

// Eliminar aula
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'DELETE FROM aules WHERE id = ?', [req.params.id]);
    res.redirect('/aules');
});

module.exports = router;
