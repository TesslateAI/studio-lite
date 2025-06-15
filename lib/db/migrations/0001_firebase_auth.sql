-- Migration to support Firebase Authentication

-- Step 1: Drop foreign key constraints that depend on the 'users' table's 'id' column.
-- The specific names of constraints may vary. Check your database if these fail.
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_user_id_users_id_fk";
ALTER TABLE "chat_sessions" DROP CONSTRAINT "chat_sessions_user_id_users_id_fk";
ALTER TABLE "stripe" DROP CONSTRAINT "stripe_user_id_users_id_fk";

-- Step 2: Alter the 'users' table.
-- Change the primary key 'id' from SERIAL (integer) to VARCHAR(255) to store Firebase UIDs.
-- Drop the 'password_hash' column as Firebase now handles passwords.
ALTER TABLE "users" DROP COLUMN "password_hash";
ALTER TABLE "users" ALTER COLUMN "id" TYPE varchar(255);

-- Step 3: Alter the referencing tables to match the new 'users.id' type.
ALTER TABLE "activity_logs" ALTER COLUMN "user_id" TYPE varchar(255);
ALTER TABLE "chat_sessions" ALTER COLUMN "user_id" TYPE varchar(255);
ALTER TABLE "stripe" ALTER COLUMN "user_id" TYPE varchar(255);

-- Step 4: Re-add the foreign key constraints with the updated column types.
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "stripe" ADD CONSTRAINT "stripe_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- Note: Existing user data will be lost during this migration. This is intended for a fresh setup.
-- If you need to preserve data, a more complex data migration script would be required.