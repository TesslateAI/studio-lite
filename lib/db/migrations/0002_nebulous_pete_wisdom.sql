ALTER TABLE "stripe" ALTER COLUMN "plan_name" SET DEFAULT 'Free';--> statement-breakpoint
ALTER TABLE "stripe" ALTER COLUMN "plan_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe" ALTER COLUMN "subscription_status" SET DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE "stripe" ALTER COLUMN "subscription_status" SET NOT NULL;