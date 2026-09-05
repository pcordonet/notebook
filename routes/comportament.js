const express = require('express');
const router = express.Router({ mergeParams: true });
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

// API: Obtenir comportament d'un alumne en una assignatura
router.get('/alumne/:alumne_id', async (req, res) => {
    const db = await getDatabase();
    const registres = runQuery(db, `
        SELECT * FROM comportament 
        WHERE alumne_id = ? AND assignatura_id = ? 
        ORDER BY data DESC, created_at DESC
    `, [req.params.alumne_id, req.params.id]);
    res.json(registres);
});

// API: Afegir registre de comportament
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, tipus, descripcio, punts, data } = req.body;

    try {
        runExec(db, 'INSERT INTO comportament (alumne_id, assignatura_id, tipus, descripcio, punts, data) VALUES (?, ?, ?, ?, ?, ?)',
            [alumne_id, req.params.id, tipus, descripcio, punts || 0, data || new Date().toISOString().split('T')[0]]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Eliminar registre de comportament
router.post('/:registre_id/eliminar', async (req, res) => {
    const db = await getDatabase();
    try {
        runExec(db, 'DELETE FROM comportament WHERE id = ?', [req.params.registre_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Resum de comportament d'un alumne
router.get('/resum/:alumne_id', async (req, res) => {
    const db = await getDatabase();
    
    const resum = runQuery(db, `
        SELECT 
            tipus,
            COUNT(*) as count,
            SUM(punts) as total_punts
        FROM comportament 
        WHERE alumne_id = ? AND assignatura_id = ?
        GROUP BY tipus
    `, [req.params.alumne_id, req.params.id]);
    
    res.json(resum);
});

module.exports = router;
