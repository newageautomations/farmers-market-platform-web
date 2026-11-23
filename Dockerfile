FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS source
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY scripts/ ./scripts/

FROM source AS build
RUN npm ci --no-audit

# Declare public build settings only. Railway resolves private destinations at runtime.
ARG MARKET_WEB_APP
ARG DEPLOYMENT_ENV
ARG ADMIN_ORIGIN
ARG PLATFORM_ACCOUNT_ORIGIN
ARG SHOP_API_URL
ARG PUBLIC_ADMIN_API_URL
ARG ASSET_URL_PREFIX
ARG CUSTOMER_STOREFRONT_ORIGIN
# Dependencies are already installed. Keep application compilation offline.
RUN --network=none case "$MARKET_WEB_APP" in admin|storefront) ;; *) exit 1 ;; esac \
    && APP_ENV=production NODE_ENV=production FRONTEND_FIXTURE_MODE=false ASTRO_TELEMETRY_DISABLED=1 \
        npm run build --workspace "@market/$MARKET_WEB_APP" \
    && mkdir -p "/release/apps/$MARKET_WEB_APP" \
    && cp -a "apps/$MARKET_WEB_APP/dist" "/release/apps/$MARKET_WEB_APP/"

FROM source AS runtime-dependencies
RUN set -e; npm ci --omit=dev --no-audit; \
    mkdir -p /runtime-apps; \
    for app in apps/*; do \
        mkdir -p "/runtime-apps/${app##*/}"; \
        cp "$app/package.json" "/runtime-apps/${app##*/}/"; \
        if [ -d "$app/node_modules" ]; then \
            cp -a "$app/node_modules" "/runtime-apps/${app##*/}/"; \
        fi; \
    done

FROM node:24.22.3-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS release
WORKDIR /app
COPY package.json tsconfig.json ./
COPY --from=runtime-dependencies /app/node_modules ./node_modules
COPY --from=runtime-dependencies /app/packages ./packages
COPY --from=runtime-dependencies /runtime-apps ./apps
COPY scripts/frontend-build-manifest.ts scripts/frontend-production-http.ts scripts/serve-admin.ts scripts/start-storefront.ts ./scripts/
COPY --from=build /release/apps ./apps
ENV NODE_ENV=production
USER node
# Set the corresponding direct Node start command for each Railway service.
CMD ["node", "--import", "tsx", "scripts/start-storefront.ts"]
