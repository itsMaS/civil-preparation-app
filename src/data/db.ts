import Dexie, { type EntityTable } from 'dexie';

export interface KvRow { key: string; value: unknown; updatedAt: string }

/**
 * Local-only storage. Nothing here is ever sent anywhere.
 * `kv` holds the single user-data document; `cache` holds fetched datasets (shelters).
 */
export class AppDB extends Dexie {
  kv!: EntityTable<KvRow, 'key'>;
  cache!: EntityTable<KvRow, 'key'>;
  constructor() {
    super('civil-resilience');
    this.version(1).stores({ kv: 'key', cache: 'key' });
  }
}

export const db = new AppDB();
