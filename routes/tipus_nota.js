const express = require('express');
const router = express.Router({ mergeParams: true });
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

// Formulari crear tipus de nota
router.get('/crear', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE id = ?', [req.params.id]);
    const assignatura = assignatures[0];
    
    // Pre-omplir dades des de query parameters
    const tipusNotaPre = {
        trimestre: req.query.trimestre || '',
        assignatura_id: req.params.id
    };
    
    res.render('tipus_nota/formulari', { title: 'Crear Tipus de Nota', assignatura, tipusNota: tipusNotaPre });
});

// Crear tipus de nota
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { nom, descripcio, tipus, pes_trimestre, pes_global, trimestre } = req.body;

    try {
        runExec(db, 'INSERT INTO tipus_nota (assignatura_id, nom, descripcio, tipus, pes_trimestre, pes_global, trimestre) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.params.id, nom, descripcio, tipus || 'Nota', pes_trimestre || 1.0, pes_global || 1.0, trimestre || null]);
        res.redirect('/assignatures/' + req.params.id + '/avaluacio');
    } catch (error) {
        const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE id = ?', [req.params.id]);
        const assignatura = assignatures[0];
        res.render('tipus_nota/formulari', { title: 'Crear Tipus de Nota', assignatura, tipusNota: req.body, error: error.message });
    }
});

// Eliminar tipus de nota
router.post('/:tipus_id/eliminar', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'DELETE FROM tipus_nota WHERE id = ?', [req.params.tipus_id]);
    res.redirect('/assignatures/' + req.params.id);
});

// Formulari modificar tipus de nota
router.get('/:tipus_id/editar', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE id = ?', [req.params.id]);
    const assignatura = assignatures[0];
    
    const tipusNotaResult = runQuery(db, 'SELECT * FROM tipus_nota WHERE id = ?', [req.params.tipus_id]);
    const tipusNota = tipusNotaResult[0];
    
    if (!tipusNota) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }
    
    res.render('tipus_nota/formulari', { title: 'Modificar Tipus de Nota', assignatura, tipusNota });
});

// Modificar tipus de nota
router.post('/:tipus_id/editar', async (req, res) => {
    const db = await getDatabase();
    const { nom, descripcio, tipus, pes_trimestre, pes_global, trimestre } = req.body;

    try {
        runExec(db, 'UPDATE tipus_nota SET nom = ?, descripcio = ?, tipus = ?, pes_trimestre = ?, pes_global = ?, trimestre = ? WHERE id = ?',
            [nom, descripcio, tipus || 'Nota', pes_trimestre || 1.0, pes_global || 1.0, trimestre || null, req.params.tipus_id]);
        
        // Si és petició JSON, retornar JSON, sinó redirigir
        if (req.headers['content-type']?.includes('application/json')) {
            res.json({ success: true });
        } else {
            res.redirect('/assignatures/' + req.params.id);
        }
    } catch (error) {
        if (req.headers['content-type']?.includes('application/json')) {
            res.status(500).json({ success: false, error: error.message });
        } else {
            const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE id = ?', [req.params.id]);
            const assignatura = assignatures[0];
            const tipusNota = { id: req.params.tipus_id, nom, descripcio, tipus, pes_trimestre, pes_global, trimestre };
            res.render('tipus_nota/formulari', { title: 'Modificar Tipus de Nota', assignatura, tipusNota, error: error.message });
        }
    }
});

// API: Comprovar si un tipus de nota té notes
router.get('/:tipus_id/check-notes', async (req, res) => {
    const db = await getDatabase();
    const notes = runQuery(db, 'SELECT COUNT(*) as count FROM notes WHERE tipus_nota_id = ?', [req.params.tipus_id]);
    const count = notes[0]?.count || 0;
    res.json({ hasNotes: count > 0, count: count });
});

// API: Eliminar tipus de nota (AJAX)
router.post('/:tipus_id/eliminar-ajax', async (req, res) => {
    const db = await getDatabase();
    
    // Comprovar si té notes
    const notes = runQuery(db, 'SELECT COUNT(*) as count FROM notes WHERE tipus_nota_id = ?', [req.params.tipus_id]);
    const count = notes[0]?.count || 0;
    
    if (count > 0) {
        return res.status(400).json({ success: false, error: 'No es pot eliminar: té ' + count + ' nota(es) registrada(es)' });
    }
    
    try {
        runExec(db, 'DELETE FROM tipus_nota WHERE id = ?', [req.params.tipus_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
