#!/usr/bin/env bash
# Met en ligne la dernière version de la branche `production`. Lancé par GitHub Actions via SSH,
# avec une clé limitée à ce seul script (voir README), ou à la main sur le VPS.
set -euo pipefail

compose() {
  docker compose --env-file .env.production -f compose.prod.yaml -f compose.vps.yaml "$@"
}

main() {
  cd "$(dirname "$0")/.."
  echo "→ Récupération de origin/production"
  git fetch --quiet origin production
  git reset --hard --quiet origin/production
  echo "→ Version $(git log -1 --format='%h %s')"

  # --wait : échoue (et fait échouer le job) si l'app ne devient pas saine.
  compose up -d --build --remove-orphans --wait --wait-timeout 180
  docker image prune -f >/dev/null
  echo "✓ Binderbound est en ligne"
}

# Tout le script est lu avant de s'exécuter : le `git reset` peut le modifier sans risque.
main "$@"
exit
