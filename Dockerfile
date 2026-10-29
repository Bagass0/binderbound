# syntax=docker/dockerfile:1

# ---- Base commune ----------------------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/

# ---- Développement : toutes les dépendances, le code est monté en volume ----
FROM base AS dev
RUN --mount=type=cache,target=/root/.npm npm ci
EXPOSE 3001 5173

# ---- Build du client --------------------------------------------------------
# Seul le client est copié : modifier le serveur n'invalide pas ce build.
FROM dev AS build
COPY client client
RUN npm run build

# ---- Dépendances de production du serveur uniquement ------------------------
FROM base AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=server --include-workspace-root=false

# ---- Image de production : Express sert l'API et le client ------------------
FROM node:24-alpine AS prod
ENV NODE_ENV=production \
    PORT=3001 \
    STATIC_DIR=/app/client/dist
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY server/package.json server/
COPY server/src server/src
COPY server/data server/data
COPY server/scripts server/scripts
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=2s \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "server/src/index.js"]
