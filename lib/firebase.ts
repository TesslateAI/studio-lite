// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import * as admin from 'firebase-admin';
import { getAuth as getAdminAuth, Auth as AdminAuth } from 'firebase-admin/auth';

// --- CLIENT-SIDE ---
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function createClientApp(): FirebaseApp {
    if (getApps().length > 0) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

export function getClientAuth(): Auth {
    return getAuth(createClientApp());
}

// --- SERVER-SIDE (ADMIN) ---
function getServiceAccount() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
        throw new Error('The FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }
    try {
        return JSON.parse(serviceAccountJson);
    } catch (error) {
        throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON.');
    }
}

function createAdminApp(): admin.app.App {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }
    return admin.initializeApp({
        credential: admin.credential.cert(getServiceAccount()),
    });
}

export function getAdminAuthSDK(): AdminAuth {
    return getAdminAuth(createAdminApp());
}