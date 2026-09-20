/** Small inline icon set. Names match badge/scenario `icon` fields in the content packs. */
export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true };
  switch (name) {
    case 'radio': return <svg {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><circle cx="8" cy="14" r="2.5" /><path d="M13 12h5M13 16h5M7 8l9-5" /></svg>;
    case 'home': return <svg {...p}><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>;
    case 'backpack': return <svg {...p}><path d="M6 8h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" /><path d="M8 14h8" /></svg>;
    case 'drone': return <svg {...p}><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M7 7l2 2M17 7l-2 2M7 17l2-2M17 17l-2-2" /></svg>;
    case 'snowflake': return <svg {...p}><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" /></svg>;
    case 'radiation': return <svg {...p}><circle cx="12" cy="12" r="2" /><path d="M12 4a8 8 0 0 1 7 4l-5 3a2.5 2.5 0 0 0-2-1Z" /><path d="M5 8a8 8 0 0 1 7-4v6a2.5 2.5 0 0 0-2 1Z" /><path d="M8 19a8 8 0 0 1-3.5-6h6a2.5 2.5 0 0 0 1 1.5Z" /></svg>;
    case 'map': return <svg {...p}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" /><path d="M9 4v14M15 6v14" /></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case 'siren': return <svg {...p}><path d="M6 20h12l-1-9a5 5 0 0 0-10 0Z" /><path d="M12 3v2M4 7l1.5 1M20 7l-1.5 1M3 20h18" /></svg>;
    case 'power': return <svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></svg>;
    case 'check': return <svg {...p}><path d="m5 12 5 5L20 7" /></svg>;
    case 'alert': return <svg {...p}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
    case 'chevron': return <svg {...p}><path d="m9 6 6 6-6 6" /></svg>;
    case 'back': return <svg {...p}><path d="m15 6-6 6 6 6" /></svg>;
    case 'close': return <svg {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case 'user': return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case 'info': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
    case 'shield': return <svg {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /></svg>;
    case 'pin': return <svg {...p}><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'phone': return <svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>;
    case 'refresh': return <svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>;
    case 'external': return <svg {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>;
    case 'lock': return <svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case 'sparkle': return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>;
    case 'download': return <svg {...p}><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>;
    case 'upload': return <svg {...p}><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 20h16" /></svg>;
    case 'trash': return <svg {...p}><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
  }
}
