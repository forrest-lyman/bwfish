import chalk from 'chalk';
import { Command } from 'commander';
import { agentTestAction } from './actions/agent-test';
import { feedProcessAction } from './actions/feed-process';
import { loadEnv } from './env';

loadEnv();

function handleError(error: unknown): never {
	const message = error instanceof Error ? error.message : String(error);
	console.error(chalk.red(`\nError: ${message}`));
	if (error instanceof Error && error.stack) {
		console.error(error.stack);
	}
	process.exit(1);
}

const program = new Command();

program
	.name('bwfish-server')
	.description('BW Fish server-side feed processing and agent tools');

program
	.command('feed')
	.description('Feed processing commands')
	.addCommand(
		new Command('process')
			.description('Claim and process the next feed entry')
			.option('-n, --count <count>', 'Number of entries to process', '1')
			.option('-y, --yes', 'Skip confirmation prompts')
			.action(feedProcessAction),
	);

program
	.command('agent')
	.description('Agent testing commands')
	.addCommand(
		new Command('test')
			.description('Run an agent interactively')
			.action(agentTestAction),
	);

program.parseAsync(process.argv).catch(handleError);
