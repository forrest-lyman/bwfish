import chalk from 'chalk';
import ora from 'ora';
import { cacheFn } from '../../cache';
import { getOpenAIClient } from '../../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../../lib/services/log';
import type { AgentRunPayload } from '../../types';
import {
	ANSWER_INSTRUCTIONS,
	ANSWER_MAX_LENGTH,
	ANSWER_MODEL,
	PARSE_INSTRUCTIONS,
	PARSE_MODEL,
	use,
} from './prompts';

export { use } from './prompts';

export const id = 'pbr';
export const title = 'Pacific Northwest Bar Reporter - USCG';

const ALLBARS_URL = 'https://www.weather.gov/pqr/allbars';
const ALLBARS_XML_URL = 'https://www.weather.gov/source/pqr/barcams/AllBars.xml';
const REPORTS_CACHE_KEY = 'pnw-bar-report/reports';
const REPORTS_CACHE_DURATION = 15 * 60; // 15 minutes

export interface BarReport {
	name: string;
	reportTime: string;
	status: string;
	restrictions: string;
	conditions: string;
}

export interface BarReportsResult {
	source: string;
	fetchedAt: string;
	reports: BarReport[];
	usage: LogUsage[];
}

export interface BarReportRunResult extends BarReportsResult {
	answer: string;
}

const barReportsSchema = {
	type: 'object',
	properties: {
		reports: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					reportTime: { type: 'string' },
					status: { type: 'string' },
					restrictions: { type: 'string' },
					conditions: { type: 'string' },
				},
				required: ['name', 'reportTime', 'status', 'restrictions', 'conditions'],
				additionalProperties: false,
			},
		},
	},
	required: ['reports'],
	additionalProperties: false,
} as const;

async function loadSource(): Promise<string> {
	const loadSpinner = ora('Loading bar report source').start();

	try {
		const pageResponse = await fetch(ALLBARS_URL);
		if (!pageResponse.ok) {
			throw new Error(`Failed to fetch ${ALLBARS_URL}: ${pageResponse.status}`);
		}

		// The page renders bar data client-side from AllBars.xml.
		const xmlResponse = await fetch(ALLBARS_XML_URL);
		if (!xmlResponse.ok) {
			throw new Error(`Failed to fetch ${ALLBARS_XML_URL}: ${xmlResponse.status}`);
		}

		const xml = await xmlResponse.text();
		loadSpinner.succeed('Bar report source loaded');
		return xml;
	} catch (error) {
		loadSpinner.fail('Failed to load bar report source');
		throw error;
	}
}

async function parseReports(xml: string): Promise<{ reports: BarReport[]; usage: LogUsage[] }> {
	const parseSpinner = ora('Understanding report data').start();
	const openai = getOpenAIClient();

	try {
		const response = await openai.responses.create({
			model: PARSE_MODEL,
			instructions: PARSE_INSTRUCTIONS,
			input: xml,
			text: {
				format: {
					type: 'json_schema',
					name: 'bar_reports',
					strict: true,
					schema: barReportsSchema,
				},
			},
		});

		const { reports } = JSON.parse(response.output_text) as { reports: BarReport[] };
		const usage = toLogUsage(response.usage, PARSE_MODEL);
		parseSpinner.succeed('Report data understood');
		return { reports, usage: usage ? [usage] : [] };
	} catch (error) {
		parseSpinner.fail('Failed to understand report data');
		throw error;
	}
}

async function answerQuestion(
	reports: BarReport[],
	payload: AgentRunPayload,
): Promise<{ answer: string; usage: LogUsage[] }> {
	const answerSpinner = ora('Answering your question').start();
	const openai = getOpenAIClient();

	try {
		const response = await openai.responses.create({
			model: ANSWER_MODEL,
			instructions: ANSWER_INSTRUCTIONS,
			input: JSON.stringify({
				question: payload.message,
				entry: payload.contributor?.entry ?? payload.context,
				user: payload.contributor?.user ?? null,
				reports,
			}),
		});

		const answer = response.output_text.trim().slice(0, ANSWER_MAX_LENGTH);
		const usage = toLogUsage(response.usage, ANSWER_MODEL);
		answerSpinner.succeed('Answer ready');
		return { answer, usage: usage ? [usage] : [] };
	} catch (error) {
		answerSpinner.fail('Failed to answer question');
		throw error;
	}
}

async function loadProcessedReports(): Promise<BarReportsResult> {
	return cacheFn(
		REPORTS_CACHE_KEY,
		async () => {
			const xml = await loadSource();
			const { reports, usage } = await parseReports(xml);

			return {
				source: ALLBARS_URL,
				fetchedAt: new Date().toISOString(),
				reports,
				usage,
			};
		},
		{ duration: REPORTS_CACHE_DURATION },
	);
}

export async function run(payload: AgentRunPayload): Promise<BarReportRunResult> {
	const parsed = await loadProcessedReports();
	const { answer, usage: answerUsage } = await answerQuestion(parsed.reports, payload);
	const usage = [...(parsed.usage ?? []), ...answerUsage];

	console.log(chalk.green('\nParsed report data:'));
	console.log(chalk.green(JSON.stringify(parsed, null, 2)));
	console.log(chalk.green('\nAnswer:'));
	console.log(chalk.green(answer));

	return { ...parsed, answer, usage };
}
