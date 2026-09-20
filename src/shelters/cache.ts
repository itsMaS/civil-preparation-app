import { db } from '@/data/db';
import sample from '@content/lt/shelters.sample.json';
import { fetchShelters } from './fetch';
import type { ShelterDataset } from './types';

const KEY = 'shelters';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const bundled: ShelterDataset = { ...(sample as ShelterDataset), sample: true };

/** Serve the cached copy instantly; the bundled snapshot is the floor. */
export async function loadShelters(): Promise<ShelterDataset> {
  try {
    const row = await db.cache.get(KEY);
    const cached = row?.value as ShelterDataset | undefined;
    if (cached?.features?.length) return cached;
  } catch { /* IndexedDB unavailable: fall through */ }
  return bundled;
}

export function isStale(ds: ShelterDataset, now = Date.now()): boolean {
  return ds.sample === true || now - new Date(ds.fetchedAt).getTime() > MAX_AGE_MS;
}

/**
 * Stale-while-revalidate: returns the fresh dataset on success, or null on any
 * failure (the caller keeps what it has). Never throws.
 */
export async function refreshShelters(): Promise<ShelterDataset | null> {
  try {
    const fresh = await fetchShelters(AbortSignal.timeout(15000));
    if (!fresh.features.length) return null;
    await db.cache.put({ key: KEY, value: fresh, updatedAt: fresh.fetchedAt });
    return fresh;
  } catch {
    return null;
  }
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
