import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

export const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
export const privateDir = resolve(repoRoot, 'private');
export const envPath = resolve(privateDir, '.env');

let loaded = false;

export function loadEnv(): void {
	if (!loaded) {
		config({ path: envPath });
		loaded = true;
	}
}

export function resolvePath(relativePath: string): string {
	const normalized = relativePath.replace(/^private[/\\]/, '');
	return resolve(privateDir, normalized);
}
