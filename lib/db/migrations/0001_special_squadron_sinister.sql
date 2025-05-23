CREATE TABLE "stripe" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_product_id" text,
	"plan_name" varchar(50),
	"subscription_status" varchar(20),
	CONSTRAINT "stripe_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "stripe_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "invitations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_members" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "invitations" CASCADE;--> statement-breakpoint
DROP TABLE "team_members" CASCADE;--> statement-breakpoint
DROP TABLE "teams" CASCADE;--> statement-breakpoint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_team_id_teams_id_fk;
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD COLUMN "stripe_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe" ADD CONSTRAINT "stripe_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_stripe_id_stripe_id_fk" FOREIGN KEY ("stripe_id") REFERENCES "public"."stripe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" DROP COLUMN "team_id";