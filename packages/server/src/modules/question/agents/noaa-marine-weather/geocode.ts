import type { Port, Region, Spot } from '@bwfish/core';
import { getFirestoreDb } from '../../../../lib/clients/firebase';
import type { AgentRunPayload } from '../../types';

export interface ResolvedCoordinates {
	latitude: number;
	longitude: number;
	source: string;
	label: string | null;
}

function readPosition(entity: Record<string, unknown>): { lat: number; lon: number } | null {
	const position = entity.position;
	if (!position || typeof position !== 'object') {
		return null;
	}

	const lat = (position as { lat?: unknown }).lat;
	const lon = (position as { lon?: unknown }).lon;

	if (typeof lat !== 'number' || typeof lon !== 'number') {
		return null;
	}

	return { lat, lon };
}

async function loadPort(portId: string): Promise<Port | null> {
	const snap = await getFirestoreDb().collection('ports').doc(portId).get();
	return snap.exists ? (snap.data() as Port) : null;
}

async function loadRegion(regionId: string): Promise<Region | null> {
	const snap = await getFirestoreDb().collection('regions').doc(regionId).get();
	return snap.exists ? (snap.data() as Region) : null;
}

async function loadSpot(spotId: string): Promise<Spot | null> {
	const snap = await getFirestoreDb().collection('spots').doc(spotId).get();
	return snap.exists ? (snap.data() as Spot) : null;
}

function coordinatesFromPosition(
	position: { lat: number; lon: number },
	source: string,
	label: string | null,
): ResolvedCoordinates {
	return {
		latitude: position.lat,
		longitude: position.lon,
		source,
		label,
	};
}

function coordinatesFromPort(port: Port, source: string): ResolvedCoordinates {
	return {
		latitude: port.position.lat,
		longitude: port.position.lon,
		source,
		label: port.title,
	};
}

function coordinatesFromRegion(region: Region, source: string): ResolvedCoordinates {
	return {
		latitude: region.position.lat,
		longitude: region.position.lon,
		source,
		label: region.title,
	};
}

export async function resolveCoordinates(payload: AgentRunPayload): Promise<ResolvedCoordinates> {
	const entry = payload.contributor?.entry;

	if (entry?.collection === 'ports') {
		const port = await loadPort(entry.refId);
		if (port) {
			return coordinatesFromPort(port, `port:${entry.refId}`);
		}

		const position = readPosition(entry.entity);
		if (position) {
			const title = typeof entry.entity.title === 'string' ? entry.entity.title : null;
			return coordinatesFromPosition(position, `port:${entry.refId}`, title);
		}
	}

	if (entry?.collection === 'regions') {
		const region = await loadRegion(entry.refId);
		if (region) {
			return coordinatesFromRegion(region, `region:${entry.refId}`);
		}

		const position = readPosition(entry.entity);
		if (position) {
			const title = typeof entry.entity.title === 'string' ? entry.entity.title : null;
			return coordinatesFromPosition(position, `region:${entry.refId}`, title);
		}
	}

	if (entry?.collection === 'spots') {
		const spot = await loadSpot(entry.refId);
		if (spot) {
			return coordinatesFromPosition(spot.position, `spot:${entry.refId}`, spot.title);
		}

		const position = readPosition(entry.entity);
		if (position) {
			const title = typeof entry.entity.title === 'string' ? entry.entity.title : null;
			return coordinatesFromPosition(position, `spot:${entry.refId}`, title);
		}

		const portId = Array.isArray(entry.entity.portIds)
			? (entry.entity.portIds as unknown[]).find((value): value is string => typeof value === 'string')
			: undefined;
		if (portId) {
			const port = await loadPort(portId);
			if (port) {
				return coordinatesFromPort(port, `spotPort:${portId}`);
			}
		}
	}

	const homePort = payload.contributor?.user.homePort;
	if (homePort?.portId) {
		const port = await loadPort(homePort.portId);
		if (port) {
			return coordinatesFromPort(port, `homePort:${homePort.portId}`);
		}
	}

	if (homePort?.regionId) {
		const region = await loadRegion(homePort.regionId);
		if (region) {
			return coordinatesFromRegion(region, `homePortRegion:${homePort.regionId}`);
		}
	}

	throw new Error(
		'Could not determine coordinates for a marine forecast. Ask from a port or region page, or set a home port on your profile.',
	);
}
