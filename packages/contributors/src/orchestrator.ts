import { getOpenAIClient } from './clients/openai';
import { agents, getAgent, type Agent } from './agents';
import type { AgentRunPayload } from './agents/types';
import { instructions, ORCHESTRATOR_INSTRUCTIONS, ORCHESTRATOR_MODEL } from './orchestrator/prompts';

export { ORCHESTRATOR_INSTRUCTIONS, ORCHESTRATOR_MODEL } from './orchestrator/prompts';
export type { AgentRunPayload, RefContext } from './agents/types';

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
	agentIds: string[];
	results: Record<string, unknown>;
}

function agentCatalog(): { id: string; title: string; use: string }[] {
	return agents.map((agent) => ({
		id: agent.id,
		title: agent.title,
		use: agent.use.trim(),
	}));
}

export async function selectAgents(payload: AgentRunPayload): Promise<Agent[]> {
	if (agents.length === 0) {
		return [];
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

	return agentIds
		.filter((id) => validIds.has(id))
		.map((id) => getAgent(id))
		.filter((agent): agent is Agent => agent !== undefined);
}

export async function orchestrate(payload: AgentRunPayload): Promise<OrchestratorRunResult> {
	const selected = await selectAgents(payload);
	const results: Record<string, unknown> = {};

	for (const agent of selected) {
		results[agent.id] = await agent.run(payload);
	}

	return {
		agentIds: selected.map((agent) => agent.id),
		results,
	};
}
