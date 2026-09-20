import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shelter } from './types';

/** Lazy-loaded Leaflet map. Tiles need network; the surrounding list works offline. */
export default function ShelterMap({ shelters, center, pinned, onPick }: { shelters: Shelter[]; center: [number, number]; pinned?: string; onPick: (s: Shelter) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView(center, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    for (const s of shelters) {
      const isPinned = s.id === pinned;
      const marker = L.circleMarker([s.lat, s.lng], { radius: isPinned ? 10 : 7, color: isPinned ? '#e8862a' : s.kind === 'shelter' ? '#7fb069' : '#8fa35f', fillOpacity: 0.9, weight: 2 });
      marker.bindPopup(`<strong>${s.name}</strong><br>${s.address}`);
      marker.on('click', () => onPick(s));
      marker.addTo(layer);
    }
    map.setView(center, map.getZoom());
    return () => { layer.remove(); };
  }, [shelters, center, pinned, onPick]);

  return <div ref={ref} className="h-64 w-full rounded-2xl" role="application" aria-label="Map" />;
}
