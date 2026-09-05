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

// Llistat d'assignatures
router.get('/', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs
        FROM assignatures a
        JOIN aules au ON a.aula_id = au.id
        ORDER BY au.any_curs DESC, au.codi_aula, a.nom
    `);
    res.render('assignatures/llistat', { title: 'Assignatures', assignatures });
});

// Formulari crear assignatura
router.get('/crear', async (req, res) => {
    const db = await getDatabase();
    const aules = runQuery(db, 'SELECT * FROM aules ORDER BY any_curs DESC, codi_aula');
    const aula_id = req.query.aula_id || '';
    res.render('assignatures/formulari', { title: 'Crear Assignatura', assignatura: { aula_id }, aules });
});

// Crear assignatura
router.post('/crear', async (req, res) => {
    const db = await getDatabase();
    const { nom, descripcio, aula_id, actiu, es_tutoria } = req.body;

    try {
        runExec(db, 'INSERT INTO assignatures (nom, descripcio, aula_id, actiu, es_tutoria) VALUES (?, ?, ?, ?, ?)',
            [nom, descripcio, aula_id, actiu ? 1 : 0, es_tutoria ? 1 : 0]);
        res.redirect('/assignatures');
    } catch (error) {
        const aules = runQuery(db, 'SELECT * FROM aules ORDER BY any_curs DESC, codi_aula');
        res.render('assignatures/formulari', { title: 'Crear Assignatura', assignatura: req.body, aules, error: error.message });
    }
});

// Detall assignatura
router.get('/:id', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs, au.nom_aula
        FROM assignatures a
        JOIN aules au ON a.aula_id = au.id
        WHERE a.id = ?
    `, [req.params.id]);

    const assignatura = assignatures[0];

    if (!assignatura) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const tipusNota = runQuery(db, 'SELECT * FROM tipus_nota WHERE assignatura_id = ? ORDER BY trimestre, nom', [req.params.id]);
    const alumnes = runQuery(db, `
        SELECT al.*, aa.data_inscripcio, aa.actiu
        FROM alumnes al
        JOIN alumne_assignatura aa ON al.id = aa.alumne_id
        WHERE aa.assignatura_id = ? AND aa.actiu = 1
        ORDER BY al.cognoms, al.nom
    `, [req.params.id]);

    res.render('assignatures/detall', { title: assignatura.nom, assignatura, tipusNota, alumnes });
});

// Formulari modificar assignatura
router.get('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE id = ?', [req.params.id]);
    const assignatura = assignatures[0];

    if (!assignatura) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const aules = runQuery(db, 'SELECT * FROM aules ORDER BY any_curs DESC, codi_aula');
    res.render('assignatures/formulari', { title: 'Modificar Assignatura', assignatura, aules });
});

// Modificar assignatura
router.post('/:id/editar', async (req, res) => {
    const db = await getDatabase();
    const { nom, descripcio, aula_id, actiu, es_tutoria } = req.body;

    try {
        runExec(db, 'UPDATE assignatures SET nom = ?, descripcio = ?, aula_id = ?, actiu = ?, es_tutoria = ? WHERE id = ?',
            [nom, descripcio, aula_id, actiu ? 1 : 0, es_tutoria ? 1 : 0, req.params.id]);
        res.redirect('/assignatures');
    } catch (error) {
        const aules = runQuery(db, 'SELECT * FROM aules ORDER BY any_curs DESC, codi_aula');
        const assignatura = { id: req.params.id, nom, descripcio, aula_id, actiu: actiu ? 1 : 0, es_tutoria: es_tutoria ? 1 : 0 };
        res.render('assignatures/formulari', { title: 'Modificar Assignatura', assignatura, aules, error: error.message });
    }
});

// Eliminar assignatura
router.post('/:id/eliminar', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'DELETE FROM assignatures WHERE id = ?', [req.params.id]);
    res.redirect('/assignatures');
});

// Alumnes inscrits
router.get('/:id/alumnes', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, 'SELECT * FROM assignatures WHERE id = ?', [req.params.id]);
    const assignatura = assignatures[0];

    if (!assignatura) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    const alumnesInscrits = runQuery(db, `
        SELECT al.*, aa.data_inscripcio, aa.actiu
        FROM alumnes al
        JOIN alumne_assignatura aa ON al.id = aa.alumne_id
        WHERE aa.assignatura_id = ?
        ORDER BY al.cognoms, al.nom
    `, [req.params.id]);

    const totsAlumnes = runQuery(db, 'SELECT * FROM alumnes ORDER BY cognoms, nom');

    res.render('assignatures/alumnes', { title: 'Alumnes - ' + assignatura.nom, assignatura, alumnesInscrits, totsAlumnes });
});

