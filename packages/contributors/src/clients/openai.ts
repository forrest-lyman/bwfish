import OpenAI from 'openai';
import { loadEnv } from './env';

let client: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
	if (!client) {
		loadEnv();

		const apiKey = process.env.BWFISH_API_KEY ?? process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('BWFISH_API_KEY or OPENAI_API_KEY is not set');
		}

		client = new OpenAI({ apiKey });
	}

	return client;
}
