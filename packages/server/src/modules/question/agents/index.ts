import * as noaaMarineWeather from './noaa-marine-weather';
import * as pnwBarReport from './pnw-bar-report';
import type { Agent } from '../types';

export type { Agent, AgentRunPayload } from '../types';

export const agents: Agent[] = [pnwBarReport as Agent, noaaMarineWeather as Agent];

export function getAgent(id: string): Agent | undefined {
	return agents.find((agent) => agent.id === id);
}
