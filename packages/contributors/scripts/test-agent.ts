import { input, select } from '@inquirer/prompts';
import { privateDir, resolvePath } from '../src/clients/env';
import { orchestrate } from '../src/orchestrator';
import chalk from 'chalk';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import ora from 'ora';
import { agents, getAgent } from '../src/agents/index';

const AUTO = 'auto';

interface TestConfig {
	defaultAgentId?: string;
	defaultMessage?: string;
}

const CONFIG_PATH = resolvePath('contributors-test.json');

function loadConfig(): TestConfig {
	try {
		return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as TestConfig;
	} catch {
		return {};
	}
}

function saveConfig(config: TestConfig): void {
	mkdirSync(privateDir, { recursive: true });
	writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}

function isValidChoice(agentId: string | undefined): agentId is string {
	return agentId === AUTO || (agentId !== undefined && getAgent(agentId) !== undefined);
}

async function main(): Promise<void> {
	if (agents.length === 0) {
		throw new Error('No agents registered');
	}

	const loadSpinner = ora('Loading saved preferences').start();
	const config = loadConfig();
	loadSpinner.succeed('Preferences loaded');

	const defaultChoice = isValidChoice(config.defaultAgentId)
		? config.defaultAgentId
		: AUTO;

	const agentId = await select({
		message: 'Choose an agent',
		default: defaultChoice,
		choices: [
			{ name: 'Auto (orchestrator)', value: AUTO },
			...agents.map((agent) => ({
				name: `${agent.title} (${agent.id})`,
				value: agent.id,
			})),
		],
	});

	const saveSpinner = ora('Saving default agent').start();
	saveConfig({ ...config, defaultAgentId: agentId });
	saveSpinner.succeed(
		agentId === AUTO ? 'Default mode set to auto' : `Default agent set to ${getAgent(agentId)?.title}`,
	);

	const message = await input({
		message: 'Message',
		default: config.defaultMessage,
		validate: (value) => (value.trim() ? true : 'Message is required'),
	});

	const trimmedMessage = message.trim();
	saveConfig({ ...config, defaultAgentId: agentId, defaultMessage: trimmedMessage });

	if (agentId === AUTO) {
		const routeSpinner = ora('Selecting agents').start();

		try {
			const result = await orchestrate({ message: trimmedMessage, context: null });
			const selected = result.agentIds.length ? result.agentIds.join(', ') : 'none';
			routeSpinner.succeed(`Selected agents: ${selected}`);

			if (result.agentIds.length === 0) {
				console.log(chalk.yellow('\nNo agents matched this question.'));
			}
		} catch (error) {
			routeSpinner.fail('Orchestrator failed');
			throw error;
		}

		return;
	}

	const agent = getAgent(agentId);
	if (!agent) {
		throw new Error(`Unknown agent: ${agentId}`);
	}

	await agent.run({ message: trimmedMessage, context: null });
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(chalk.red(`\nError: ${message}`));
	process.exit(1);
});
