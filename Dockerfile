# ── Stage 1: Build ──────────────────────────────────────────
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .

# Build-time config (Vite inlines VITE_* into the bundle); CI passes them via --build-arg.
# VITE_ROUTER_BASE is build-time only: it sets both the asset base (/insights/assets/...) and the
# SPA router base, so it cannot be changed at container start. The others can also be overridden
# at runtime through env-config.js (docker/entrypoint.sh).
ARG VITE_API_BASE_URL=""
ARG VITE_AUTH_ENABLED="false"
ARG VITE_KEYCLOAK_URL=""
ARG VITE_KEYCLOAK_REALM="cce"
ARG VITE_KEYCLOAK_CLIENT_ID="cce-insights-ui"
# The image is served under /insights by the ingress, so the SPA router base path is /insights.
ARG VITE_ROUTER_BASE="/insights"
ARG VITE_TIMEZONE="UTC"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID \
    VITE_ROUTER_BASE=$VITE_ROUTER_BASE \
    VITE_TIMEZONE=$VITE_TIMEZONE

RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────
FROM caddy:2-alpine

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Entrypoint: generates /srv/env-config.js from runtime Docker env vars before
# starting Caddy, so the React app picks up Keycloak config without a rebuild.
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy built assets from Stage 1
COPY --from=build /app/dist /srv

EXPOSE 3001

CMD ["/entrypoint.sh"]
