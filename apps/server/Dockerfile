ARG NODE_VERSION=20.13.1

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
COPY package.json ./

#--

FROM base AS deps
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm@latest

#--

FROM deps AS prod-deps
RUN pnpm install --prod --ignore-scripts

#--

FROM deps AS build
COPY . .
RUN pnpm install --ignore-scripts
RUN pnpm add -D tsup@latest
RUN pnpm build

#--

FROM base
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/src/drizzle/migrations /app/dist/drizzle/migrations

EXPOSE 8000
CMD ["node", "--enable-source-maps", "dist/index.js"]