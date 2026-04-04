import { describe, expect, it } from 'vitest';
import { shouldFallbackForUnavailableTokenFunction } from '@/utils/tokenFunctionFallback';
describe('shouldFallbackForUnavailableTokenFunction', () => {
  it('allows fallback when the function is unavailable', () => {
    expect(shouldFallbackForUnavailableTokenFunction({ status: 404 })).toBe(true);
    expect(shouldFallbackForUnavailableTokenFunction({ status: 405 })).toBe(true);
    expect(shouldFallbackForUnavailableTokenFunction({ status: 503 })).toBe(true);
    expect(shouldFallbackForUnavailableTokenFunction(new Error('fetch failed'))).toBe(true);
  });
  it('blocks fallback for policy and auth errors', () => {
    expect(shouldFallbackForUnavailableTokenFunction({ status: 401 })).toBe(false);
    expect(shouldFallbackForUnavailableTokenFunction({ status: 403 })).toBe(false);
    expect(shouldFallbackForUnavailableTokenFunction({ status: 429 })).toBe(false);
    expect(shouldFallbackForUnavailableTokenFunction({ status: 500 })).toBe(false);
  });
});
