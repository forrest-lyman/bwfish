import { config } from 'dotenv';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const privateDir = resolve(packageRoot, 'private');

export function loadEnv(): void {
	config({ path: resolve(privateDir, '.env') });

	const firebaseAdminKey = process.env.FIREBASE_ADMIN_KEY?.trim();
	if (firebaseAdminKey && !firebaseAdminKey.startsWith('{') && !isAbsolute(firebaseAdminKey)) {
		process.env.FIREBASE_ADMIN_KEY = resolve(
			privateDir,
			firebaseAdminKey.replace(/^private[/\\]/, ''),
		);
	}
}

export function resolvePath(relativePath: string): string {
	return resolve(privateDir, relativePath);
}
