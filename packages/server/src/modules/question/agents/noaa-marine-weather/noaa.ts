import { createHash } from 'node:crypto';
import type { LogUsage } from '../../../../lib/services/log';
import { cacheFn } from '../../cache';
import { parseForecast, type ParsedForecast } from './forecast-parser';

const NOAA_API_BASE_URL = 'https://api.weather.gov';
const DEFAULT_USER_AGENT = '(bwfish.ai, contact@bwfish.ai)';
const MARINE_ZONE_ID_PATTERN = /^[A-Z]{2,3}Z\d{3}$/;
const SAMPLE_BEARINGS_DEGREES = [0, 45, 90, 135, 180, 225, 270, 315];
const SAMPLE_RADII_NM = [0, 6, 12, 24, 40, 60];
const FORECAST_LOOKUP_CACHE_DURATION = 30 * 60;
const PARSED_FORECAST_CACHE_DURATION = 24 * 60 * 60;

type MarineZoneKind = 'nearshore' | 'offshore';

interface PointResponse {
	properties?: {
		forecastOffice?: string | null;
		forecastZone?: string | null;
		relativeLocation?: {
			properties?: {
				city?: string | null;
				state?: string | null;
			};
		};
	};
}

interface ZoneResponse {
	properties?: {
		id?: string | null;
		name?: string | null;
	};
}

interface ProductListResponse {
	'@graph'?: Array<{
		id?: string | null;
	}>;
}

interface ProductResponse {
	id?: string | null;
	issuingOffice?: string | null;
	productCode?: string | null;
	productText?: string | null;
	issuanceTime?: string | null;
}

interface ZoneCandidate {
	id: string;
	name: string;
	officeCode: string;
	distanceNm: number;
	kind: MarineZoneKind;
}

export interface ForecastSection {
	zoneId: string;
	zoneName: string;
	officeCode: string;
	distanceNm: number;
	issuedAt: string | null;
	text: string;
	parsedForecast: ParsedForecast | null;
	parseError: string | null;
}

export interface MarineForecastResult {
	requestedCoordinates: {
		latitude: number;
		longitude: number;
	};
	relativeLocation: string | null;
	nearshore: ForecastSection;
	offshore: ForecastSection | null;
	notes: string[];
	usage: LogUsage[];
}

interface CachedForecastLookup {
	bucket: string;
	forecast: string;
	createdAt: string;
	zoneId: string;
	officeCode: string;
	issuedAt: string | null;
	kind: MarineZoneKind;
}

