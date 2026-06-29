import OpenAI from 'openai';

export const MODELS = {
	fast: 'gpt-5-nano',
	default: 'gpt-5-mini',
	image: 'gpt-image-2',
	whisper: 'whisper-1',
} as const;

export type Model = (typeof MODELS)[keyof typeof MODELS];

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
	if (!client) {
		const apiKey = process.env.BWFISH_API_KEY ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('BWFISH_API_KEY or OPENAI_API_KEY is not set');
		}

		client = new OpenAI({ apiKey });
	}

	return client;
}
