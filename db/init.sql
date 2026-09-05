-- =============================================
-- LLIBRE DE NOTES D'ALUMNES
-- Esquema de la base de dades SQLite
-- =============================================

-- 1. ALUMNES
CREATE TABLE IF NOT EXISTS alumnes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    cognoms TEXT NOT NULL,
    data_naixement DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. AULES
CREATE TABLE IF NOT EXISTS aules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    any_curs TEXT NOT NULL,
    codi_aula TEXT NOT NULL,
    nom_aula TEXT,
    descripcio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(any_curs, codi_aula)
);

-- 3. ASSIGNATURES
CREATE TABLE IF NOT EXISTS assignatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    descripcio TEXT,
    aula_id INTEGER NOT NULL,
    actiu INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (aula_id) REFERENCES aules(id) ON DELETE CASCADE
);

-- 4. ALUMNE_ASSIGNATURA (inscripcions)
CREATE TABLE IF NOT EXISTS alumne_assignatura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumne_id INTEGER NOT NULL,
    assignatura_id INTEGER NOT NULL,
    data_inscripcio DATE DEFAULT CURRENT_DATE,
    actiu INTEGER DEFAULT 1,
    observacions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumne_id) REFERENCES alumnes(id) ON DELETE CASCADE,
    FOREIGN KEY (assignatura_id) REFERENCES assignatures(id) ON DELETE CASCADE,
    UNIQUE(alumne_id, assignatura_id)
);

-- 5. TIPUS_NOTA
CREATE TABLE IF NOT EXISTS tipus_nota (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignatura_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    descripcio TEXT,
    tipus TEXT DEFAULT 'Nota' CHECK(tipus IN ('Nota', 'Comportament')),
    pes_trimestre REAL NOT NULL DEFAULT 1.0,
    pes_global REAL NOT NULL DEFAULT 1.0,
    trimestre INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignatura_id) REFERENCES assignatures(id) ON DELETE CASCADE,
    CHECK(trimestre IS NULL OR trimestre IN (1, 2, 3))
);

-- 6. NOTES
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumne_id INTEGER NOT NULL,
    tipus_nota_id INTEGER NOT NULL,
    nota REAL NOT NULL CHECK(nota >= 0 AND nota <= 10),
    tipus TEXT DEFAULT 'Nota' CHECK(tipus IN ('Nota', 'Comportament')),
    data DATE DEFAULT CURRENT_DATE,
    observacions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumne_id) REFERENCES alumnes(id) ON DELETE CASCADE,
    FOREIGN KEY (tipus_nota_id) REFERENCES tipus_nota(id) ON DELETE CASCADE
);

-- 7. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nota_id INTEGER,
    alumne_id INTEGER,
    assignatura_id INTEGER,
    nom_fitxer TEXT NOT NULL,
    ruta_fitxer TEXT NOT NULL,
    tipus_mime TEXT NOT NULL,
    mida_bytes INTEGER,
    descripcio TEXT,
    data_pujada DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nota_id) REFERENCES notes(id) ON DELETE SET NULL,
    FOREIGN KEY (alumne_id) REFERENCES alumnes(id) ON DELETE SET NULL,
    FOREIGN KEY (assignatura_id) REFERENCES assignatures(id) ON DELETE SET NULL
);

-- 8. COMPORTAMENT
CREATE TABLE IF NOT EXISTS comportament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumne_id INTEGER NOT NULL,
    assignatura_id INTEGER NOT NULL,
    data DATE DEFAULT CURRENT_DATE,
    tipus TEXT NOT NULL CHECK(tipus IN ('positiu', 'negatiu', 'incidencia', 'expulsio')),
    descripcio TEXT NOT NULL,
    punts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumne_id) REFERENCES alumnes(id) ON DELETE CASCADE,
    FOREIGN KEY (assignatura_id) REFERENCES assignatures(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXOS
-- =============================================
CREATE INDEX IF NOT EXISTS idx_notes_alumne ON notes(alumne_id);
CREATE INDEX IF NOT EXISTS idx_notes_tipus ON notes(tipus_nota_id);
CREATE INDEX IF NOT EXISTS idx_tipus_nota_assignatura ON tipus_nota(assignatura_id);
CREATE INDEX IF NOT EXISTS idx_alumne_assignatura_alumne ON alumne_assignatura(alumne_id);
CREATE INDEX IF NOT EXISTS idx_alumne_assignatura_assignatura ON alumne_assignatura(assignatura_id);
CREATE INDEX IF NOT EXISTS idx_documents_nota ON documents(nota_id);
CREATE INDEX IF NOT EXISTS idx_documents_alumne ON documents(alumne_id);
