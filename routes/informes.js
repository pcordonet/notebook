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

// Pàgina d'informes
router.get('/', async (req, res) => {
    const db = await getDatabase();

    // Estadístiques generals
    const totalAlumnesResult = runQuery(db, 'SELECT COUNT(*) as count FROM alumnes');
    const totalAlumnes = totalAlumnesResult.length > 0 ? totalAlumnesResult[0].count : 0;

    const totalAssignaturesResult = runQuery(db, 'SELECT COUNT(*) as count FROM assignatures');
    const totalAssignatures = totalAssignaturesResult.length > 0 ? totalAssignaturesResult[0].count : 0;

    const totalNotesResult = runQuery(db, 'SELECT COUNT(*) as count FROM notes');
    const totalNotes = totalNotesResult.length > 0 ? totalNotesResult[0].count : 0;

    // Mitjana per assignatura
    const mitjanaPerAssignatura = runQuery(db, `
        SELECT a.nom AS assignatura,
               ROUND(SUM(n.nota * tn.pes_global) / NULLIF(SUM(tn.pes_global), 0), 2) AS mitjana_global,
               COUNT(DISTINCT n.alumne_id) AS num_alumnes
        FROM notes n
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        GROUP BY a.id
        ORDER BY a.nom
    `);

    // Mitjana per alumne
    const mitjanaPerAlumne = runQuery(db, `
        SELECT al.nom, al.cognoms,
               ROUND(SUM(n.nota * tn.pes_global) / NULLIF(SUM(tn.pes_global), 0), 2) AS mitjana_global,
               COUNT(n.id) AS num_notes
        FROM notes n
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN alumnes al ON n.alumne_id = al.id
        GROUP BY al.id
        ORDER BY al.cognoms, al.nom
    `);

    // Notes més altes
    const notesAltes = runQuery(db, `
        SELECT n.nota, al.nom, al.cognoms, tn.nom AS tipus_nom, a.nom AS assignatura_nom
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        ORDER BY n.nota DESC
        LIMIT 10
    `);

    // Notes més baixes
    const notesBaixes = runQuery(db, `
        SELECT n.nota, al.nom, al.cognoms, tn.nom AS tipus_nom, a.nom AS assignatura_nom
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        ORDER BY n.nota ASC
        LIMIT 10
    `);

    // Alumnes aprovats/suspesos per assignatura
    const aprovatsPerAssignatura = runQuery(db, `
        SELECT a.nom AS assignatura,
               COUNT(DISTINCT CASE WHEN n.nota >= 5 THEN n.alumne_id END) AS aprovats,
               COUNT(DISTINCT CASE WHEN n.nota < 5 THEN n.alumne_id END) AS suspesos,
               COUNT(DISTINCT n.alumne_id) AS total
        FROM notes n
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
        GROUP BY a.id
        ORDER BY a.nom
    `);

    res.render('informes/estadistiques', {
        title: 'Estadístiques',
        totalAlumnes,
        totalAssignatures,
        totalNotes,
        mitjanaPerAssignatura,
        mitjanaPerAlumne,
        notesAltes,
        notesBaixes,
        aprovatsPerAssignatura
    });
});

module.exports = router;
