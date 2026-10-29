# Binderbound

**Binderbound** aide les collectionneurs du TCG **Riftbound** à ranger leurs cartes dans un classeur physique.

Choisis un set, un format de classeur (2x2, 3x3, 4x3 ou personnalisé) et tes options de rangement. Binderbound t'indique alors **exactement où va chaque carte** : feuillet, recto ou verso, ligne et colonne. Les variantes (alt-art, overnumbered, signature, promo, foil) sont prises en compte.

## Fonctionnalités

- Formats 2x2, 3x3, 4x3 ou personnalisé, en recto-verso ou en simple face
- Tri par numéro, domaine, rareté ou type, avec une nouvelle face par groupe en option
- Variantes placées après leur carte de base, regroupées à la fin, ou exclues
- Faces réservées en début de classeur et départ sur une face de droite
- Avertissement si le set dépasse le nombre de feuillets disponibles
- Vue classeur animée (pages qui se tournent en 3D, swipe sur mobile), vue liste triable et filtrable, recherche
- Collection : coche les cartes possédées ; les manquantes restent grisées mais gardent leur place
- Export CSV, version imprimable, lien de partage (tous les réglages sont dans l'URL)
- Interface en français et en anglais

## Installation

Prérequis : **Node.js 22 ou plus récent** (24 recommandé, voir `.nvmrc`).

```bash
npm install
npm run dev
```

- Client (Vite) : http://localhost:5173
- API (Express) : http://localhost:3001 (Vite redirige `/api` vers l'API)

### Avec Docker

| Usage                                | Commande                   | Adresse               |
| ------------------------------------ | -------------------------- | --------------------- |
| Développement (rechargement à chaud) | `npm run docker:dev`       | http://localhost:5173 |
| Production                           | `npm run docker:prod`      | http://localhost:8080 |
| Arrêter la production                | `npm run docker:prod:down` | —                     |

- **Dev** (`compose.yaml`) : un conteneur pour l'API et un pour Vite. Les dossiers `server/` et `client/` sont montés en volume. Ports modifiables : `CLIENT_PORT=5180 API_PORT=3011 npm run docker:dev`.
- **Prod** (`compose.prod.yaml`) : une seule image légère. Express y sert l'API et le client buildé. Le conteneur est en lecture seule, tourne sans root et dispose d'un healthcheck sur `/api/health`. Le dossier `server/data/sets` est monté : pour ajouter un set, dépose le fichier puis lance `docker compose -f compose.prod.yaml restart`. Port modifiable : `PORT=9000 npm run docker:prod`.

## Scripts

| Script                                      | Rôle                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`                               | Lance l'API et le client ensemble                                                  |
| `npm test`                                  | Tests Vitest (algorithme de placement et API)                                      |
| `npm run lint`                              | ESLint                                                                             |
| `npm run format`                            | Prettier                                                                           |
| `npm run build`                             | Build de production du client (`client/dist`)                                      |
| `npm start`                                 | Démarre l'API seule (définis `STATIC_DIR=client/dist` pour servir aussi le client) |
| `npm run import-set -- <fichier> [--write]` | Valide un set, et le copie dans `server/data/sets` avec `--write`                  |

## Ajouter un set

1. Prépare un fichier JSON au format décrit ci-dessous.
2. Valide-le :
   ```bash
   npm run import-set -- ./mon-set.json
   ```
   Les erreurs sont listées avec leur chemin (`cards.12.baseCardId`, etc.).
3. Copie-le dans `server/data/sets/<id>.json` :
   ```bash
   npm run import-set -- ./mon-set.json --write    # ajoute --force pour écraser
   ```
4. Le serveur de dev redémarre tout seul ; le set apparaît sur la page d'accueil.

> Le dépôt ne contient qu'un set **fictif** (`sample.json`) : aucune vraie carte n'y figure.

## Structure d'un set

```json
{
  "id": "origins",
  "code": "OGN",
  "name": { "fr": "Origines", "en": "Origins" },
  "releaseDate": "2025-10-31",
  "cards": [
    {
      "id": "OGN-001",
      "number": 1,
      "name": { "fr": "…", "en": "…" },
      "type": "unit",
      "domain": "fury",
      "rarity": "common",
      "variant": "base",
      "baseCardId": null,
      "imageUrl": null
    },
    {
      "id": "OGN-001a",
      "number": 1,
      "name": { "fr": "…", "en": "…" },
      "type": "unit",
      "domain": "fury",
      "rarity": "common",
      "variant": "alt-art",
      "baseCardId": "OGN-001",
      "imageUrl": null
    }
  ]
}
```

| Champ                                 | Règle                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `id` (set)                            | minuscules, chiffres et tirets ; c'est aussi le nom du fichier                                  |
| `releaseDate`                         | date ISO `AAAA-MM-JJ`                                                                           |
| `cards[].id`                          | unique dans le set                                                                              |
| `type`, `domain`, `rarity`, `variant` | valeurs définies dans `server/src/config/cardEnums.js`                                          |
| `baseCardId`                          | `null` pour une carte `base` ; sinon l'`id` de la carte de base (obligatoire pour une variante) |
| `imageUrl`                            | URL ou `null`                                                                                   |

Les listes de types, domaines, raretés et variantes sont centralisées dans [`server/src/config/cardEnums.js`](server/src/config/cardEnums.js). L'ordre des tableaux y définit aussi l'ordre de tri. Le client récupère ces listes via `GET /api/config`. Si tu ajoutes une valeur, ajoute aussi sa traduction dans `client/src/locales/fr.json` et `en.json`.

## API

| Route               | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `GET /api/sets`     | Liste des sets (métadonnées et compteurs, sans les cartes) |
| `GET /api/sets/:id` | Un set avec ses cartes                                     |
| `GET /api/config`   | Listes de référence (domaines, variantes, formats…)        |
| `POST /api/layout`  | Calcule le placement                                       |

Corps de `POST /api/layout` (seul `setId` est obligatoire, les autres champs ont une valeur par défaut) :

```json
{
  "setId": "sample",
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
│   ├── scripts/import-set.js # validation zod d'un set
│   ├── src/
│   │   ├── config/           # listes de référence (types, domaines…)
│   │   ├── layout/           # algorithme de placement (fonctions pures)
│   │   ├── schemas/          # schémas zod
│   │   ├── routes/ middleware/ services/
│   │   └── app.js, index.js
│   └── tests/                # Vitest
├── client/
│   └── src/
│       ├── components/       # UI, classeur, mise en page
│       ├── pages/            # 4 étapes : Set → Classeur → Options → Résultat
│       ├── hooks/            # paramètres d'URL, collection, API
│       ├── locales/          # fr.json, en.json
│       └── styles/           # tokens de la charte, impression
├── Dockerfile, compose.yaml, compose.prod.yaml
└── package.json              # workspaces npm + scripts
```

---

_Binderbound n'est pas affilié à Riot Games. Riftbound et League of Legends sont des marques de Riot Games, Inc._
