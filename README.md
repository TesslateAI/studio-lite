# Tesslate Studio Lite

Tesslate Studio Lite is an advanced, production-ready platform for exploring, testing, and integrating Tesslate's high-performing LLM models. It provides a robust foundation for user authentication via **Firebase**, subscription management with **Stripe**, and a powerful API gateway using **LiteLLM**.

The platform features real-time chat with AI models, interactive code generation with live preview, comprehensive subscription management, and a sophisticated multi-provider LLM gateway. Designed for both end-users and developers, it offers a complete SaaS foundation for AI-powered applications.

## ✨ Key Capabilities

- **Real-Time AI Chat**: Stream-based conversations with multiple AI models
- **Interactive Code Generation**: Live code preview with Sandpack integration
- **Smart Code Detection**: Automatic detection and streaming of code blocks
- **Multi-Provider LLM Gateway**: Access to 16+ models from Groq, Llama, and Featherless AI
- **Advanced Chat Features**: Inline editing, message regeneration, artifact management
- **Production-Ready Payments**: Complete Stripe integration with instant plan upgrades

---

![image](https://github.com/user-attachments/assets/0ac43e7a-bddc-49b1-a946-31c85bfdc882)

---

## Features

-   **Firebase Authentication**: Secure user sign-up, sign-in, and session management. Includes password reset flows out-of-the-box.
-   **Anonymous Guest Mode**: New users are automatically signed in as anonymous guests, allowing them to try the app before committing to an account.
-   **LiteLLM API Gateway**: A centralized proxy to manage multiple LLM providers, create user-specific API keys, set rate limits, and track usage.
-   **Stripe Subscriptions**: Production-ready integration for managing user plans (Free, Plus, Pro). Checkout, customer portal, and webhooks are fully implemented.
-   **Instant Plan Upgrades**: User API key permissions are updated immediately upon successful payment, providing instant access to premium features.
-   **Interactive UI Generation**: A real-time chat interface for generating, previewing, and editing code artifacts.
-   **Dockerized Environment**: A multi-container Docker setup for consistent local development and easy deployment, separating the Next.js app, LiteLLM proxy, and their respective databases.
-   **Type-Safe Backend**: Built with Drizzle ORM and TypeScript for a robust and maintainable codebase.

---

## Tech Stack

-   **Framework**: Next.js (App Router)
-   **Authentication**: Firebase
-   **API Gateway**: LiteLLM
-   **Database**: PostgreSQL
-   **ORM**: Drizzle
-   **Payments**: Stripe
-   **UI**: shadcn/ui, Radix UI, Tailwind CSS

---

## Local Development Setup

### Prerequisites

-   Node.js (v20+) and pnpm
-   Docker and Docker Compose
-   A Firebase project with Authentication enabled.
-   A Stripe account for testing payments.

### Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd <repo-name>
pnpm install
```

### Step 2: Environment Setup

1.  Copy the contents of `.env.example` into a new file named `.env`.
2.  Fill in the required values:
    -   **Firebase**: Get your client config and generate a service account key from your Firebase project settings.
    -   **Stripe**: Get your test secret key and webhook secret from the Stripe dashboard.
    -   **LiteLLM**: Set a `LITELLM_MASTER_KEY` (e.g., `sk-1234`) and provide your LLM provider API keys.
    -   The `POSTGRES_URL` and LiteLLM `DATABASE_URL` are for external databases. The `docker-compose.yml` file will override these for local development.

### Step 3: Run the Development Environment

The entire stack (Next.js, LiteLLM, and two Postgres databases) is managed by Docker Compose.

```bash
docker-compose up --build
```

-   Your Next.js app will be available at `http://localhost:3000`.
-   The LiteLLM proxy will be available at `http://localhost:4000`.
-   The application database is exposed on `localhost:54322`.
-   The LiteLLM database is exposed on `localhost:54323`.

### Step 4: Database Migrations

With the Docker containers running, open a new terminal and run the Drizzle migrations against the application database.

```bash
pnpm db:migrate
```

You can view and manage the database using Drizzle Studio:
```bash
pnpm db:studio
```

---

## Authentication Flow

This project uses a secure, server-side session cookie flow with Firebase:

1.  **Client Sign-In**: The user signs in or signs up using the Firebase client-side SDK in the browser.
2.  **ID Token Generation**: Upon success, Firebase provides a short-lived ID Token to the client.
3.  **Session Cookie Exchange**: The client sends this ID Token to our backend at `/api/auth/session`.
4.  **Server-Side Verification**: The server uses the Firebase Admin SDK to verify the ID Token.
5.  **Database & Key Sync**: The server creates a corresponding user record in our own PostgreSQL database and generates a LiteLLM virtual key for them.
6.  **Cookie Issuance**: The server creates a secure, `httpOnly` session cookie and sends it back to the client.
7.  **Authenticated Requests**: For all subsequent requests, the browser automatically sends this session cookie. The Next.js middleware verifies it on the server to protect routes and identify the user.

---

## Project Structure

-   **/app**: Main application routes (App Router).
-   **/components**: Reusable React components.
-   **/lib**: Core logic and utilities.
    -   `/auth`: Firebase session management.
    -   `/db`: Drizzle ORM schema, migrations, and queries.
    -   `/firebase`: Firebase client and server SDK initializations.
    -   `/litellm`: API and key management for the LiteLLM proxy.
    -   `/payments`: Stripe actions and webhook handlers.
-   **Dockerfile**: Defines the production build for the Next.js app.
-   **docker-compose.yml**: Orchestrates all services for local development.
-   **litellm.config.yaml**: Configures models for the LiteLLM proxy.

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.