# Binderbound

**Binderbound** aide les collectionneurs du TCG **Riftbound** à ranger leurs cartes dans un classeur physique.

Choisis un set, un format de classeur (2x2, 3x3, 4x3 ou personnalisé) et tes options de rangement. Binderbound t'indique alors **exactement où va chaque carte** : feuillet, recto ou verso, ligne et colonne. Les variantes (alt-art, overnumbered, signature) sont prises en compte, et chaque carte s'affiche avec son illustration officielle.

## Fonctionnalités

- Tous les sets Riftbound (Origins, Proving Grounds, Spiritforged, Unleashed, Vendetta, promos), synchronisés en une commande
- Illustrations officielles des cartes dans le classeur, la liste et un aperçu en grand (avec l'emplacement de la carte)
- Formats 2x2, 3x3, 4x3 ou personnalisé, en recto-verso ou en simple face
- Tri par numéro, domaine, rareté ou type, avec une nouvelle face par groupe en option
- Variantes placées après leur carte de base, regroupées à la fin, ou exclues
- Faces réservées en début de classeur et départ sur une face de droite
- Nombre de feuillets nécessaires affiché en direct pendant le réglage du classeur
- Vue classeur animée (pages qui se tournent en 3D, swipe sur mobile), vue liste triable et filtrable, recherche
- Collection : coche les cartes possédées ; les manquantes restent grisées mais gardent leur place
- Export CSV, version imprimable, lien de partage (tous les réglages sont dans l'URL)
- Interface en français et en anglais
- Ambiance sonore (bouton du header) : musique originale générée en direct, ou ton propre fichier `client/public/audio/ambiance.mp3`
- **Comptes** (e-mail + mot de passe, ou **Google** en un clic) : classeurs sauvegardés, collection synchronisée entre appareils, avancement de chaque classeur. Sans compte, tout le reste fonctionne.

## Installation

Prérequis : **Node.js 22 ou plus récent** (24 recommandé, voir `.nvmrc`) et **Docker** pour MySQL.

```bash
npm install
cp .env.example .env   # configuration locale (jamais commitée)
npm run db:up          # MySQL 8.4 dans Docker, sur localhost:3316
npm run dev
```

- Client (Vite) : http://localhost:5173
- API (Express) : http://localhost:3001 (Vite redirige `/api` vers l'API)

Les tables sont créées automatiquement au démarrage de l'API (migrations). Sans `DATABASE_URL`, l'API démarre en **mode invité** : les comptes sont désactivés, la collection reste dans le navigateur.

### Connexion Google (optionnelle)

1. Sur la [console Google Cloud](https://console.cloud.google.com/apis/credentials), crée un **ID client OAuth** de type « Application Web ».
2. Dans **Origines JavaScript autorisées**, ajoute `http://localhost:5173` (et l'adresse de prod). Aucune URI de redirection n'est nécessaire.
3. Copie l'ID client dans `.env` : `GOOGLE_CLIENT_ID=….apps.googleusercontent.com`, puis relance l'API.

Le bouton « Continuer avec Google » apparaît alors sur la page de connexion. Sans ID client, seule la connexion par e-mail est proposée.

### Avec Docker

| Usage                                | Commande                   | Adresse               |
| ------------------------------------ | -------------------------- | --------------------- |
| Développement (rechargement à chaud) | `npm run docker:dev`       | http://localhost:5173 |
| Production                           | `npm run docker:prod`      | http://localhost:8080 |
| Arrêter la production                | `npm run docker:prod:down` | —                     |

- **Dev** (`compose.yaml`) : MySQL, l'API et Vite. Les dossiers `server/` et `client/` sont montés en volume ; les données MySQL sont dans le volume `db-data`. Ports modifiables : `CLIENT_PORT=5180 API_PORT=3011 DB_PORT=3317 npm run docker:dev`.
- **Prod** (`compose.prod.yaml`) : MySQL (non exposé) et une image légère où Express sert l'API et le client buildé. Le conteneur de l'app est en lecture seule, tourne sans root et dispose d'un healthcheck sur `/api/health` ; il attend que MySQL soit prêt. Le dossier `server/data/sets` est monté : pour ajouter un set, dépose le fichier puis lance `docker compose --env-file .env.production -f compose.prod.yaml restart app`.

### Configuration de production

La prod lit **`.env.production`** (jamais commité), distinct du `.env` de dev :

```bash
cp .env.production.example .env.production
openssl rand -hex 32   # à lancer deux fois : MYSQL_PASSWORD et MYSQL_ROOT_PASSWORD
```

| Variable                                | Rôle                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Obligatoires (le lancement échoue sinon). Hexadécimal : ils apparaissent dans une URL |
| `GOOGLE_CLIENT_ID`                      | Client OAuth dédié à la prod, avec l'URL publique `https://…` comme origine autorisée |
| `PORT`                                  | Port de l'hôte (8080 par défaut)                                                      |
| `COOKIE_SECURE`                         | `true` en HTTPS (défaut). `false` uniquement pour tester sur `http://localhost`       |
| `TRUST_PROXY`                           | Nombre de reverse proxies devant l'app (`1` derrière Nginx, Traefik ou Caddy)         |

Côté Google : publie l'application (Google Auth Platform → Audience → « Publier l'application »), sinon seuls les utilisateurs test peuvent se connecter.

## Scripts

| Script                                       | Rôle                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`                                | Lance l'API et le client ensemble                                                  |
| `npm test`                                   | Tests Vitest (algorithme de placement et API)                                      |
| `npm run test:db`                            | Tests d'intégration des comptes contre MySQL (`npm run db:up` d'abord)             |
| `npm run db:up` / `npm run db:down`          | Démarre / arrête MySQL dans Docker                                                 |
| `npm run lint`                               | ESLint                                                                             |
| `npm run format`                             | Prettier                                                                           |
| `npm run build`                              | Build de production du client (`client/dist`)                                      |
| `npm start`                                  | Démarre l'API seule (définis `STATIC_DIR=client/dist` pour servir aussi le client) |
| `npm run sync-sets [-- OGN SFD] [--dry-run]` | Télécharge les sets Riftbound (tous, ou ceux listés) dans `server/data/sets`       |
| `npm run import-set -- <fichier> [--write]`  | Valide un set, et le copie dans `server/data/sets` avec `--write`                  |

## Données des cartes

Les sets sont téléchargés depuis [Riftcodex](https://riftcodex.com), une API communautaire gratuite et sans clé :

```bash
npm run sync-sets               # tous les sets
npm run sync-sets -- VEN        # un seul set (par son code)
npm run sync-sets -- --dry-run  # vérifie sans rien écrire
```

Le script convertit les données au format Binderbound et les valide. Il relie les variantes à leur carte de base : par numéro pour les alt-arts, par nom pour les overnumbered et les signatures. Il nettoie aussi les doublons de la source. Une variante sans carte de base dans son set (par exemple l'overnumbered d'une carte d'un autre set) reste autonome et se range à sa place comme une carte normale. Relance-le à chaque nouveau set : les fichiers de `server/data/sets` sont remplacés.

Les **illustrations ne sont pas stockées** : chaque carte garde l'URL de son image sur le CDN de Riot, chargée à la demande par le navigateur. Le CDN redimensionne à la volée : le client demande une version WebP adaptée à la taille de la case (`srcset`), nette et environ 30 fois plus légère que le PNG d'origine. Si une image ne charge pas, la case affiche un cadre de carte stylisé.

Les noms des cartes n'existent qu'en anglais dans la source. L'interface en français affiche donc les noms anglais officiels.

### Mentions légales

Binderbound affiche des illustrations appartenant à Riot Games. Le footer contient la mention exigée par la politique [« Legal Jibber Jabber »](https://www.riotgames.com/en/legal) de Riot. Riftcodex est une source **non officielle**. Pour mettre l'app en ligne publiquement, la [politique développeur Riftbound](https://developer.riotgames.com/policies/riftbound) demande d'enregistrer le produit et de n'utiliser que des assets fournis par l'[API officielle Riot](https://developer.riotgames.com/docs/riftbound), sur clé. Le script est prévu pour changer de source : il suffit d'écrire un module qui expose le même `fetchSets()` que [`server/src/import/riftcodex.js`](server/src/import/riftcodex.js).

### Ajouter un set à la main

1. Prépare un fichier JSON au format décrit ci-dessous.
2. Valide-le avec `npm run import-set -- ./mon-set.json` : les erreurs sont listées avec leur chemin (`cards.12.baseCardId`, etc.).
3. Copie-le dans `server/data/sets/<id>.json` avec `npm run import-set -- ./mon-set.json --write` (ajoute `--force` pour écraser).
4. Le serveur de dev redémarre tout seul ; le set apparaît sur la page d'accueil.

## Structure d'un set

```json
{
  "id": "ogn",
  "code": "OGN",
  "name": { "fr": "Origins", "en": "Origins" },
  "releaseDate": "2025-10-31",
  "kind": "main",
  "source": { "name": "Riftcodex", "url": "https://riftcodex.com" },
  "cards": [
    {
      "id": "OGN-027-298",
      "number": 27,
      "name": { "fr": "Darius - Trifarian", "en": "Darius - Trifarian" },
      "type": "unit",
      "supertype": "Champion",
      "domains": ["fury"],
      "rarity": "rare",
      "variant": "base",
      "baseCardId": null,
      "imageUrl": "https://cmsassets.rgpub.io/…/darius.png",
      "orientation": "portrait",
      "artist": "…"
    },
    {
      "id": "OGN-027A-298",
      "number": 27,
      "name": {
        "fr": "Darius - Trifarian (Alternate Art)",
        "en": "Darius - Trifarian (Alternate Art)"
      },
      "type": "unit",
      "supertype": "Champion",
      "domains": ["fury"],
      "rarity": "rare",
      "variant": "alt-art",
      "baseCardId": "OGN-027-298",
      "imageUrl": "https://cmsassets.rgpub.io/…/darius-alt.png",
      "orientation": "portrait",
      "artist": "…"
    }
  ]
}
```

| Champ                       | Règle                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `id` (set)                  | minuscules, chiffres et tirets ; c'est aussi le nom du fichier                                                 |
| `releaseDate`               | date ISO `AAAA-MM-JJ`                                                                                          |
| `kind`                      | `main` (extension) ou `promo` (affiché à part sur l'accueil) ; `main` par défaut                               |
| `cards[].id`                | unique dans le set                                                                                             |
| `type`, `rarity`, `variant` | valeurs définies dans `server/src/config/cardEnums.js`                                                         |
| `domains`                   | un ou deux domaines ; avec le tri par domaine, les cartes à deux domaines forment un groupe « Multi » à la fin |
| `supertype`, `artist`       | texte libre ou `null`                                                                                          |
| `baseCardId`                | `null` pour une carte `base` ; sinon l'`id` de la carte de base, ou `null` si elle n'est pas dans le set       |
| `imageUrl`                  | URL de l'illustration ou `null`                                                                                |
| `orientation`               | `portrait` (défaut) ou `landscape` (battlefields, affichés de travers dans la pochette)                        |

Les listes de types, domaines, raretés et variantes sont centralisées dans [`server/src/config/cardEnums.js`](server/src/config/cardEnums.js). L'ordre des tableaux y définit aussi l'ordre de tri. Le client récupère ces listes via `GET /api/config`. Si tu ajoutes une valeur, ajoute aussi sa traduction dans `client/src/locales/fr.json` et `en.json`.

## API

| Route               | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `GET /api/sets`     | Liste des sets (métadonnées et compteurs, sans les cartes) |
| `GET /api/sets/:id` | Un set avec ses cartes                                     |
| `GET /api/config`   | Listes de référence, et comptes disponibles ou non         |
| `POST /api/layout`  | Calcule le placement                                       |

Routes des comptes (actives avec une base de données) :

| Route                                                 | Description                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `POST /api/auth/register`                             | Crée un compte `{ email, name, password }` et ouvre la session   |
| `POST /api/auth/login`                                | Connexion `{ email, password }`                                  |
| `POST /api/auth/google`                               | Connexion Google `{ credential }` (jeton d'identité Google)      |
| `POST /api/auth/logout`                               | Ferme la session                                                 |
| `GET /api/auth/me`                                    | Utilisateur connecté, ou `null`                                  |
| `GET /api/binders`                                    | Mes classeurs, avec leur avancement (cartes possédées / total)   |
| `POST /api/binders`                                   | Sauvegarde un classeur `{ name, params }`                        |
| `GET` / `PATCH` / `DELETE /api/binders/:id`           | Lit, renomme ou modifie les réglages, supprime                   |
| `GET` / `PUT /api/collection/:setId`                  | Cartes possédées d'un set (lecture / remplacement)               |
| `PUT` / `DELETE /api/collection/:setId/cards/:cardId` | Coche / décoche une carte                                        |
| `POST /api/collection/import`                         | Fusionne la collection gardée dans le navigateur avant connexion |

### Comptes et sécurité

- **Session** : un jeton aléatoire dans un cookie `httpOnly` et `SameSite=Lax` (inaccessible au JavaScript, non envoyé par un autre site). La base ne stocke que son empreinte SHA-256. Durée : 30 jours.
- **Mots de passe** : hachés avec scrypt (paramètres OWASP), jamais renvoyés au client. Un e-mail inconnu et un mauvais mot de passe donnent la même réponse, dans le même temps.
- **Google** : le serveur vérifie la signature, l'expiration et l'audience du jeton. Un compte Google est rattaché à un compte e-mail existant seulement si Google certifie l'adresse.
- **Anti-abus** : 30 tentatives de connexion par IP et par quart d'heure ; les requêtes qui modifient des données doivent venir de la même origine.
- **Isolation** : chaque requête sur un classeur ou une collection est filtrée par l'utilisateur connecté ; les identifiants de sets et de cartes sont vérifiés.
- **Collection** : une carte possédée l'est pour tous les classeurs du même set. À la connexion, les cartes cochées en invité sont fusionnées dans le compte.

Schéma MySQL : [`server/src/db/migrations`](server/src/db/migrations). Pour faire évoluer la base, ajoute un fichier `002_….sql` : il sera appliqué au prochain démarrage.

Corps de `POST /api/layout` (seul `setId` est obligatoire, les autres champs ont une valeur par défaut) :

```json
{
  "setId": "ogn",
  "rows": 3,
  "cols": 3,
  "doubleSided": true,
  "sortBy": "number",
  "variantMode": "after-base",
  "includedVariants": ["alt-art", "overnumbered", "signature", "promo", "foil"],
  "breakBy": null,
  "reservedFaces": 0,
  "startOnRight": false,
  "maxPages": null
}
```

- `includedVariants` : les types de variantes à ranger. Par défaut, toutes ; `[]` n'en range aucune.
- `breakBy` : `domain`, `rarity`, `type` ou `null`. Chaque groupe commence alors en haut d'une face.
- `startOnRight` : ajoute une face de décalage si la première carte tomberait sur une page de gauche (un verso).
- `maxPages` : nombre maximal de **feuillets** du classeur.

Une entrée invalide renvoie une erreur 400 avec le détail des champs en cause :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "…",
    "details": [{ "path": "rows", "message": "…" }]
  }
}
```

## Structure du projet

```
binderbound/
├── server/
│   ├── data/sets/            # un fichier JSON par set
│   ├── scripts/              # sync-sets.js (Riftcodex), import-set.js (validation)
│   ├── src/
│   │   ├── config/           # listes de référence (types, domaines…)
│   │   ├── auth/             # mots de passe (scrypt), vérification Google
│   │   ├── db/               # pool MySQL, migrations SQL
│   │   ├── import/           # sources de données (riftcodex.js)
│   │   ├── layout/           # algorithme de placement (fonctions pures)
│   │   ├── schemas/          # schémas zod
│   │   ├── routes/ middleware/ services/   # dont comptes, classeurs, collection
│   │   └── app.js, index.js
│   └── tests/                # Vitest
├── client/
│   └── src/
│       ├── components/       # UI, classeur, mise en page
│       ├── auth/             # contexte du compte connecté
│       ├── pages/            # 4 étapes + connexion + Mes classeurs
│       ├── hooks/            # paramètres d'URL, collection, API
│       ├── locales/          # fr.json, en.json
│       └── styles/           # tokens de la charte, impression
├── docker/mysql/             # init de la base de test (dev)
├── Dockerfile, compose.yaml, compose.prod.yaml, .env.example
└── package.json              # workspaces npm + scripts
```

---

_Binderbound n'est pas affilié à Riot Games. Riftbound et League of Legends sont des marques de Riot Games, Inc._
