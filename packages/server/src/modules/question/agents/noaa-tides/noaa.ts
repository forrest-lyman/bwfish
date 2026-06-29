import type { LogUsage } from '../../../../lib/services/log';
import { cacheFn } from '../../cache';

const MDAPI_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi';
const DATA_API_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const DEFAULT_USER_AGENT = '(bwfish.ai, contact@bwfish.ai)';
const STATIONS_CACHE_DURATION = 7 * 24 * 60 * 60;
const PREDICTIONS_CACHE_DURATION = 60 * 60;
const MAX_STATION_DISTANCE_NM = 75;

interface TideStationRecord {
	id: string;
	name: string;
	lat: number;
	lng: number;
	state?: string;
	type?: string;
}

interface StationsResponse {
	stations?: TideStationRecord[];
}

export interface TideStation {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	state: string | null;
	distanceNm: number;
}

export interface TideEvent {
	time: string;
	heightFt: number;
	type: 'H' | 'L';
}

export interface TidePredictionsResult {
	station: TideStation;
	datum: 'MLLW';
	timeZone: 'lst_ldt';
	beginDate: string;
	endDate: string;
	predictions: TideEvent[];
	usage: LogUsage[];
}

async function loadTidePredictionStations(): Promise<TideStationRecord[]> {
	return cacheFn(
		'noaa-tides/stations',
		async () => {
			const response = await fetchJson<StationsResponse>(
				`${MDAPI_BASE_URL}/stations.json?type=tidepredictions`,
			);
			return response.stations ?? [];
		},
		{ duration: STATIONS_CACHE_DURATION },
	);
}

export async function findNearestTideStation(
	latitude: number,
	longitude: number,
): Promise<TideStation> {
	const stations = await loadTidePredictionStations();
	let nearest: TideStation | null = null;

	for (const station of stations) {
		const distanceNm = haversineDistanceNm(latitude, longitude, station.lat, station.lng);
		if (!nearest || distanceNm < nearest.distanceNm) {
			nearest = {
				id: station.id,
				name: station.name,
				latitude: station.lat,
				longitude: station.lng,
				state: station.state ?? null,
				distanceNm: roundToSingleDecimal(distanceNm),
			};
		}
	}

	if (!nearest) {
		throw new Error('NOAA did not return any tide prediction stations.');
	}

	if (nearest.distanceNm > MAX_STATION_DISTANCE_NM) {
		throw new Error(
			`The nearest NOAA tide station (${nearest.name}) is ${nearest.distanceNm} NM away, which is farther than this agent supports. Try asking from a coastal port or region page.`,
		);
	}

	return nearest;
}

export async function getTidePredictions(
	station: TideStation,
	beginDate: string,
	endDate: string,
): Promise<Omit<TidePredictionsResult, 'usage'>> {
	const cacheKey = `noaa-tides/predictions/${station.id}/${beginDate}/${endDate}`;

	return cacheFn(
		cacheKey,
		async () => {
			const url = new URL(DATA_API_BASE_URL);
			url.searchParams.set('product', 'predictions');
			url.searchParams.set('application', 'bwfish');
			url.searchParams.set('format', 'json');
			url.searchParams.set('datum', 'MLLW');
			url.searchParams.set('station', station.id);
			url.searchParams.set('begin_date', formatApiDate(beginDate));
			url.searchParams.set('end_date', formatApiDate(endDate));
			url.searchParams.set('units', 'english');
			url.searchParams.set('time_zone', 'lst_ldt');
			url.searchParams.set('interval', 'hilo');

			const response = await fetchJson<{ predictions?: Array<{ t: string; v: string; type: string }> }>(
				url.toString(),
			);

			const predictions = (response.predictions ?? []).map((event) => ({
				time: event.t,
				heightFt: Number.parseFloat(event.v),
				type: event.type === 'L' ? ('L' as const) : ('H' as const),
			}));

			if (predictions.length === 0) {
				throw new Error(
					`NOAA returned no tide predictions for ${station.name} between ${beginDate} and ${endDate}.`,
				);
			}

			return {
				station,
				datum: 'MLLW',
				timeZone: 'lst_ldt',
				beginDate,
				endDate,
				predictions,
			};
		},
		{ duration: PREDICTIONS_CACHE_DURATION },
	);
}

function formatApiDate(isoDate: string): string {
	return isoDate.replaceAll('-', '');
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, {
		headers: {
			Accept: 'application/json',
			'User-Agent': process.env.NOAA_USER_AGENT ?? DEFAULT_USER_AGENT,
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`NOAA request failed for ${url}: ${response.status} ${response.statusText}. ${body}`);
	}

	return (await response.json()) as T;
}

function haversineDistanceNm(
	latitudeA: number,
	longitudeA: number,
	latitudeB: number,
	longitudeB: number,
): number {
	const toRadians = (value: number) => (value * Math.PI) / 180;
	const earthRadiusKm = 6371;
	const deltaLatitude = toRadians(latitudeB - latitudeA);
	const deltaLongitude = toRadians(longitudeB - longitudeA);
	const latitudeARadians = toRadians(latitudeA);
	const latitudeBRadians = toRadians(latitudeB);

	const a =
		Math.sin(deltaLatitude / 2) ** 2 +
		Math.cos(latitudeARadians) * Math.cos(latitudeBRadians) * Math.sin(deltaLongitude / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const kilometers = earthRadiusKm * c;

	return kilometers * 0.539957;
}

function roundToSingleDecimal(value: number): number {
	return Math.round(value * 10) / 10;
}
