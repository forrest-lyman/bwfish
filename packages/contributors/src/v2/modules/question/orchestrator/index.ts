import { getOpenAIClient } from '../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../lib/services/log';
import type { AgentRunPayload } from '../types';
import { agents, getAgent, type Agent } from '../agents';
import { instructions, ORCHESTRATOR_INSTRUCTIONS, ORCHESTRATOR_MODEL } from './prompts';

const selectAgentsSchema = {
	type: 'object',
	properties: {
		agentIds: {
			type: 'array',
			items: { type: 'string' },
		},
	},
	required: ['agentIds'],
	additionalProperties: false,
} as const;

function extractAgentUsage(result: unknown): LogUsage[] {
	if (result && typeof result === 'object' && 'usage' in result) {
		const usage = (result as { usage?: unknown }).usage;
		if (Array.isArray(usage)) {
			return usage as LogUsage[];
		}
	}

	return [];
}

export interface OrchestratorRunResult {
	agentIds: string[];
	results: Record<string, unknown>;
	usage: {
		orchestration: LogUsage[];
		agents: Record<string, LogUsage[]>;
	};
}

function agentCatalog(): { id: string; title: string; use: string }[] {
	return agents.map((agent) => ({
		id: agent.id,
		title: agent.title,
		use: agent.use.trim(),
	}));
}

export async function selectAgents(
	payload: AgentRunPayload,
): Promise<{ agents: Agent[]; usage: LogUsage[] }> {
	if (agents.length === 0) {
		return { agents: [], usage: [] };
	}

	const openai = getOpenAIClient();
	const response = await openai.responses.create({
		model: ORCHESTRATOR_MODEL,
		instructions: instructions(ORCHESTRATOR_INSTRUCTIONS),
		input: JSON.stringify({
			question: payload.message,
			context: payload.context,
			agents: agentCatalog(),
		}),
		text: {
			format: {
				type: 'json_schema',
				name: 'agent_selection',
				strict: true,
				schema: selectAgentsSchema,
			},
		},
	});

	const { agentIds } = JSON.parse(response.output_text) as { agentIds: string[] };
	const validIds = new Set(agents.map((agent) => agent.id));
	const usage = toLogUsage(response.usage, ORCHESTRATOR_MODEL);

	return {
		agents: agentIds
			.filter((id) => validIds.has(id))
			.map((id) => getAgent(id))
			.filter((agent): agent is Agent => agent !== undefined),
		usage: usage ? [usage] : [],
	};
}

export async function orchestrate(payload: AgentRunPayload): Promise<OrchestratorRunResult> {
	const results: Record<string, unknown> = {};
	const agentUsage: Record<string, LogUsage[]> = {};

	const { agents: selected, usage: orchestrationUsage } = await selectAgents(payload);

	for (const agent of selected) {
		const result = await agent.run(payload);
		results[agent.id] = result;
		agentUsage[agent.id] = extractAgentUsage(result);
	}

	return {
		agentIds: selected.map((agent) => agent.id),
		results,
		usage: {
			orchestration: orchestrationUsage,
			agents: agentUsage,
		},
	};
}
