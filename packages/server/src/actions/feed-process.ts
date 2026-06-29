import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { runNext } from '../lib/pipeline';

export interface FeedProcessOptions {
	count: string;
	yes?: boolean;
}

async function processFeed(count: number): Promise<void> {
	let processed = 0;

	for (let i = 0; i < count; i += 1) {
		const entry = await runNext();
		if (!entry) {
			console.log(chalk.dim('No new feed entries to process'));
			break;
		}

		console.log(chalk.green(`Finished ${entry.type} ${entry.id}`));
		processed += 1;
	}

	if (processed > 0) {
		console.log(chalk.green(`\nProcessed ${processed} feed ${processed === 1 ? 'entry' : 'entries'}`));
	}
}

export async function feedProcessAction(options: FeedProcessOptions): Promise<void> {
	const count = Math.max(1, Number.parseInt(options.count, 10) || 1);

	if (!options.yes && count > 1) {
		const proceed = await confirm({
			message: `Process up to ${count} feed entries?`,
			default: true,
		});
		if (!proceed) {
			console.log(chalk.yellow('Cancelled'));
			return;
		}
	}

	await processFeed(count);
}
