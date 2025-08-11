<h1 align="center">xgist</h1>
<p align="center">
    <img src="public/xgist-logo.png" alt="Logo" height="128" width="128"/>
</p>
<p align="center">
    AI-Driven Content Sharing Platform for Social Video and Voice Summarization
</p>

<div align="center">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
  [![Fastify](https://img.shields.io/badge/Fastify-Latest-000000?logo=fastify&logoColor=white)](https://www.fastify.io/)
  [![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
  [![Sentry](https://img.shields.io/badge/Sentry-Error%20Tracking-362D59?logo=sentry&logoColor=white)](https://sentry.io/)
  
</div>

<a name="table-of-contents"></a>

## Table of contents

- [Table of contents](#table-of-contents)
- [Introduction](#introduction)
- [Features](#features)
- [Description](#description)
- [Installation](#installation)
  - [Requirements](#requirements)
  - [Clone the project](#clone-the-project)
  - [Install dependencies](#install-dependencies)
  - [Environment setup](#environment-setup)
  - [External services setup](#external-services-setup)
- [Usage](#usage)
  - [Running in development mode](#running-in-development-mode)
  - [Running tests](#running-tests)
  - [Building for production](#building-for-production)
- [Architecture](#architecture)
  - [Technology Stack](#technology-stack)
  - [Key Features](#key-features)
  - [Project Structure](#project-structure)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Monitoring Setup](#monitoring-setup)
- [Development](#development)
  - [Code Quality](#code-quality)
  - [Testing](#testing)
  - [Debugging](#debugging)
- [TODO](#todo)
- [License](#license)

<a name="introduction"></a>

## Introduction

**xgist** is a production-ready AI-driven content sharing platform template built with modern TypeScript and Node.js. It can be used to bootstrap AI-powered applications, content processing services, or intelligent summarization systems for social media content.

<a name="features"></a>

## Features

- **Modern TypeScript**: Full TypeScript support with strict type checking
- **Environment Management**: Configuration with `dotenv` and validation
- **Code Quality**: Lint/format code with `eslint` and `prettier`
- **Git Hooks**: Auto-lint on git stage with `lint-staged`
- **Conventional Commits**: Lint commit messages using [Conventional Commit specification](https://www.conventionalcommits.org/en/v1.0.0/)
- **Structured Logging**: Professional logging with `pino`
- **Error Monitoring**: Real-time monitoring with [Sentry](https://sentry.io/)
- **Metrics Collection**: Prometheus integration for comprehensive monitoring
- **Circuit Breaker**: Resilient API calls with automatic retry and failure handling
- **Containerization**: Deploy with Docker and Docker Compose
- **Database Integration**: PostgreSQL with migration support
- **Real-time Communication**: WebSocket support with Socket.io
- **Authentication**: Keycloak integration for enterprise security
- **AI Integration**: Google Gemini API for intelligent content processing
- **Comprehensive Testing**: Unit tests with high coverage
- **Monorepo Architecture**: Scalable project structure with multiple services

<a name="description"></a>

## Description

**xgist** is an innovative AI-driven platform designed to intelligently summarize and share social video and voice content, making information consumption more efficient and accessible. The platform transforms lengthy content into concise, valuable summaries while preserving the core message, built with enterprise-grade reliability and monitoring capabilities.

<img width="1289" alt="Screenshot 2025-05-26 at 01 24 04" src="https://github.com/user-attachments/assets/1589658d-29bc-4dc2-bc8e-0d65bc331419" />

<a name="installation"></a>

## Installation

<a name="requirements"></a>

### Requirements

- Node.js (v18+)
- PostgreSQL (v14+)  
- Docker and Docker Compose (for containerized deployment)
- pnpm (recommended package manager)
- Keycloak for authentication
- Google Cloud account for Gemini API access

Optional for monitoring and error tracking:
- Sentry account for error tracking
- Prometheus for metrics collection

<a name="clone-the-project"></a>

### Clone the project

```bash
git clone https://github.com/william1nguyen/xgist.git
cd xgist
```

<a name="install-dependencies"></a>

### Install dependencies

```bash
pnpm install
```

<a name="environment-setup"></a>

### Environment setup

Set up environment variables for each application:

```bash
# Navigate to each app directory and copy environment template
cd apps/server
cp .env.example .env

cd ../web  
cp .env.example .env

cd ../ai
cp .env.example .env
```

<a name="external-services-setup"></a>

### External services setup

#### Keycloak Setup

Follow these steps to set up Keycloak using the [keycloak-custom-setup](https://github.com/william1nguyen/keycloak-custom-setup) repository. For detailed customization options, refer to the [Keycloak documentation](https://www.keycloak.org/documentation.html).

#### Gemini API Setup

1. Create a Google Cloud account at [console.cloud.google.com](https://console.cloud.google.com)
2. Go to [Google AI Studio](https://makersuite.google.com/)
3. Generate a new API key
4. Add to your environment variables:

```bash
# In your apps/server/.env file
GEMINI_URL=https://generativelanguage.googleapis.com
GOOGLE_API_KEY=your_api_key_here
```

#### Sentry Integration (Optional)

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project and get your DSN
3. Add to environment variables:

```bash
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=development
```

<a name="usage"></a>

## Usage

<a name="running-in-development-mode"></a>

### Running in development mode

**Quick Start:**
1. Clone the repo
2. Rename `.env.example` to `.env` in each app directory and change the settings
3. Run `pnpm ci` to install all dependencies  
4. Run `pnpm run dev`

**Detailed Setup:**

Start the development environment with all services:

```bash
# Start all services
pnpm run dev

# Start specific service
pnpm run dev:web      # Frontend only
pnpm run dev:server   # Backend only
pnpm run dev:ai       # AI service only
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- AI Service: `http://localhost:8000`

<a name="running-tests"></a>

### Running tests

Execute the comprehensive test suite:

```bash
# Run all tests for server
pnpm run test:server

# Run all tests for ai
pnpm run test:ai
```

<a name="building-for-production"></a>

### Building for production

```bash
# Build all applications
pnpm run build

# Build specific application
pnpm run build:web
pnpm run build:server
pnpm run build:ai
```

<a name="architecture"></a>

## Architecture

<a name="technology-stack"></a>

### Technology Stack

**Project Structure:**
- Monorepo Architecture with pnpm workspaces

**Frontend:**
- React with modern hooks
- Tailwind CSS for styling
- i18n for internationalization
- Nginx for production serving

**Backend:**
- Fastify (Node.js API server)
- FastAPI (Python AI service)
- PostgreSQL database
- Socket.io for real-time communication
- BullMQ for job queues
- MinIO for object storage

**Authentication & Security:**
- Keycloak for identity management
- JWT token-based authentication

**Monitoring & Reliability:**
- Prometheus for metrics collection and alerting
- Sentry for error tracking and performance monitoring
- Circuit Breaker pattern for API resilience
- Automatic retry mechanisms for failed requests

**Quality Assurance:**
- Comprehensive unit test coverage
- Automated testing pipelines
- Code quality enforcement

<a name="key-features"></a>

### Key Features

- **AI-Powered Summarization**: Intelligent content analysis using Google Gemini API
- **Real-time Communication**: WebSocket support for live updates
- **Scalable Architecture**: Microservices design with Docker containerization
- **Enterprise Monitoring**: Prometheus metrics and Sentry error tracking
- **High Reliability**: Circuit breaker pattern and retry logic
- **Comprehensive Testing**: Extensive unit test coverage
- **Multi-language Support**: i18n internationalization
- **Secure Authentication**: Keycloak integration

<a name="project-structure"></a>

### Project Structure

```
xgist/
├── apps/
│   ├── ai/                     # AI service (FastAPI)
│   │   ├── src/               # Source code
│   │   ├── tests/             # Unit tests
│   │   └── requirements.txt   # Python dependencies
│   ├── server/                # Backend server (Fastify)
│   │   ├── src/               # Source code
│   │   ├── tests/             # Unit tests
│   │   └── package.json       # Node.js dependencies
│   └── web/                   # Frontend (React)
│       ├── src/               # Source code
│       ├── tests/             # Unit tests
│       └── package.json       # React dependencies
├── packages/                  # Shared packages
├── docker-compose.dev.yml     # Development containers
├── docker-compose.prod.yml    # Production containers
└── monitoring/                # Prometheus configurations
```

<a name="configuration"></a>

## Configuration

<a name="environment-variables"></a>

### Environment Variables

**Core Application:**
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/xgist
REDIS_URL=redis://localhost:6379

# Authentication
KEYCLOAK_URL=http://localhost:8180
KEYCLOAK_REALM=xgist
KEYCLOAK_CLIENT_ID=xgist-app

# AI Service
GEMINI_URL=https://generativelanguage.googleapis.com
GOOGLE_API_KEY=your_gemini_api_key

# Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

**Circuit Breaker & Retry Configuration:**

The server validates environment variables and provides production-like stability with circuit breaker and retry behavior via the following optional variables (defaults are shown):

```bash
# API client circuit breaker & retry configuration
WHISPER_CB_FAILURE_THRESHOLD=5     # number of consecutive failures before opening the circuit
WHISPER_CB_OPEN_MS=30000          # duration (ms) to keep circuit open before allowing a half-open probe
WHISPER_CB_RETRIES=3              # per-request retry attempts when circuit is closed
WHISPER_CB_BACKOFF_MS=500         # base backoff (ms); effective backoff uses exponential strategy
```

These settings work together with the HTTP client to provide resilience against transient service failures, while fast-failing during prolonged outages.

**Monitoring & Observability:**
```bash
# Sentry (optional): set the following to enable
SENTRY_DSN=your_sentry_dsn_here
SENTRY_TRACES_SAMPLE_RATE=0.1  # float value for performance monitoring

# Prometheus
PROMETHEUS_PORT=9090
METRICS_ENDPOINT=/metrics
```

<a name="monitoring-setup"></a>

### Monitoring Setup

**Prometheus Metrics:**
- Metrics endpoint (Prometheus): `GET /metrics` (no auth) exposes default Node.js metrics and custom HTTP request counters/histograms
- Application exposes metrics at `/metrics` endpoint by default
- Custom alerts configured for system health monitoring
- Performance metrics automatically collected

**Sentry Error Tracking:**
- Real-time error monitoring and alerting
- Performance tracking and optimization insights  
- Automatic error context collection
- Set `SENTRY_DSN` and `SENTRY_TRACES_SAMPLE_RATE` to enable

**Health Checks:**
- `/health` endpoint for service status
- Database connectivity checks
- External service dependency monitoring
- Circuit breaker status monitoring

<a name="development"></a>

## Development

<a name="code-quality"></a>

### Code Quality

```bash
# Linting
pnpm run lint
pnpm run lint:fix
```

<a name="testing"></a>

### Testing

The project maintains high test coverage across all services:

```bash
# Run specific test suites
cd pnpm test
```

<a name="debugging"></a>

### Debugging

**Development Tools:**
- Access metrics: `http://localhost:9090/metrics`
- View logs: `docker-compose logs -f <service_name>`
- Debug mode: Set `NODE_ENV=development`

**Error Tracking:**
- All errors automatically sent to Sentry (when configured)
- Local error logs available in console and files
- Circuit breaker status available via health endpoints

<a name="todo"></a>

## TODO

- [x] AI-powered content summarization using Gemini API
- [x] Real-time communication with Socket.io
- [x] Prometheus metrics collection and alerting
- [x] Sentry error tracking integration
- [x] Circuit breaker pattern for API resilience
- [x] Comprehensive unit test coverage
- [ ] Advanced AI models integration (GPT-4, Claude)
- [ ] Multi-format content support (PDF, DOCX)
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile application (React Native)
- [ ] API rate limiting and throttling
- [ ] Content caching and CDN integration
- [ ] Advanced user roles and permissions
- [ ] Webhook support for integrations
- [ ] Automated content categorization
- [ ] Multi-tenant architecture support

<a name="license"></a>

## License

[MIT](https://choosealicense.com/licenses/mit/)