import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const CACHE_DIR = resolve(repoRoot, 'tmp', 'contributors-cache');

export interface CacheOptions {
	duration: number;
}

export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
	duration: 3600, // seconds, 1 hour
};

interface CacheEntry<T = unknown> {
	value: T;
	expiresAt: number;
}

function cachePath(key: string): string {
	const hash = createHash('sha256').update(key).digest('hex');
	return resolve(CACHE_DIR, `${hash}.json`);
}

async function readCache<T>(key: string): Promise<T | undefined> {
	try {
		const raw = await readFile(cachePath(key), 'utf-8');
		const entry = JSON.parse(raw) as CacheEntry<T>;

		if (Date.now() >= entry.expiresAt) {
			await unlink(cachePath(key)).catch(() => undefined);
			return undefined;
		}

		return entry.value;
	} catch {
		return undefined;
	}
}

async function writeCache<T>(key: string, value: T, duration: number): Promise<void> {
	await mkdir(CACHE_DIR, { recursive: true });

	const entry: CacheEntry<T> = {
		value,
		expiresAt: Date.now() + duration * 1000,
	};

	await writeFile(cachePath(key), `${JSON.stringify(entry)}\n`, 'utf-8');
}

export async function invalidateCache(key: string): Promise<void> {
	await unlink(cachePath(key)).catch(() => undefined);
}

export async function cacheFn<T>(
	key: string,
	fn: () => Promise<T>,
	overrides: Partial<CacheOptions> = {},
): Promise<T> {
	const options: CacheOptions = { ...DEFAULT_CACHE_OPTIONS, ...overrides };

	const cached = await readCache<T>(key);
	if (cached !== undefined) {
		return cached;
	}

	const value = await fn();
	await writeCache(key, value, options.duration);
	return value;
}
