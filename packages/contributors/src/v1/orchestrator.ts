import { getOpenAIClient } from './clients/openai';
import { agents, getAgent, type Agent } from './agents';
import { moderator } from './agents/managers';
import type { ModeratorRunResult } from './agents/managers/moderator';
import type { AgentRunPayload } from './agents/types';
import { extractAgentUsage, toLogUsage, type LogUsage } from './services/log';
import { instructions, ORCHESTRATOR_INSTRUCTIONS, ORCHESTRATOR_MODEL } from './orchestrator/prompts';

export { ORCHESTRATOR_INSTRUCTIONS, ORCHESTRATOR_MODEL } from './orchestrator/prompts';
export type { AgentRunPayload, ContributorContext, ContributorEntry, ContributorUser, RefContext } from './agents/types';
export type { ModeratorRunResult } from './agents/managers/moderator';

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

export interface OrchestratorRunResult {
	moderation?: ModeratorRunResult;
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

	let moderation: ModeratorRunResult | undefined;
	if (payload.feedId && payload.userId) {
		moderation = await moderator.run(payload);
		results[moderator.id] = moderation;

		if (moderation.level !== 'ok') {
			return {
				moderation,
				agentIds: [],
				results,
				usage: { orchestration: [], agents: {} },
			};
		}
	}

	const { agents: selected, usage: orchestrationUsage } = await selectAgents(payload);

	for (const agent of selected) {
		const result = await agent.run(payload);
		results[agent.id] = result;
		agentUsage[agent.id] = extractAgentUsage(result);
	}

	return {
		moderation,
		agentIds: selected.map((agent) => agent.id),
		results,
		usage: {
			orchestration: orchestrationUsage,
			agents: agentUsage,
		},
	};
}
