// lib/firebase/server.ts
// This file is for SERVER-SIDE logic only.
import 'server-only';
import admin from 'firebase-admin';
import { getAuth as getAdminAuth, Auth as AdminAuth } from 'firebase-admin/auth';

/**
 * A more robust way to initialize the Firebase Admin SDK in a serverless environment
 * like Next.js, which prevents re-initialization on hot reloads.
 */
function createAdminApp(): admin.app.App {
    const appName = 'firebase-admin-app';
    const existingApp = admin.apps.find(app => app?.name === appName);

    if (existingApp) {
        return existingApp;
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
        throw new Error('The FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch (error: any) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${error.message}`);
    }

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    }, appName);
}

export function getAdminAuthSDK(): AdminAuth {
    return getAdminAuth(createAdminApp());
}