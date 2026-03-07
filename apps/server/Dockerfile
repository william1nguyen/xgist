FROM node:22-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/types/package.json packages/types/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/ packages/
COPY apps/server/ apps/server/
RUN pnpm --filter server build

FROM node:22-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/types/package.json packages/types/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --prod

COPY packages/ packages/
COPY --from=build /app/apps/server/dist apps/server/dist

EXPOSE 8000
CMD ["node", "--enable-source-maps", "apps/server/dist/index.mjs"]
