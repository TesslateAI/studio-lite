import { sql } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';

async function createApiKeysTable() {
    try {
        // Try to create the table - it will fail if it already exists
        console.log('Creating api_keys table...');

        // Create the table
        await db.execute(sql`
            CREATE TABLE api_keys (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
                user_id varchar(255) NOT NULL,
                name varchar(100) NOT NULL,
                key text NOT NULL,
                key_prefix varchar(20) NOT NULL,
                team varchar(100) DEFAULT 'tesslate-api-key' NOT NULL,
                models jsonb DEFAULT '["uigen-x-small", "uigen-x-large"]' NOT NULL,
                last_used_at timestamp,
                expires_at timestamp,
                is_active boolean DEFAULT true NOT NULL,
                created_at timestamp DEFAULT now() NOT NULL,
                updated_at timestamp DEFAULT now() NOT NULL,
                CONSTRAINT api_keys_key_unique UNIQUE(key)
            );
        `);

        // Add foreign key constraint
        await db.execute(sql`
            ALTER TABLE api_keys 
            ADD CONSTRAINT api_keys_user_id_users_id_fk 
            FOREIGN KEY (user_id) REFERENCES users(id) 
            ON DELETE cascade ON UPDATE no action;
        `);

        console.log('✅ api_keys table created successfully');
    } catch (error) {
        console.error('Error creating api_keys table:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

createApiKeysTable();