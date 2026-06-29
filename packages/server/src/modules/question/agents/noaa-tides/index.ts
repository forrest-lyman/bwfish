import chalk from 'chalk';
import ora from 'ora';
import { getOpenAIClient } from '../../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../../lib/services/log';
import type { AgentRunPayload } from '../../types';
import { resolveCoordinates, type ResolvedCoordinates } from '../noaa-marine-weather/geocode';
import { findNearestTideStation, getTidePredictions, type TidePredictionsResult } from './noaa';
import { resolveQuestionPeriod, type QuestionPeriod } from './period';
import { ANSWER_INSTRUCTIONS, ANSWER_MAX_LENGTH, ANSWER_MODEL, use } from './prompts';

export { use } from './prompts';

export const id = 'ntd';
export const title = 'NOAA Tides';

export interface TideRunResult extends TidePredictionsResult {
	location: ResolvedCoordinates;
	period: QuestionPeriod;
	answer: string;
}

async function answerQuestion(
	tides: Omit<TidePredictionsResult, 'usage'>,
	location: ResolvedCoordinates,
	period: QuestionPeriod,
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
				period,
				station: tides.station,
				datum: tides.datum,
				timeZone: tides.timeZone,
				predictions: tides.predictions,
				entry: payload.contributor?.entry ?? payload.context,
				user: payload.contributor?.user ?? null,
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

export async function run(payload: AgentRunPayload): Promise<TideRunResult> {
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

	const periodSpinner = ora('Determining question period').start();
	let period: QuestionPeriod;
	let periodUsage: LogUsage[];

	try {
		const resolved = await resolveQuestionPeriod(payload.message);
		period = resolved.period;
		periodUsage = resolved.usage;
		periodSpinner.succeed(`Question period: ${period.label}`);
	} catch (error) {
		periodSpinner.fail('Failed to determine question period');
		throw error;
	}

	const stationSpinner = ora('Finding nearest NOAA tide station').start();
	let station;

	try {
		station = await findNearestTideStation(location.latitude, location.longitude);
		stationSpinner.succeed(`Tide station: ${station.name} (${station.distanceNm} NM)`);
	} catch (error) {
		stationSpinner.fail('Failed to find NOAA tide station');
		throw error;
	}

	const tidesSpinner = ora('Loading NOAA tide predictions').start();
	let tides: Omit<TidePredictionsResult, 'usage'>;

	try {
		tides = await getTidePredictions(station, period.beginDate, period.endDate);
		tidesSpinner.succeed('NOAA tide predictions loaded');
	} catch (error) {
		tidesSpinner.fail('Failed to load NOAA tide predictions');
		throw error;
	}

	const { answer, usage: answerUsage } = await answerQuestion(tides, location, period, payload);
	const usage = [...periodUsage, ...answerUsage];

	console.log(chalk.green('\nResolved location:'));
	console.log(chalk.green(JSON.stringify(location, null, 2)));
	console.log(chalk.green('\nQuestion period:'));
	console.log(chalk.green(JSON.stringify(period, null, 2)));
	console.log(chalk.green('\nTide predictions:'));
	console.log(chalk.green(JSON.stringify({ station: tides.station, predictions: tides.predictions }, null, 2)));
	console.log(chalk.green('\nAnswer:'));
	console.log(chalk.green(answer));

	return {
		...tides,
		location,
		period,
		answer,
		usage,
	};
}
