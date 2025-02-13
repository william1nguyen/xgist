## Introduction

This is a Typescript Node.js template. It can be used to bootstrap bots, workers, or web servers.

## Features

- `dotenv`
- Lint/format code with `eslint` and `prettier`
- Auto-lint on git stage with `lint-staged`
- Lint commit messages using [`Conventional Commit specification`](https://www.conventionalcommits.org/en/v1.0.0/)
- Log with `pino`
- Monitor with [`sentry`](https://sentry.io/)
- Deploy with `docker`

## How to run in `development`

1. Clone the repo
2. Rename `.env.example` to `.env` and change the settings
3. Run `npm ci` to install all dependencies
4. Run `npm run dev`
