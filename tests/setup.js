import { beforeEach, vi } from 'vitest';
import { clearFakeCollections } from '../src/shared/infrastructure/fake/fake-database.js';

class MemoryStorage {
    #values = new Map();
    getItem(key) { return this.#values.get(String(key)) ?? null; }
    setItem(key, value) { this.#values.set(String(key), String(value)); }
    removeItem(key) { this.#values.delete(String(key)); }
    clear() { this.#values.clear(); }
}

beforeEach(() => {
    vi.stubEnv('VITE_USE_FAKE_API', 'true');
    vi.stubEnv('VITE_FULLTANK_API_URL', '/api/v1');
    clearFakeCollections();
    vi.stubGlobal('localStorage', new MemoryStorage());
});
