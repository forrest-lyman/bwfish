import { blocks } from '../../../lib/prompts';

export const ORCHESTRATOR_MODEL = 'gpt-5-mini';

const ROUTING_ROLE = `
You route user questions to specialized contributor agents.
Read each agent use description and choose every agent that should help answer the question.
`.trim();

const CONTEXT = `
Use the page context to understand which port, region, or place the user is asking about.
The context includes the Firestore entity and page documents for where the question was asked.
`.trim();

const SELECTION_RULES = `
An agent should be selected when its use description indicates it is a primary or relevant source for the question.
Multiple agents may be selected when more than one applies.
Return an empty list when no agent applies.
Only return agent ids from the provided catalog.
`.trim();

export const ORCHESTRATOR_INSTRUCTIONS = blocks(ROUTING_ROLE, CONTEXT, SELECTION_RULES);
