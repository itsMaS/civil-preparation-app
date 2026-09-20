/**
 * Install-to-home-screen state. Chrome/Edge/Samsung fire `beforeinstallprompt`,
 * which we hold on to and replay from our own button. iOS Safari has no event,
 * so it gets step-by-step instructions. Everything else gets a generic hint.
 *
 * Imported from main.tsx so the listener is attached before the event fires.
 */
import { useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMethod = 'native' | 'ios' | 'manual';
export type Dismissed = null | 'modal' | 'banner';

const DISMISS_KEY = 'cra.install.dismissed';
const INSTALLED_KEY = 'cra.install.done';

let deferred: BeforeInstallPromptEvent | null = null;
let version = 0;
const listeners = new Set<() => void>();
function notify() { version++; for (const l of listeners) l(); }

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    write(INSTALLED_KEY, '1');
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function snapshot() {
  return { version, deferred, dismissed: read(DISMISS_KEY) as Dismissed, done: read(INSTALLED_KEY) === '1' };
}
let cached = snapshot();
function getSnapshot() {
  const s = snapshot();
  if (s.version !== cached.version || s.dismissed !== cached.dismissed || s.done !== cached.done) cached = s;
  return cached;
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export interface InstallState {
  /** Running from the home screen already, or installed from this session. */
  installed: boolean;
  method: InstallMethod;
  dismissed: Dismissed;
  /** Show the one-time modal. */
  showModal: boolean;
  /** Show the Home banner (modal was dismissed, banner was not). */
  showBanner: boolean;
  /** Triggers the native prompt. Resolves true when the user accepted. */
  install(): Promise<boolean>;
  dismissModal(): void;
  dismissBanner(): void;
}

export function useInstallPrompt(): InstallState {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const installed = s.done || isStandalone();
  const method: InstallMethod = s.deferred ? 'native' : isIOS() ? 'ios' : 'manual';

  const install = useCallback(async () => {
    if (!deferred) return false;
    const ev = deferred;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === 'accepted') { deferred = null; write(INSTALLED_KEY, '1'); notify(); return true; }
    return false;
  }, []);

  return {
    installed,
    method,
    dismissed: s.dismissed,
    showModal: !installed && s.dismissed === null,
    showBanner: !installed && s.dismissed === 'modal',
    install,
    dismissModal: () => { write(DISMISS_KEY, 'modal'); notify(); },
    dismissBanner: () => { write(DISMISS_KEY, 'banner'); notify(); },
  };
}
