# Llibre de Notes d'Alumnes

Aplicació web per a la gestió de notes d'alumnes per a professors.

## Característiques

- **Gestió d'Aules**: Any de curs, codi d'aula
- **Gestió d'Alumnes**: CRUD complet amb inscripcions
- **Gestió d'Assignatures**: Vinculades a aules
- **Tipus de Nota**: Configuració per assignatura amb pesos
- **Gestió de Notes**: Inserció i càlcul automàtic de mitjanes
- **Documents**: Pujada d'arxius (PDF, imatges) vinculats a notes
- **Llibre de Notes**: Vista consolidada amb filtres
- **Estadístiques**: Mitjanes, notes altes/baixes, aprovats/suspesos
- **Exportació CSV**: Descàrrega de notes en format CSV

## Tecnologies

- **Backend**: Node.js + Express.js
- **Base de dades**: SQLite (via better-sqlite3)
- **Frontend**: HTML + Bootstrap 5
- **Plantilles**: EJS
- **Upload**: Multer

## Instal·lació

```bash
# Clonar el repositori
git clone <url-del-repositori>
cd llibre-notes

# Instal·lar dependències
npm install

# Inicialitzar la base de dades
npm run init-db

# Iniciar el servidor
npm start
```

L'aplicació estarà disponible a: `http://localhost:3000`

## Estructura del Projecte

```
llibre-notes/
├── server.js           # Punt d'entrada
├── db/
│   ├── database.js     # Connexió SQLite
│   ├── init.sql        # Esquema de la BD
│   └── init.js         # Script d'inicialització
├── routes/             # Rutes de l'API
├── views/              # Plantilles EJS
├── public/             # Estàtics (CSS, JS, imatges)
├── uploads/            # Documents pujats
└── middleware/          # Middleware (upload)
```

## Funcionament

1. **Crear Aules**: Definiu els anys de curs i codis d'aula
2. **Crear Assignatures**: Vinculeu-les a les aules
3. **Configurar Tipus de Nota**: Definiu els tipus (Examen, Treball, etc.) i els seus pesos
4. **Inscriure Alumnes**: Vinculeu alumnes a les assignatures
5. **Introduir Notes**: Afegiu les notes als alumnes
6. **Consultar el Llibre**: Veieu totes les notes consolidades
7. **Veure Estadístiques**: Analitzeu el rendiment

## Llicència

MIT