// Inscriure alumne
router.post('/:id/alumnes/inscriure', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id } = req.body;

    try {
        runExec(db, 'INSERT OR IGNORE INTO alumne_assignatura (alumne_id, assignatura_id) VALUES (?, ?)',
            [alumne_id, req.params.id]);
    } catch (error) {
        // Ignorar error si ja està inscrit
    }

    res.redirect('/assignatures/' + req.params.id + '/alumnes');
});

// Donar de baixa alumne
router.post('/:id/alumnes/baixa/:alumne_id', async (req, res) => {
    const db = await getDatabase();
    runExec(db, 'UPDATE alumne_assignatura SET actiu = 0 WHERE alumne_id = ? AND assignatura_id = ?',
        [req.params.alumne_id, req.params.id]);
    res.redirect('/assignatures/' + req.params.id + '/alumnes');
});

// Vista de tutoria (El meu grup)
router.get('/:id/tutoria', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs, au.nom_aula
        FROM assignatures a
        JOIN aules au ON a.aula_id = au.id
        WHERE a.id = ?
    `, [req.params.id]);

    const assignatura = assignatures[0];

    if (!assignatura) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    if (!assignatura.es_tutoria) {
        return res.status(404).render('errors/404', { title: 'No és una assignatura de tutoria' });
    }

    const alumnes = runQuery(db, `
        SELECT al.*
        FROM alumnes al
        JOIN alumne_assignatura aa ON al.id = aa.alumne_id
        WHERE aa.assignatura_id = ? AND aa.actiu = 1
        ORDER BY al.cognoms, al.nom
    `, [req.params.id]);

    // Seguiments actius i incidències de comportament per alumne (agregats)
    const seguimentsPerAlumne = {};
    runQuery(db, `SELECT alumne_id, COUNT(*) as count FROM seguiments WHERE estat != 'tancat' GROUP BY alumne_id`)
        .forEach(r => { seguimentsPerAlumne[r.alumne_id] = r.count; });

    const incidenciesPerAlumne = {};
    runQuery(db, `SELECT alumne_id, COUNT(*) as count FROM comportament WHERE assignatura_id = ? GROUP BY alumne_id`, [req.params.id])
        .forEach(r => { incidenciesPerAlumne[r.alumne_id] = r.count; });

    const alumnesResum = alumnes.map(al => ({
        ...al,
        seguimentsActius: seguimentsPerAlumne[al.id] || 0,
        incidencies: incidenciesPerAlumne[al.id] || 0
    }));

    const totalSeguimentsActius = alumnesResum.reduce((sum, al) => sum + al.seguimentsActius, 0);
    const totalIncidencies = alumnesResum.reduce((sum, al) => sum + al.incidencies, 0);

    res.render('assignatures/tutoria', {
        title: 'Tutoria - ' + assignatura.nom,
        assignatura,
        alumnes: alumnesResum,
        totalSeguimentsActius,
        totalIncidencies
    });
});

// Vista d'avaluació (llibre imprimit)
router.get('/:id/avaluacio', async (req, res) => {
    const db = await getDatabase();
    const assignatures = runQuery(db, `
        SELECT a.*, au.codi_aula, au.any_curs
        FROM assignatures a
        JOIN aules au ON a.aula_id = au.id
        WHERE a.id = ?
    `, [req.params.id]);

    const assignatura = assignatures[0];

    if (!assignatura) {
        return res.status(404).render('errors/404', { title: 'No trobat' });
    }

    // Obtenir tipus de nota agrupats per trimestre
    const tipusNota = runQuery(db, `
        SELECT * FROM tipus_nota 
        WHERE assignatura_id = ? 
        ORDER BY 
            CASE WHEN trimestre IS NULL THEN 4 ELSE trimestre END,
            nom
    `, [req.params.id]);

    // Agrupar per trimestre
    const tipusNotaPerTrimestre = { 1: [], 2: [], 3: [], NULL: [] };
    tipusNota.forEach(tn => {
        const t = tn.trimestre || 'NULL';
        if (tipusNotaPerTrimestre[t]) {
            tipusNotaPerTrimestre[t].push(tn);
        }
    });

    // Obtenir alumnes inscrits
    const alumnes = runQuery(db, `
        SELECT al.*, aa.observacions as observacions_inscripcio
        FROM alumnes al
        JOIN alumne_assignatura aa ON al.id = aa.alumne_id
        WHERE aa.assignatura_id = ? AND aa.actiu = 1
        ORDER BY al.cognoms, al.nom
    `, [req.params.id]);

    // Obtenir notes
    const notes = runQuery(db, `
        SELECT n.*, al.id as alumne_id, tn.trimestre
        FROM notes n
        JOIN alumnes al ON n.alumne_id = al.id
        JOIN tipus_nota tn ON n.tipus_nota_id = tn.id
        WHERE tn.assignatura_id = ?
    `, [req.params.id]);

    // Organitzar notes per alumne i tipus_nota_id
    const notesPerAlumne = {};
    notes.forEach(n => {
        if (!notesPerAlumne[n.alumne_id]) {
            notesPerAlumne[n.alumne_id] = {};
        }
        notesPerAlumne[n.alumne_id][n.tipus_nota_id] = {
            id: n.id,
            nota: n.nota,
            observacions: n.observacions
        };
    });

    // Calcular mitjanes per trimestre i global
    const mitjanes = {};
    alumnes.forEach(alumne => {
        mitjanes[alumne.id] = { 1: null, 2: null, 3: null, global: null };
        
        for (let t = 1; t <= 3; t++) {
            const tipusTrimestre = tipusNotaPerTrimestre[t] || [];
            if (tipusTrimestre.length === 0) continue;
            
            let sumaNotes = 0;
            let sumaPes = 0;
            
            tipusTrimestre.forEach(tn => {
                const notaData = notesPerAlumne[alumne.id]?.[tn.id];
                if (notaData && notaData.nota !== undefined && notaData.nota !== null) {
                    sumaNotes += notaData.nota * tn.pes_trimestre;
                    sumaPes += tn.pes_trimestre;
                }
            });
            
            if (sumaPes > 0) {
                mitjanes[alumne.id][t] = (sumaNotes / sumaPes).toFixed(2);
            }
        }
        
        // Mitjana global (ponderada per pes_global)
        let sumaGlobal = 0;
        let pesGlobal = 0;
        
        for (let t = 1; t <= 3; t++) {
            if (mitjanes[alumne.id][t] !== null) {
                const mitjanaTrimestre = parseFloat(mitjanes[alumne.id][t]);
                // Buscar pes_global del primer tipus de nota del trimestre (o utilitzar 1)
                const tipusTrimestre = tipusNotaPerTrimestre[t] || [];
                const pes = tipusTrimestre[0]?.pes_global || 1;
                sumaGlobal += mitjanaTrimestre * pes;
                pesGlobal += pes;
            }
        }
        
        if (pesGlobal > 0) {
            mitjanes[alumne.id].global = (sumaGlobal / pesGlobal).toFixed(2);
        }
    });

    // Calcular mitjanes de classe per trimestre
    const mitjanesClasse = { 1: null, 2: null, 3: null, global: null };
    for (let t = 1; t <= 3; t++) {
        let suma = 0;
        let count = 0;
        alumnes.forEach(alumne => {
            if (mitjanes[alumne.id] && mitjanes[alumne.id][t] !== null) {
                suma += parseFloat(mitjanes[alumne.id][t]);
                count++;
            }
        });
        if (count > 0) {
            mitjanesClasse[t] = (suma / count).toFixed(2);
        }
    }
    
    // Mitjana global de classe
    let sumaGlobal = 0;
    let countGlobal = 0;
    alumnes.forEach(alumne => {
        if (mitjanes[alumne.id] && mitjanes[alumne.id].global !== null) {
            sumaGlobal += parseFloat(mitjanes[alumne.id].global);
            countGlobal++;
        }
    });
    if (countGlobal > 0) {
        mitjanesClasse.global = (sumaGlobal / countGlobal).toFixed(2);
    }

    // Resum de comportament per alumne (total de punts i nombre de registres)
    const comportamentRegistres = runQuery(db, `
        SELECT alumne_id, SUM(punts) as total_punts, COUNT(*) as num_registres
        FROM comportament
        WHERE assignatura_id = ?
        GROUP BY alumne_id
    `, [req.params.id]);

    const comportamentPerAlumne = {};
    comportamentRegistres.forEach(c => {
        comportamentPerAlumne[c.alumne_id] = { total_punts: c.total_punts, num_registres: c.num_registres };
    });

    res.render('assignatures/avaluacio', {
        title: 'Avaluació - ' + assignatura.nom,
        assignatura,
        alumnes,
        tipusNotaPerTrimestre,
        notesPerAlumne,
        mitjanes,
        mitjanesClasse,
        comportamentPerAlumne
    });
});

// API: Actualitzar observacions d'inscripció (AJAX)
router.post('/api/observacions', async (req, res) => {
    const db = await getDatabase();
    const { alumne_id, assignatura_id, observacions } = req.body;

    try {
        runExec(db, 'UPDATE alumne_assignatura SET observacions = ? WHERE alumne_id = ? AND assignatura_id = ?',
            [observacions, alumne_id, assignatura_id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
