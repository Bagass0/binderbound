# Cartes ajoutées à la main

Cartes absentes de Riftcodex (ex. une rune alternative pas encore référencée), fusionnées dans
le set à chaque `npm run sync-sets`. Un fichier par set : `<id du set>.json`, au format
Binderbound :

```json
{
  "cards": [
    {
      "id": "VEN-R02A",
      "number": 2,
      "name": { "fr": "Calm Rune (Alternate Art)", "en": "Calm Rune (Alternate Art)" },
      "type": "rune",
      "supertype": "Basic",
      "domains": ["calm"],
      "rarity": "showcase",
      "variant": "alt-art",
      "baseCardId": "VEN-R02",
      "imageUrl": "/cards/ven-r02a.webp",
      "orientation": "portrait",
      "artist": null
    }
  ]
}
```

- Dès que la source fournit une carte au même identifiant, c'est la sienne qui est gardée.
- `imageUrl` : URL du CDN de Riot, image du site (`client/public/cards/…`) ou `null`.
