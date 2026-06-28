import { readFileSync } from 'fs';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { loadEnv, resolvePath } from './env';

let app: App | undefined;
let db: Firestore | undefined;

export function getFirebaseApp(): App {
	if (!app) {
		loadEnv();

		const keyPath = process.env.FIREBASE_ADMIN_KEY;
		if (!keyPath) {
			throw new Error('FIREBASE_ADMIN_KEY is not set');
		}

		const key = JSON.parse(readFileSync(resolvePath(keyPath), 'utf-8'));
		app = getApps()[0] ?? initializeApp({ credential: cert(key) });
	}

	return app;
}

export function getFirestoreDb(): Firestore {
	if (!db) {
		db = getFirestore(getFirebaseApp());
	}

	return db;
}
