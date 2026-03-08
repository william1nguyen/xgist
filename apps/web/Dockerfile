# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/types/package.json packages/types/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

COPY packages/ packages/
COPY apps/web/ apps/web/
WORKDIR /app/apps/web
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN npm install -g sirv-cli

COPY --from=builder /app/apps/web/build/client /app/public

EXPOSE 3000
WORKDIR /app
CMD ["sirv", "public", "--port", "3000", "--host", "0.0.0.0", "--single"]
