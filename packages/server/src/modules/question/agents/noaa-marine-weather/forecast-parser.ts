import { getOpenAIClient } from '../../../../lib/clients/openai';
import { toLogUsage, type LogUsage } from '../../../../lib/services/log';
import { PARSE_INSTRUCTIONS, PARSE_MODEL } from './prompts';

const DIRECTION_VALUES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const WAVE_TYPES = ['primary-swell', 'secondary-swell', 'tertiary-swell', 'wind-wave'] as const;

export interface WaveComponent {
	type: (typeof WAVE_TYPES)[number];
	direction?: (typeof DIRECTION_VALUES)[number];
	heightFt?: number;
	periodSec?: number;
}

export interface ForecastDay {
	name: string;
	date?: string;
	wind?: {
		direction?: (typeof DIRECTION_VALUES)[number];
		minKt?: number;
		maxKt?: number;
	};
	waves?: WaveComponent[];
	visibility?: string;
	weather?: string[];
}

export interface ParsedForecast {
	generatedAt: string;
	days: ForecastDay[];
}

const parsedForecastSchema = {
	type: 'object',
	properties: {
		days: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					date: { type: ['string', 'null'] },
					wind: {
						type: ['object', 'null'],
						properties: {
							direction: { type: ['string', 'null'], enum: [...DIRECTION_VALUES, null] },
							minKt: { type: ['number', 'null'] },
							maxKt: { type: ['number', 'null'] },
						},
						required: ['direction', 'minKt', 'maxKt'],
						additionalProperties: false,
					},
					waves: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								type: { type: 'string', enum: [...WAVE_TYPES] },
								direction: { type: ['string', 'null'], enum: [...DIRECTION_VALUES, null] },
								heightFt: { type: ['number', 'null'] },
								periodSec: { type: ['number', 'null'] },
							},
							required: ['type', 'direction', 'heightFt', 'periodSec'],
							additionalProperties: false,
						},
					},
					visibility: { type: ['string', 'null'] },
					weather: {
						type: 'array',
						items: { type: 'string' },
					},
				},
				required: ['name', 'date', 'wind', 'waves', 'visibility', 'weather'],
				additionalProperties: false,
			},
		},
	},
	required: ['days'],
	additionalProperties: false,
} as const;

interface ApiWaveComponent {
	type: (typeof WAVE_TYPES)[number];
	direction: (typeof DIRECTION_VALUES)[number] | null;
	heightFt: number | null;
	periodSec: number | null;
}

interface ApiForecastDay {
	name: string;
	date: string | null;
	wind: {
		direction: (typeof DIRECTION_VALUES)[number] | null;
		minKt: number | null;
		maxKt: number | null;
	} | null;
	waves: ApiWaveComponent[];
	visibility: string | null;
	weather: string[];
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function normalizeWaveComponent(wave: ApiWaveComponent): WaveComponent {
	return stripUndefined({
		type: wave.type,
		direction: wave.direction ?? undefined,
		heightFt: wave.heightFt ?? undefined,
		periodSec: wave.periodSec ?? undefined,
	});
}

function normalizeForecastDay(day: ApiForecastDay): ForecastDay {
	return stripUndefined({
		name: day.name,
		date: day.date ?? undefined,
		wind: day.wind
			? stripUndefined({
					direction: day.wind.direction ?? undefined,
					minKt: day.wind.minKt ?? undefined,
					maxKt: day.wind.maxKt ?? undefined,
				})
			: undefined,
		waves: day.waves.length > 0 ? day.waves.map(normalizeWaveComponent) : undefined,
		visibility: day.visibility ?? undefined,
		weather: day.weather.length > 0 ? day.weather : undefined,
	});
}

export async function parseForecast(forecast: string): Promise<{ parsedForecast: ParsedForecast; usage: LogUsage[] }> {
	const openai = getOpenAIClient();
	const response = await openai.responses.create({
		model: PARSE_MODEL,
		instructions: PARSE_INSTRUCTIONS,
		input: `Extract structured marine forecast data from this NOAA forecast:\n\n${forecast}`,
		text: {
			format: {
				type: 'json_schema',
				name: 'marine_forecast',
				strict: true,
				schema: parsedForecastSchema,
			},
		},
	});

	const { days } = JSON.parse(response.output_text) as { days: ApiForecastDay[] };
	const usage = toLogUsage(response.usage, PARSE_MODEL);

	return {
		parsedForecast: {
			generatedAt: new Date().toISOString(),
			days: days.map(normalizeForecastDay),
		},
		usage: usage ? [usage] : [],
	};
}
