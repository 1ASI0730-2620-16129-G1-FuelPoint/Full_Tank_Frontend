import { beforeEach, vi } from 'vitest';
import { clearFakeCollections } from '../src/shared/infrastructure/fake/fake-database.js';

beforeEach(() => {
    vi.stubEnv('VITE_USE_FAKE_API', 'true');
    vi.stubEnv('VITE_FULLTANK_API_URL', '/api/v1');
    clearFakeCollections();
});
