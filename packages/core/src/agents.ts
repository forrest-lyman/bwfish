export interface AgentInfo {
  id: string;
  title: string;
}

export const agents: AgentInfo[] = [
  { id: "pbr", title: "Pacific Northwest Bar Reporter - USCG" },
  { id: "nmw", title: "Marine Weather - NOAA" },
  { id: "ntd", title: "NOAA Tides" },
  { id: "bwfish-publisher", title: "BWFish Publisher" },
];

export function getAgent(id: string): AgentInfo | undefined {
  return agents.find((agent) => agent.id === id);
}
