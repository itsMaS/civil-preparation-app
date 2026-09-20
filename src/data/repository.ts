import type { UserData } from '@/engine/types';
import { db } from './db';

/**
 * The one seam between the app and where user data lives.
 * v1 ships DexieRepository (IndexedDB, on-device). A future SupabaseRepository
 * can implement the same interface for opt-in sync without touching the UI.
 */
export interface Repository {
  load(): Promise<UserData | null>;
  save(data: UserData): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'user';

export class DexieRepository implements Repository {
  async load(): Promise<UserData | null> {
    const row = await db.kv.get(KEY);
    return (row?.value as UserData | undefined) ?? null;
  }
  async save(data: UserData): Promise<void> {
    await db.kv.put({ key: KEY, value: data, updatedAt: new Date().toISOString() });
  }
  async clear(): Promise<void> {
    await db.kv.delete(KEY);
  }
}

/** In-memory fallback for environments where IndexedDB is unavailable (private mode quirks). */
export class MemoryRepository implements Repository {
  private data: UserData | null = null;
  async load(): Promise<UserData | null> { return this.data; }
  async save(data: UserData): Promise<void> { this.data = data; }
  async clear(): Promise<void> { this.data = null; }
}

export function createRepository(): Repository {
  try {
    if (typeof indexedDB === 'undefined') return new MemoryRepository();
    return new DexieRepository();
  } catch {
    return new MemoryRepository();
  }
}
