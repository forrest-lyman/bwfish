import { config } from 'dotenv';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { runNext } from '../lib/pipeline';

const repoRoot = resolve(fileURLToPath(new URL('../../../../..', import.meta.url)));
const privateDir = resolve(repoRoot, 'private');

config({ path: resolve(privateDir, '.env') });

const firebaseAdminKey = process.env.FIREBASE_ADMIN_KEY?.trim();
if (firebaseAdminKey && !firebaseAdminKey.startsWith('{') && !isAbsolute(firebaseAdminKey)) {
	process.env.FIREBASE_ADMIN_KEY = resolve(
		privateDir,
		firebaseAdminKey.replace(/^private[/\\]/, ''),
	);
}

async function main(): Promise<void> {
	const entry = await runNext();
	if (!entry) {
		console.log('No new feed entries to process');
		return;
	}

	console.log(`Finished ${entry.type} ${entry.id}`);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(chalk.red(`\nError: ${message}`));
	if (error instanceof Error && error.stack) {
		console.error(error.stack);
	}
	process.exit(1);
});
