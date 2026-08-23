# syntax=docker/dockerfile:1

# @fms/api — çok mimarili imaj (linux/amd64 + linux/arm64).
# Üretim Oracle Ampere A1 (ARM64) üzerinde çalışır; CI her iki mimaride de
# kendi native runner'ında derler, QEMU kullanılmaz (K14).

FROM node:24-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable

# Önce yalnızca bağımlılık tanımları — katman önbelleği kaynak değişince bozulmasın.
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
COPY apps/api ./apps/api
RUN pnpm --filter @fms/shared build
RUN pnpm --filter @fms/api build

# Yalnızca üretim bağımlılıklarıyla kendi kendine yeten bir ağaç üret.
# --legacy: pnpm 10+ varsayılan olarak yalnızca inject-workspace-packages=true
# olan workspace'lerden deploy ediyor. Injection'ı .npmrc'ye açmak geliştirme
# döngüsünü bozardı (workspace paketleri sembolik bağ yerine KOPYALANIR, shared'da
# yapılan değişiklik yeniden kurulum istemeden görünmez). Bu yüzden davranış
# yalnızca imaj derlemesinde --legacy ile isteniyor.
RUN pnpm deploy --legacy --filter=@fms/api --prod /prod/api

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
COPY --from=builder --chown=node:node /prod/api ./
ENV NODE_ENV=production
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
