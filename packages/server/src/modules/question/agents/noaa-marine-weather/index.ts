import chalk from 'chalk';
import ora from 'ora';
import { getOpenAIClient } from '../../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../../lib/services/log';
import type { AgentRunPayload } from '../../types';
import { resolveCoordinates, type ResolvedCoordinates } from './geocode';
import { getMarineForecast, type MarineForecastResult } from './noaa';
import { ANSWER_INSTRUCTIONS, ANSWER_MAX_LENGTH, ANSWER_MODEL, use } from './prompts';

export { use } from './prompts';

export const id = 'nmw';
export const title = 'NOAA Marine Weather';

export interface MarineWeatherRunResult extends MarineForecastResult {
	location: ResolvedCoordinates;
	answer: string;
}

async function answerQuestion(
	forecast: MarineForecastResult,
	location: ResolvedCoordinates,
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
				location,
				entry: payload.contributor?.entry ?? payload.context,
				user: payload.contributor?.user ?? null,
				forecast: {
					relativeLocation: forecast.relativeLocation,
					nearshore: {
						zoneId: forecast.nearshore.zoneId,
						zoneName: forecast.nearshore.zoneName,
						issuedAt: forecast.nearshore.issuedAt,
						text: forecast.nearshore.text,
						parsedForecast: forecast.nearshore.parsedForecast,
					},
					offshore: forecast.offshore
						? {
								zoneId: forecast.offshore.zoneId,
								zoneName: forecast.offshore.zoneName,
								issuedAt: forecast.offshore.issuedAt,
								text: forecast.offshore.text,
								parsedForecast: forecast.offshore.parsedForecast,
							}
						: null,
					notes: forecast.notes,
				},
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

export async function run(payload: AgentRunPayload): Promise<MarineWeatherRunResult> {
	const locationSpinner = ora('Resolving location').start();
	let location: ResolvedCoordinates;

	try {
		location = await resolveCoordinates(payload);
		locationSpinner.succeed(
			location.label
				? `Location resolved: ${location.label}`
				: `Location resolved: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
		);
	} catch (error) {
		locationSpinner.fail('Failed to resolve location');
		throw error;
	}

	const forecastSpinner = ora('Loading NOAA marine forecast').start();
	let forecast: MarineForecastResult;

	try {
		forecast = await getMarineForecast(location.latitude, location.longitude);
		forecastSpinner.succeed('NOAA marine forecast loaded');
	} catch (error) {
		forecastSpinner.fail('Failed to load NOAA marine forecast');
		throw error;
	}

	const { answer, usage: answerUsage } = await answerQuestion(forecast, location, payload);
	const usage = [...forecast.usage, ...answerUsage];

	console.log(chalk.green('\nResolved location:'));
	console.log(chalk.green(JSON.stringify(location, null, 2)));
	console.log(chalk.green('\nMarine forecast:'));
	console.log(
		chalk.green(
			JSON.stringify(
				{
					relativeLocation: forecast.relativeLocation,
					nearshore: forecast.nearshore,
					offshore: forecast.offshore,
					notes: forecast.notes,
				},
				null,
				2,
			),
		),
	);
	console.log(chalk.green('\nAnswer:'));
	console.log(chalk.green(answer));

	return {
		...forecast,
		location,
		answer,
		usage,
	};
}
