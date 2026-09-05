const express = require('express');
const router = express.Router();
const { stringify } = require('csv-stringify/sync');
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

// Llibre d'avaluació (llistat d'assignatures)
router.get('/', async (req, res) => {
    const db = await getDatabase();

    // Obtenir assignatures actives amb informació de l'aula
    const assignatures = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs
        FROM assignatures a
        JOIN aules au ON a.aula_id = au.id
        WHERE a.actiu = 1
        ORDER BY au.any_curs DESC, au.codi_aula, a.nom
    `);

    res.render('llibre/llibre', {
        title: "Llibre d'avaluació",
        assignatures
    });
});

// Llibre d'un alumne
router.get('/:alumne_id', async (req, res) => {
    const db = await getDatabase();
    const alumnes = runQuery(db, 'SELECT * FROM alumnes WHERE id = ?', [req.params.alumne_id]);
    const alumne = alumnes[0];

    if (!alumne) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    // Obtenir assignatures de l'alumne
    const assignatures = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs
        FROM assignatures a
        JOIN alumne_assignatura aa ON a.id = aa.assignatura_id
        JOIN aules au ON a.aula_id = au.id
        WHERE aa.alumne_id = ? AND aa.actiu = 1
        ORDER BY a.nom
    `, [req.params.alumne_id]);

    // Per cada assignatura, obtenir notes i mitjanes
    const dadesAssignatures = assignatures.map(assignatura => {
        const tipusNota = runQuery(db, 'SELECT * FROM tipus_nota WHERE assignatura_id = ? ORDER BY trimestre, nom', [assignatura.id]);

        const notes = tipusNota.map(tn => {
            const notesResult = runQuery(db, `
                SELECT * FROM notes
                WHERE alumne_id = ? AND tipus_nota_id = ?
                ORDER BY data DESC LIMIT 1
            `, [req.params.alumne_id, tn.id]);

            const nota = notesResult.length > 0 ? notesResult[0] : null;

            return {
                tipus: tn,
                nota: nota ? nota.nota : null,
                data: nota ? nota.data : null
            };
        });

        // Calcular mitjanes
        let sumaTrimestre = 0, pesTrimestre = 0, sumaGlobal = 0, pesGlobal = 0;

        notes.forEach(n => {
            if (n.nota !== null) {
                sumaTrimestre += n.nota * n.tipus.pes_trimestre;
                pesTrimestre += n.tipus.pes_trimestre;
                sumaGlobal += n.nota * n.tipus.pes_global;
                pesGlobal += n.tipus.pes_global;
            }
        });

        return {
            assignatura,
            notes,
            mitjana_trimestre: pesTrimestre > 0 ? (sumaTrimestre / pesTrimestre) : null,
            mitjana_global: pesGlobal > 0 ? (sumaGlobal / pesGlobal) : null
        };
    });

    res.render('llibre/alumne', { title: 'Llibre - ' + alumne.nom + ' ' + alumne.cognoms, alumne, dadesAssignatures });
});

// Exportar CSV
router.get('/export/csv', async (req, res) => {
    const db = await getDatabase();
    const any_curs = req.query.any_curs || '';

    let query = `
        SELECT al.nom, al.cognoms, a.nom AS assignatura, tn.nom AS tipus_nota,
               tn.trimestre, n.nota, n.data
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        JOIN assignatures a ON tn.assignatura_id = a.id
    `;

    const params = [];

    if (any_curs) {
        query += ' JOIN aules au ON a.aula_id = au.id WHERE au.any_curs = ?';
        params.push(any_curs);
    }

    query += ' ORDER BY al.cognoms, al.nom, a.nom, tn.trimestre';

    const notes = runQuery(db, query, params);

    const csv = stringify(notes, {
        header: true,
        columns: ['cognoms', 'nom', 'assignatura', 'tipus_nota', 'trimestre', 'nota', 'data']
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=llibre_notes.csv');
    res.send('\ufeff' + csv); // BOM per Excel
});

// API: Toggle estat actiu/inactiu d'una assignatura
router.post('/api/toggle-actiu/:id', async (req, res) => {
    const db = await getDatabase();
    
    try {
        // Obtenir estat actual
        const assignatura = runQuery(db, 'SELECT actiu FROM assignatures WHERE id = ?', [req.params.id]);
        
        if (assignatura.length === 0) {
            return res.status(404).json({ success: false, error: 'Assignatura no trobada' });
        }
        
        const nouEstat = assignatura[0].actiu ? 0 : 1;
        runExec(db, 'UPDATE assignatures SET actiu = ? WHERE id = ?', [nouEstat, req.params.id]);
        
        res.json({ success: true, actiu: nouEstat });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
