import { describe, it, expect, vi } from 'vitest';
import { BaseApi } from '../src/shared/infrastructure/base-api.js';

describe('BaseApi Configuration Validation', () => {
  it('throws descriptive error if VITE_FULLTANK_API_URL is missing or whitespace', () => {
    vi.stubEnv('VITE_FULLTANK_API_URL', '');
    expect(() => new BaseApi()).toThrow('[BaseApi] Missing API base URL: VITE_FULLTANK_API_URL is not configured.');

    vi.stubEnv('VITE_FULLTANK_API_URL', '   ');
    expect(() => new BaseApi()).toThrow('[BaseApi] Missing API base URL: VITE_FULLTANK_API_URL is not configured.');

    vi.unstubAllEnvs();
  });

  it('instantiates successfully when valid base URL is configured in env', () => {
    vi.stubEnv('VITE_FULLTANK_API_URL', 'http://localhost:5204/api/v1');
    const api = new BaseApi();
    expect(api.http).toBeDefined();
    expect(api.http.defaults.baseURL).toBe('http://localhost:5204/api/v1');
    vi.unstubAllEnvs();
  });

  it('allows overriding base URL via constructor argument', () => {
    const api = new BaseApi('https://custom-gateway.example.com/api/v1');
    expect(api.http).toBeDefined();
    expect(api.http.defaults.baseURL).toBe('https://custom-gateway.example.com/api/v1');
  });
});
