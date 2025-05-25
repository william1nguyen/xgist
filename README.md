# xgist

<div align="center">
  
  ![xgist Logo](public/xgist-logo.png)
  
  # **AI-Driven Content Sharing Platform**
  ### *Summarization for Social Video and Voice* 
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
  [![Fastify](https://img.shields.io/badge/Fastify-Latest-000000?logo=fastify&logoColor=white)](https://www.fastify.io/)
  
</div>

## Project Overview

**Xgist** is an innovative platform designed to intelligently summarize and share social video and voice content, making information consumption more efficient and accessible.

**Transform lengthy content into concise, valuable summaries while preserving the core message**

<img width="1289" alt="Screenshot 2025-05-26 at 01 24 04" src="https://github.com/user-attachments/assets/1589658d-29bc-4dc2-bc8e-0d65bc331419" />


## Technology Stack

<table>
  <tr>
    <td><b> Project Structure</b></td>
    <td>
      <ul>
        <li> <b>Monorepo Architecture</b></li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><b> Frontend</b></td>
    <td>
      <ul>
        <li><b>React</b></li>
        <li><b>Tailwind CSS</b></li>
        <li><b>i18n</b></li>
        <li><b>Nginx</b></li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><b>Backend</b></td>
    <td>
      <ul>
        <li><b>Fastify</b></li>
        <li><b>FastAPI</b></li>
        <li><b>PostgreSQL</b></li>
        <li><b>Socket.io</b></li>
        <li><b>BullMQ</b></li>
        <li><b>Keycloak</b></li>
        <li><b>MinIO</b></li>
      </ul>
    </td>
  </tr>
</table>

## How to run ?

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Docker and Docker Compose (for containerized deployment)
- Keycloak for authentication
- Gemini API key for AI capabilities

### Installation

1. Clone the repository:

   ```bash
   $ git clone https://github.com/william1nguyen/xgist.git
   $ cd xgist
   ```

2. Install dependencies:

   ```bash
   $ pnpm install
   ```

3. Set up environment variables:

   ```bash
   $ cd /apps/<APP_NAME>
   $ cp .env.example .env
   ```

4. Start the development environment:
   ```bash
   $ pnpm run dev
   ```

### Keycloak Setup

- Follow these steps to set up Keycloak using the [keycloak-custom-setup](https://github.com/william1nguyen/keycloak-custom-setup) repository

- For detailed customization options, refer to the [Keycloak documentation](https://www.keycloak.org/documentation.html).

### Gemini API Setup

1. Create a Google Cloud account if you don't have one already at [console.cloud.google.com](https://console.cloud.google.com)

2. Enable the Gemini API:

   - Go to [Google AI Studio](https://makersuite.google.com/)
   - Sign in with your Google account
   - Click on "Get API key" or navigate to the API keys section
   - Generate a new API key

3. Add the API key to your environment variables:

   ```bash
   # In your apps/server/.env file
   GEMINI_URL=changeme
   GOOGLE_API_KEY=changeme
   ```

For more information about Gemini API capabilities and models, visit the [Google AI documentation](https://ai.google.dev/docs).

## Project Structure

Based on your actual project structure:

```
xgist/
├── apps/
│   ├── ai/                  # AI service application
│   ├── gemini/              # Gemini service application
│   ├── server/              # Backend server
│   └── web/                 # React frontend application
├── docker-compose.dev.yml  # Development Docker Compose
```

## 📄 License

[MIT License](LICENSE)

---