function hashValue(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function getCoordinateBucket(latitude: number, longitude: number): string {
	const latBucket = Math.round(latitude * 10) / 10;
	const lonBucket = Math.round(longitude * 10) / 10;
	return `${latBucket.toFixed(1)}:${lonBucket.toFixed(1)}`;
}

function getLookupCacheKey(latitude: number, longitude: number, kind: MarineZoneKind): string {
	return `noaa-marine-weather/lookup/${getCoordinateBucket(latitude, longitude)}:${kind}`;
}

export async function getMarineForecast(latitude: number, longitude: number): Promise<MarineForecastResult> {
	const point = await fetchPoint(latitude, longitude);
	const relativeLocation = formatRelativeLocation(point);
	const zones = await discoverMarineZones(latitude, longitude);

	const nearshoreCandidate = zones.find((zone) => zone.kind === 'nearshore');
	const offshoreCandidate = zones.find((zone) => zone.kind === 'offshore') ?? null;

	if (!nearshoreCandidate) {
		throw new Error(
			'No nearby NOAA nearshore marine zone was found for these coordinates. Try a point closer to the coast or over navigable waters.',
		);
	}

	const nearshoreResult = await loadForecastSection(nearshoreCandidate, latitude, longitude);
	const offshoreResult = offshoreCandidate
		? await loadForecastSection(offshoreCandidate, latitude, longitude)
		: null;

	const nearshore = nearshoreResult.section;
	const offshore = offshoreResult?.section ?? null;
	const usage = [...nearshoreResult.usage, ...(offshoreResult?.usage ?? [])];

	const notes = offshore
		? []
		: [
				'No separate offshore bulletin section was found within the search radius; the response includes the nearest nearshore marine forecast only.',
			];

	if (nearshore.parseError) {
		notes.push(`Nearshore forecast parsing failed: ${nearshore.parseError}`);
	}

	if (offshore?.parseError) {
		notes.push(`Offshore forecast parsing failed: ${offshore.parseError}`);
	}

	return {
		requestedCoordinates: { latitude, longitude },
		relativeLocation,
		nearshore,
		offshore,
		notes,
		usage,
	};
}

async function discoverMarineZones(latitude: number, longitude: number): Promise<ZoneCandidate[]> {
	const candidates = new Map<string, Omit<ZoneCandidate, 'name' | 'kind'>>();
	const zoneDetails = new Map<string, { name: string; kind: MarineZoneKind | null }>();

	for (const radiusNm of SAMPLE_RADII_NM) {
		const samplePoints =
			radiusNm === 0
				? [{ latitude, longitude }]
				: SAMPLE_BEARINGS_DEGREES.map((bearing) =>
						offsetCoordinate(latitude, longitude, radiusNm, bearing),
					);

		const points = await Promise.all(samplePoints.map((point) => fetchPoint(point.latitude, point.longitude)));

		const unseenZoneIds = new Set<string>();

		for (const point of points) {
			const zoneId = lastPathSegment(point.properties?.forecastZone);
			const officeCode = lastPathSegment(point.properties?.forecastOffice);

			if (!zoneId || !officeCode || !MARINE_ZONE_ID_PATTERN.test(zoneId)) {
				continue;
			}

			unseenZoneIds.add(zoneId);

			const distanceNm = haversineDistanceNm(latitude, longitude, point.latitude, point.longitude);
			const existing = candidates.get(zoneId);

			if (!existing || distanceNm < existing.distanceNm) {
				candidates.set(zoneId, {
					id: zoneId,
					officeCode,
					distanceNm,
				});
			}
		}

		const detailIds = [...unseenZoneIds].filter((zoneId) => !zoneDetails.has(zoneId));
		const fetchedDetails = await Promise.all(detailIds.map((zoneId) => fetchZoneDetail(zoneId)));

		for (const detail of fetchedDetails) {
			zoneDetails.set(detail.id, {
				name: detail.name,
				kind: classifyMarineZone(detail.name),
			});
		}

		const resolved = materializeCandidates(candidates, zoneDetails);
		const hasNearshore = resolved.some((zone) => zone.kind === 'nearshore');
		const hasOffshore = resolved.some((zone) => zone.kind === 'offshore');

		if (hasNearshore && hasOffshore) {
			return resolved;
		}
	}

	return materializeCandidates(candidates, zoneDetails);
}

function materializeCandidates(
	candidates: Map<string, Omit<ZoneCandidate, 'name' | 'kind'>>,
	zoneDetails: Map<string, { name: string; kind: MarineZoneKind | null }>,
): ZoneCandidate[] {
	return [...candidates.values()]
		.map((candidate) => {
			const detail = zoneDetails.get(candidate.id);
			if (!detail?.kind) {
				return null;
			}

			return {
				...candidate,
				name: detail.name,
				kind: detail.kind,
			} satisfies ZoneCandidate;
		})
		.filter((candidate): candidate is ZoneCandidate => candidate !== null)
		.sort((left, right) => left.distanceNm - right.distanceNm);
}

async function loadForecastSection(
	candidate: ZoneCandidate,
	latitude: number,
	longitude: number,
): Promise<{ section: ForecastSection; usage: LogUsage[] }> {
	const lookupCacheKey = getLookupCacheKey(latitude, longitude, candidate.kind);
	const lookup = await loadForecastLookup(lookupCacheKey, candidate, latitude, longitude);
	const parseResult = await parseForecastSection(lookup.forecast);

	return {
		section: {
			zoneId: candidate.id,
			zoneName: candidate.name,
			officeCode: candidate.officeCode,
			distanceNm: roundToSingleDecimal(candidate.distanceNm),
			issuedAt: lookup.issuedAt,
			text: lookup.forecast,
			parsedForecast: parseResult.parsedForecast,
			parseError: parseResult.parseError,
		},
		usage: parseResult.usage,
	};
}

async function loadForecastLookup(
	cacheKey: string,
	candidate: ZoneCandidate,
	latitude: number,
	longitude: number,
): Promise<CachedForecastLookup> {
	return cacheFn(
		cacheKey,
		async () => {
			const product = await fetchLatestCoastalWatersForecast(candidate.officeCode);
			const forecast = extractZoneSection(product.productText ?? '', candidate.id);
			const issuedAt = product.issuanceTime ?? null;

			if (!forecast) {
				throw new Error(
					`NOAA published a coastal waters bulletin for ${candidate.officeCode}, but no section for zone ${candidate.id} was found in the latest product.`,
				);
			}

			return {
				bucket: getCoordinateBucket(latitude, longitude),
				forecast,
				createdAt: new Date().toISOString(),
				zoneId: candidate.id,
				officeCode: candidate.officeCode,
				issuedAt,
				kind: candidate.kind,
			};
		},
		{ duration: FORECAST_LOOKUP_CACHE_DURATION },
	);
}

async function fetchLatestCoastalWatersForecast(officeCode: string): Promise<ProductResponse> {
	const productList = await fetchJson<ProductListResponse>(
		`${NOAA_API_BASE_URL}/products/types/CWF/locations/${officeCode}`,
	);
	const productId = productList['@graph']?.[0]?.id;

	if (!productId) {
		throw new Error(`NOAA did not return a coastal waters forecast bulletin for office ${officeCode}.`);
	}

	return fetchJson<ProductResponse>(`${NOAA_API_BASE_URL}/products/${productId}`);
}

async function fetchZoneDetail(zoneId: string): Promise<{ id: string; name: string }> {
	const response = await fetchJson<ZoneResponse>(`${NOAA_API_BASE_URL}/zones/forecast/${zoneId}`);
	const id = response.properties?.id ?? zoneId;
	const name = response.properties?.name?.trim();

	if (!name) {
		throw new Error(`NOAA did not return a usable name for marine zone ${zoneId}.`);
	}

	return { id, name };
}

async function fetchPoint(
	latitude: number,
	longitude: number,
): Promise<PointResponse & { latitude: number; longitude: number }> {
	const response = await fetchJson<PointResponse>(
		`${NOAA_API_BASE_URL}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
	);

	return {
		...response,
		latitude,
		longitude,
	};
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, {
		headers: {
			Accept: 'application/geo+json, application/ld+json, application/json',
			'User-Agent': process.env.NOAA_USER_AGENT ?? DEFAULT_USER_AGENT,
		},
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`NOAA request failed for ${url}: ${response.status} ${response.statusText}. ${body}`);
	}

	return (await response.json()) as T;
}

function classifyMarineZone(name: string): MarineZoneKind | null {
	if (/(^|\b)(offshore waters|waters from .* from \d+ to \d+ nm|from \d+ to \d+ nm)(\b|$)/i.test(name)) {
		return 'offshore';
	}

	if (
		/(^|\b)(coastal waters|intra coastal waters|bay|sound|harbor|harbour|river|strait|channel|lake|out \d+ nm)(\b|$)/i.test(
			name,
		)
	) {
		return 'nearshore';
	}

	return null;
}

function extractZoneSection(productText: string, zoneId: string): string | null {
	const pattern = new RegExp(`(^|\\n)${escapeRegExp(zoneId)}-[\\s\\S]*?(?=\\n\\$\\$\\n|$)`);
	const match = productText.match(pattern);
	return match?.[0].trim() ?? null;
}

async function parseForecastSection(
	forecast: string,
): Promise<{ parsedForecast: ParsedForecast | null; parseError: string | null; usage: LogUsage[] }> {
	const hash = hashValue(forecast);
	const cacheKey = `noaa-marine-weather/parsed/${hash}`;

	try {
		const cached = await cacheFn(
			cacheKey,
			async () => {
				const { parsedForecast, usage } = await parseForecast(forecast);
				return { parsedForecast, usage };
			},
			{ duration: PARSED_FORECAST_CACHE_DURATION },
		);

		return {
			parsedForecast: cached.parsedForecast,
			parseError: null,
			usage: cached.usage,
		};
	} catch (error) {
		return {
			parsedForecast: null,
			parseError: error instanceof Error ? error.message : String(error),
			usage: [],
		};
	}
}

function formatRelativeLocation(point: PointResponse): string | null {
	const city = point.properties?.relativeLocation?.properties?.city?.trim();
	const state = point.properties?.relativeLocation?.properties?.state?.trim();

	if (!city || !state) {
		return null;
	}

	return `${city}, ${state}`;
}

function offsetCoordinate(
	latitude: number,
	longitude: number,
	distanceNm: number,
	bearingDegrees: number,
): { latitude: number; longitude: number } {
	const radians = (bearingDegrees * Math.PI) / 180;
	const latOffset = (distanceNm * Math.cos(radians)) / 60;
	const lonOffset = (distanceNm * Math.sin(radians)) / (60 * Math.cos((latitude * Math.PI) / 180));

	return {
		latitude: latitude + latOffset,
		longitude: longitude + lonOffset,
	};
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

function lastPathSegment(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	const trimmed = value.replace(/\/+$/, '');
	const lastSlash = trimmed.lastIndexOf('/');
	return lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
}

function roundToSingleDecimal(value: number): number {
	return Math.round(value * 10) / 10;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
