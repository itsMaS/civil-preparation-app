import type { ShelterDataset, Shelter } from './types';

/**
 * Live-data adapter for the official PAGD shelter/cover dataset.
 *
 * The upstream endpoint could not be verified from the build environment, so
 * this ships as a stub that always fails (the cache layer then keeps serving
 * the bundled snapshot). To connect the real data:
 *   1. Set SHELTER_ENDPOINT to the JSON/GeoJSON URL.
 *   2. Adapt `normalise` to the response shape.
 *   3. Confirm the endpoint sends CORS headers (Access-Control-Allow-Origin) -
 *      GitHub Pages cannot proxy. If it does not, publish a periodic snapshot
 *      via a GitHub Action instead (see docs/DEPLOY.md).
 */
export const SHELTER_ENDPOINT: string | null = null;

interface RawFeature {
  id?: string | number;
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: [number, number] };
}

function normalise(raw: unknown): Shelter[] {
  const feats = (raw as { features?: RawFeature[] })?.features ?? [];
  return feats.flatMap((f, i) => {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!coords) return [];
    const kindRaw = String(p.type ?? p.kind ?? p.tipas ?? '').toLowerCase();
    return [{
      id: String(f.id ?? p.id ?? i),
      name: String(p.name ?? p.pavadinimas ?? p.address ?? ''),
      kind: kindRaw.includes('slėpt') || kindRaw.includes('shelter') ? 'shelter' : 'cover',
      address: String(p.address ?? p.adresas ?? ''),
      lng: coords[0],
      lat: coords[1],
      capacity: typeof p.capacity === 'number' ? p.capacity : undefined,
    } satisfies Shelter];
  });
}

export async function fetchShelters(signal?: AbortSignal): Promise<ShelterDataset> {
  if (!SHELTER_ENDPOINT) throw new Error('Shelter endpoint not configured');
  const res = await fetch(SHELTER_ENDPOINT, { signal });
  if (!res.ok) throw new Error(`Shelter fetch failed: ${res.status}`);
  const raw: unknown = await res.json();
  return { source: SHELTER_ENDPOINT, fetchedAt: new Date().toISOString(), features: normalise(raw) };
}
