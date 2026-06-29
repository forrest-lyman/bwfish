import { getOpenAIClient } from '../../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../../lib/services/log';
import { PERIOD_INSTRUCTIONS, PERIOD_MODEL } from './prompts';

const MAX_PERIOD_DAYS = 14;

export interface QuestionPeriod {
	beginDate: string;
	endDate: string;
	label: string;
}

const questionPeriodSchema = {
	type: 'object',
	properties: {
		beginDate: { type: 'string' },
		endDate: { type: 'string' },
		label: { type: 'string' },
	},
	required: ['beginDate', 'endDate', 'label'],
	additionalProperties: false,
} as const;

function parseIsoDate(value: string, field: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error(`Invalid ${field} from period resolver: ${value}`);
	}

	return value;
}

function addDays(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T12:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function daySpan(beginDate: string, endDate: string): number {
	const begin = new Date(`${beginDate}T12:00:00.000Z`).getTime();
	const end = new Date(`${endDate}T12:00:00.000Z`).getTime();
	return Math.round((end - begin) / (24 * 60 * 60 * 1000));
}

function clampPeriod(period: QuestionPeriod, today: string): QuestionPeriod {
	let beginDate = parseIsoDate(period.beginDate, 'beginDate');
	let endDate = parseIsoDate(period.endDate, 'endDate');

	if (endDate < beginDate) {
		[endDate, beginDate] = [beginDate, endDate];
	}

	if (daySpan(beginDate, endDate) > MAX_PERIOD_DAYS - 1) {
		endDate = addDays(beginDate, MAX_PERIOD_DAYS - 1);
	}

	if (beginDate < today) {
		beginDate = today;
	}

	if (endDate < beginDate) {
		endDate = beginDate;
	}

	return {
		beginDate,
		endDate,
		label: period.label.trim() || `${beginDate} through ${endDate}`,
	};
}

export async function resolveQuestionPeriod(
	message: string,
): Promise<{ period: QuestionPeriod; usage: LogUsage[] }> {
	const today = new Date().toISOString().slice(0, 10);
	const openai = getOpenAIClient();

	const response = await openai.responses.create({
		model: PERIOD_MODEL,
		instructions: PERIOD_INSTRUCTIONS,
		input: JSON.stringify({
			question: message,
			today,
			maxDays: MAX_PERIOD_DAYS,
		}),
		text: {
			format: {
				type: 'json_schema',
				name: 'question_period',
				strict: true,
				schema: questionPeriodSchema,
			},
		},
	});

	const parsed = JSON.parse(response.output_text) as QuestionPeriod;
	const usage = toLogUsage(response.usage, PERIOD_MODEL);

	return {
		period: clampPeriod(parsed, today),
		usage: usage ? [usage] : [],
	};
}
