import * as bwfishEvaluator from './bwfish-evaluator';
import * as bwfishPublisher from './bwfish-publisher';
import * as moderator from './moderator';
import type { Agent } from '../types';

export type { Agent, AgentRunPayload } from '../types';

export const managers: Agent[] = [moderator as Agent, bwfishEvaluator as Agent, bwfishPublisher as Agent];

export function getManager(id: string): Agent | undefined {
	return managers.find((manager) => manager.id === id);
}

export { bwfishEvaluator, bwfishPublisher, moderator };
