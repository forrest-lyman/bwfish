import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage, type Storage } from 'firebase-admin/storage';

let app: App | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: Storage | undefined;

function loadServiceAccount(): Record<string, unknown> {
	const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	if (credentialsPath) {
		return JSON.parse(readFileSync(credentialsPath, 'utf-8'));
	}

	const firebaseAdminKey = process.env.FIREBASE_ADMIN_KEY;
	if (!firebaseAdminKey) {
		throw new Error('GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_ADMIN_KEY must be set');
	}

	const trimmed = firebaseAdminKey.trim();
	if (trimmed.startsWith('{')) {
		return JSON.parse(trimmed);
	}

	const path = isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed);
	return JSON.parse(readFileSync(path, 'utf-8'));
}

function getFirebaseApp(): App {
	if (!app) {
		app = getApps()[0] ?? initializeApp({ credential: cert(loadServiceAccount()) });
	}

	return app;
}

export function getFirestoreDb(): Firestore {
	if (!db) {
		db = getFirestore(getFirebaseApp());
	}
	return db;
}

export function getAuth(): Auth {
	if (!auth) {
		auth = getAdminAuth(getFirebaseApp());
	}
	return auth;
}

export function getStorage(): Storage {
	if (!storage) {
		storage = getAdminStorage(getFirebaseApp());
	}
	return storage;
}
