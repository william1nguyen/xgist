# 🚀 xgist

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

## 🔍 Project Overview

**Xgist** is an innovative platform designed to intelligently summarize and share social video and voice content, making information consumption more efficient and accessible.

> 💡 **Transform lengthy content into concise, valuable summaries while preserving the core message**

## ⚙️ Technology Stack

<table>
  <tr>
    <td><b>📦 Project Structure</b></td>
    <td>
      <ul>
        <li>📂 <b>Monorepo Architecture</b> with Turborepo for efficient code sharing and build optimization</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><b>🖥️ Frontend</b></td>
    <td>
      <ul>
        <li>⚛️ <b>React</b> - Fast, scalable component architecture</li>
        <li>🎨 <b>Tailwind CSS</b> - Utility-first styling framework</li>
        <li>🌐 <b>i18n</b> - Comprehensive internationalization</li>
        <li>⚡ <b>Nginx</b> - Optimized hosting with advanced caching</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td><b>🔧 Backend</b></td>
    <td>
      <ul>
        <li>🚀 <b>Fastify</b> - High-performance API services</li>
        <li>💾 <b>PostgreSQL</b> with Drizzle ORM - Robust database solution</li>
        <li>🔄 <b>Socket.io</b> - Real-time bidirectional communication</li>
        <li>🧠 <b>BullMQ</b> - Redis-based queue for background processing</li>
        <li>🔒 <b>Keycloak</b> - Enterprise-grade authentication and authorization</li>
        <li>📁 <b>MinIO</b> - Scalable object storage solution</li>
      </ul>
    </td>
  </tr>
</table>

## ✨ Features

<div align="center">
  <table>
    <tr>
      <td align="center">🤖</td>
      <td><b>AI-powered Summarization</b></td>
      <td>Transform lengthy videos and audio into concise summaries</td>
    </tr>
    <tr>
      <td align="center">🔄</td>
      <td><b>Social Integration</b></td>
      <td>Seamless sharing across major platforms</td>
    </tr>
    <tr>
      <td align="center">⚡</td>
      <td><b>Real-time Updates</b></td>
      <td>Instant notifications and content delivery</td>
    </tr>
    <tr>
      <td align="center">🌎</td>
      <td><b>Multi-language Support</b></td>
      <td>Reach global audiences with localized content</td>
    </tr>
    <tr>
      <td align="center">🔒</td>
      <td><b>Enterprise Security</b></td>
      <td>Robust authentication and data protection</td>
    </tr>
    <tr>
      <td align="center">⚙️</td>
      <td><b>Scalable Processing</b></td>
      <td>Efficient handling of background tasks</td>
    </tr>
  </table>
</div>

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Docker and Docker Compose (for containerized deployment)
- Keycloak for authentication
- Gemini API key for AI capabilities

### Installation

<details>
<summary>📋 Click to expand installation steps</summary>

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
   </details>

### Keycloak Setup

<details>
<summary>🔐 Click to expand Keycloak setup instructions</summary>

- Follow these steps to set up Keycloak using the [keycloak-custom-setup](https://github.com/william1nguyen/keycloak-custom-setup) repository

- For detailed customization options, refer to the [Keycloak documentation](https://www.keycloak.org/documentation.html).

</details>

### Gemini API Setup

<details>
<summary>🧠 Click to expand Gemini API setup instructions</summary>

1. Create a Google Cloud account if you don't have one already at [console.cloud.google.com](https://console.cloud.google.com)

2. Enable the Gemini API:

   - Go to [Google AI Studio](https://makersuite.google.com/)
   - Sign in with your Google account
   - Click on "Get API key" or navigate to the API keys section
   - Generate a new API key

3. Add the API key to your environment variables:

   ```bash
   # In your apps/server/.env file
   GEMINI_URL=your_model_url
   GOOGLE_API_KEY=your_api_key_here
   ```

For more information about Gemini API capabilities and models, visit the [Google AI documentation](https://ai.google.dev/docs).

</details>

## 📂 Project Structure

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

## 🤝 Contributing

We welcome contributions from the community! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.

## 📄 License

[MIT License](LICENSE)

## 📞 Contact

<div align="center">
  
  [![Email](https://img.shields.io/badge/Email-Contact-red?style=for-the-badge&logo=gmail)](mailto:vietanhhd03@gmail.com)
  [![GitHub](https://img.shields.io/badge/GitHub-Star-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/william1nguyen/xgist)
  
</div>

---

<div align="center">
  <sub>Built with ❤️ by the xgist team</sub>
</div>
