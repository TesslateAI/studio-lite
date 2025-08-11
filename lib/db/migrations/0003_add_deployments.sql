-- Add deployments table for storing user-generated HTML sites
CREATE TABLE IF NOT EXISTS "deployments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "deployment_id" varchar(100) UNIQUE NOT NULL,
  "title" varchar(255),
  "html_content" text NOT NULL,
  "css_content" text,
  "js_content" text,
  "metadata" jsonb,
  "view_count" integer DEFAULT 0 NOT NULL,
  "is_public" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_user_id_users_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "deployments_user_id_idx" ON "deployments"("user_id");
CREATE INDEX IF NOT EXISTS "deployments_deployment_id_idx" ON "deployments"("deployment_id");
CREATE INDEX IF NOT EXISTS "deployments_created_at_idx" ON "deployments"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "deployments_is_public_idx" ON "deployments"("is_public");