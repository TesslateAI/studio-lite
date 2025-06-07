import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NewUser, User } from '@/lib/db/schema';
const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;
export async function hashPassword(password: string) {
return hash(password, SALT_ROUNDS);
}
export async function comparePasswords(
plainTextPassword: string,
hashedPassword: string
) {
return compare(plainTextPassword, hashedPassword);
}
export type SessionData = {
user: {
id: number;
isGuest?: boolean;
};
expires: string;
};
export async function signToken(payload: SessionData) {
return await new SignJWT(payload)
.setProtectedHeader({ alg: 'HS256' })
.setIssuedAt()
.setExpirationTime('1 day from now')
.sign(key);
}
export async function verifyToken(input: string): Promise<SessionData> {
const { payload } = await jwtVerify(input, key, {
algorithms: ['HS256'],
});
return payload as SessionData;
}
export async function getSession() {
const session = (await cookies()).get('session')?.value;
if (!session) return null;
try {
return await verifyToken(session);
} catch (error) {
// Token is invalid or expired
console.error('Session token verification failed:', error);
return null;
}
}
export async function setSession(user: User | NewUser) {
const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
const session: SessionData = {
user: { id: user.id!, isGuest: user.isGuest },
expires: expiresInOneDay.toISOString(),
};
const encryptedSession = await signToken(session);
(await cookies()).set('session', encryptedSession, {
expires: expiresInOneDay,
httpOnly: true,
secure: process.env.NODE_ENV === 'production',
sameSite: 'lax',
});
}
