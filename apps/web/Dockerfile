# syntax=docker/dockerfile:1

# @fms/web — çok mimarili statik imaj (linux/amd64 + linux/arm64).
# Alt yol DERLEME ZAMANINDA JS paketine gömülür; Caddy tarafı aynı değeri
# çalışma zamanında ortamdan okur. İkisi ayrışırsa varlıklar 404 verir.

FROM node:24-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc .nvmrc tsconfig.base.json ./
COPY scripts ./scripts
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/engine/package.json ./packages/engine/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY tools/data-cli/package.json ./tools/data-cli/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/web ./apps/web

# Alt yol tek kaynak: derleme argümanı olarak verilir, vite.config.ts okur.
ARG PUBLIC_BASE_PATH=/fms
ENV PUBLIC_BASE_PATH=$PUBLIC_BASE_PATH
RUN pnpm --filter @fms/shared build
RUN pnpm --filter @fms/web build

FROM caddy:2-alpine AS runtime
ARG PUBLIC_BASE_PATH=/fms
ENV PUBLIC_BASE_PATH=$PUBLIC_BASE_PATH
COPY --from=builder /app/apps/web/dist /srv/app
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 3000
