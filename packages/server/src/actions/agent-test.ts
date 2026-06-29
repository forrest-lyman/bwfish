import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolvePath } from '../env';
import { agents, getAgent } from '../modules/question/agents';
import { orchestrate } from '../modules/question/orchestrator';

const AUTO = 'auto';

interface TestConfig {
	defaultAgentId?: string;
	defaultMessage?: string;
}

const CONFIG_PATH = resolvePath('server-test.json');

function loadConfig(): TestConfig {
	try {
		return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as TestConfig;
	} catch {
		return {};
	}
}

function saveConfig(config: TestConfig): void {
	mkdirSync(resolvePath('.'), { recursive: true });
	writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}

function isValidChoice(agentId: string | undefined): agentId is string {
	return agentId === AUTO || (agentId !== undefined && getAgent(agentId) !== undefined);
}

export async function agentTestAction(): Promise<void> {
	if (agents.length === 0) {
		throw new Error('No agents registered');
	}

	const config = loadConfig();
	const defaultChoice = isValidChoice(config.defaultAgentId) ? config.defaultAgentId : AUTO;

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

	saveConfig({ ...config, defaultAgentId: agentId });

	const message = await input({
		message: 'Message',
		default: config.defaultMessage,
		validate: (value) => (value.trim() ? true : 'Message is required'),
	});

	const trimmedMessage = message.trim();
	saveConfig({ ...config, defaultAgentId: agentId, defaultMessage: trimmedMessage });

	if (agentId === AUTO) {
		const result = await orchestrate({ message: trimmedMessage, context: null });
		const selected = result.agentIds.length ? result.agentIds.join(', ') : 'none';
		console.log(chalk.green(`Selected agents: ${selected}`));

		if (result.agentIds.length === 0) {
			console.log(chalk.yellow('\nNo agents matched this question.'));
		}

		return;
	}

	const agent = getAgent(agentId);
	if (!agent) {
		throw new Error(`Unknown agent: ${agentId}`);
	}

	await agent.run({ message: trimmedMessage, context: null });
}
