# Studio Lite
## Features

- Landing page and pricing page with Stripe Checkout integration
- User dashboard with subscription management
- User authentication (email/password, JWT cookies)
- **User-based subscription model** (no teams/members)
- Stripe Customer Portal for managing billing
- **Guest mode**: allows limited access to app features without authentication
- Activity logging for user events
- Global and local route protection (middleware)
- Fully type-safe with Drizzle ORM and TypeScript

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Database**: [Postgres](https://www.postgresql.org/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

```bash
git clone <your-repo-url>
cd studio-lite
pnpm install
```

## Running Locally

1. [Install the Stripe CLI](https://docs.stripe.com/stripe-cli) and log in:
   ```bash
   stripe login
   ```
2. Create your `.env` file (see `.env.example` for required variables).
3. Run database setup:
   ```bash
   pnpm db:setup
   pnpm db:migrate
   pnpm db:seed
   ```
   This creates a default user:
   - Email: `test@test.com`
   - Password: `admin123`

4. Start the dev server:
   ```bash
   pnpm dev
   ```
   Visit [http://localhost:3000](http://localhost:3000)

5. **Listen for Stripe webhooks locally:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

## Stripe Webhooks

Studio Lite uses Stripe webhooks to keep your database in sync with subscription status. When a user subscribes, cancels, or updates their plan, Stripe sends an event to `/api/stripe/webhook`. The backend updates the `stripe` table for the user, ensuring your UI always reflects the latest plan and status.

**Important:**
- Your UI always reads subscription status from your own database, not directly from Stripe.
- Webhooks are required for real-time updates.

## Guest Mode

- Unauthenticated users can access limited features in guest mode.
- Guest mode logic is handled in the backend and middleware, restricting access to premium features unless the user is authenticated and subscribed.
- You can customize guest access in the route middleware or API logic.

## Testing Payments

Use these test card details in Stripe Checkout:
- Card Number: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

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

## Environment Variables

- `BASE_URL`: Your app's base URL
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `POSTGRES_URL`: Your Postgres connection string
- `AUTH_SECRET`: A random string for JWT signing

## Notes
- All subscription logic is user-based (no teams or invitations).
- All subscription status is kept in sync via Stripe webhooks.
- Guest mode is enabled by default for unauthenticated users.
- **Two layers of security are implemented:**
  - **Session-based security** for authenticated users (using secure cookies/JWTs).
  - **IP-based security** for guests (rate-limiting and access control by IP address).
- Both layers work together to ensure fair, secure access for all users.

---

For questions or contributions, open an issue or PR!
