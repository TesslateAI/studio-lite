# Studio Lite

Studio Lite is a modern, extensible platform for testing, exploring, and showcasing Tesslate's high-performing LLM models. It provides a robust foundation for user authentication, subscription management, guest access, and seamless integration with Stripe for payments. The primary purpose of Studio Lite is to give users access to Tesslate models via APIs and enable them to generate websites and content using these models in an interactive environment.

---

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![image](https://github.com/user-attachments/assets/0ac43e7a-bddc-49b1-a946-31c85bfdc882)

![image](https://github.com/user-attachments/assets/367e89f5-31a0-4e10-8c83-f2b43a3a172a)

![image](https://github.com/user-attachments/assets/6f7e1c37-f926-42fc-817e-d27d33316f3e)

## Overview

Studio Lite enables you to:
- Access and experiment with Tesslate's advanced LLM models through a unified web interface.
- Generate websites and content using Tesslate models, with instant feedback and preview.
- Test and compare different models provided by Tesslate, including new releases and experimental versions.
- Use provided APIs to integrate Tesslate models into your own applications or workflows.
- Manage your access, usage, and subscription (if applicable) for premium model features.

---

## Features

- Interactive playground for generating websites and content with Tesslate models
- Easy model selection and comparison
- User authentication (email/password, JWT cookies)
- Guest mode for limited, unauthenticated access
- OpenAI API format access to Tesslate models for integration in external projects
- Activity logging for user events
- Global and local route protection (middleware)
- Type-safe backend with Drizzle ORM and TypeScript
- Stripe integration for managing premium access (if enabled)
- Extensible model configuration via `lib/models.json`

---

## Tech Stack

- **Framework:** Next.js
- **Database:** Postgres
- **ORM:** Drizzle
- **Payments:** Stripe
- **UI Library:** shadcn/ui
- **Type Safety:** TypeScript

---

## Getting Started

1. **Clone the repository and install dependencies:**
   ```sh
   git clone <your-repo-url>
   cd studio-lite
   pnpm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` and fill in the required values.

3. **Set up the database:**
   > **Note:** If you have already been provided with a database, DO NOT run this step.
   ```sh
   pnpm db:setup
   pnpm db:migrate
   pnpm db:seed
   ```
   This seeds a default user:
   - Email: `test@test.com`
   - Password: `admin123`

4. **Start the development server:**
   ```sh
   pnpm dev
   ```
   Visit [http://localhost:3000](http://localhost:3000)

5. **Set up Stripe webhooks (for local development, if using premium features):**
   ```sh
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

---

## Usage & Configuration

### Model Playground
- Use the web interface to select, test, and compare Tesslate models.
- Generate websites and content by providing prompts and reviewing instant previews.
- Switch between models to see differences in output and performance.

### Guest Mode
- Unauthenticated users can access limited features for quick testing.
- Guest access is rate-limited: by default, guests can send up to 5 messages per 24 hours (configurable in the backend).
- Two layers of guest tracking and rate-limiting are implemented:
  - **IP-based:** The backend tracks guest usage by IP address to prevent abuse across devices or browsers.
  - **Local session-based:** The frontend also tracks guest usage in local storage/session, so limits persist even if the user refreshes or reopens the browser.
- If a guest exceeds the allowed limit, they are prompted to sign up for continued access.
- You can customize guest access, limits, and logic in the route middleware or API logic as needed.

### Adding New Models
1. **Edit `lib/models.json`:**
   Add a new entry with a unique `id`, a user-friendly `name`, and an `envKey` for your environment variable.
   ```json
   {
     "id": "groq-llama4-maverick-17b-128e-instruct-fp8",
     "name": "Llama-4-Maverick-17B-128E-Instruct-FP8 (Groq)",
     "provider": "Groq",
     "providerId": "groq",
     "envKey": "GROQ_LLAMA4_MAVERICK_17B_128E_INSTRUCT_FP8_MODEL"
   }
   ```
2. **Add the environment variable to `.env` and `.env.example**:
   ```env
   GROQ_LLAMA4_MAVERICK_17B_128E_INSTRUCT_FP8_MODEL=llama-4-maverick-17b-128e-instruct-fp8
   ```
- No backend code changes are needed—just update `models.json` and your environment variables.

### Environment Variables
- `BASE_URL`: Your app's base URL
- `STRIPE_SECRET_KEY`: Your Stripe secret key (if using Stripe)
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret (if using Stripe)
- `POSTGRES_URL`: Your Postgres connection string
- `AUTH_SECRET`: A random string for JWT signing
- Model environment variables as described above

### Testing Payments (if enabled)
- Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)

---

## Extending & Customization

- **Model Integration:** Add or update models in `lib/models.json` and environment variables.
- **API Access:** Use the provided endpoints to connect Tesslate models to your own tools and workflows.
- **Guest Mode:** Enabled by default for unauthenticated users. Customize in middleware or API logic.
- **Security:**
  - Session-based security for authenticated users (secure cookies/JWTs)
  - IP-based security for guests (rate-limiting and access control by IP)
- **UI/UX:**
  - The dashboard header features a user dropdown menu for account actions.
  - If not logged in, Login and Sign Up buttons are shown.

---

## Advanced Notes

- All subscription status is kept in sync via Stripe webhooks (if enabled).
- Guest mode is enabled by default for unauthenticated users.
- Two layers of security are implemented:
  - Session-based for authenticated users
  - IP-based for guests
- Both layers work together for secure, fair access.
- The backend is fully type-safe with Drizzle ORM and TypeScript.

---

## Important Database Commands

- **Drop and recreate all tables (dev only):**
  ```sql
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  DROP SCHEMA drizzle CASCADE;
  ```
- **Run migrations:**
  ```sh
  pnpm db:migrate
  ```
- **Seed the database:**
  ```sh
  pnpm db:seed
  ```
- **Reset everything (dev only):**
  1. Drop schemas as above
  2. Run migrations and seed

---

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

For questions or contributions, open an issue or PR!
