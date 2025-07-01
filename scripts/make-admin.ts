// scripts/make-admin.ts
import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/make-admin.ts <email>');
  process.exit(1);
}

async function makeAdmin() {
  try {
    const result = await db.update(users)
      .set({ role: 'admin', updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
      
    if (result.length > 0) {
      console.log(`✅ Successfully made ${email} an admin`);
      console.log('User details:', result[0]);
    } else {
      console.log(`❌ User ${email} not found`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

makeAdmin();