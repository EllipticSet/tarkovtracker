// @vitest-environment happy-dom
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mockFetch = vi.fn();
const runtimeConfig = {
  public: {} as Record<string, string>,
};
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
  },
  from: vi.fn(() => {
    const table = {
      delete: vi.fn(() => table),
      eq: vi.fn(() => table),
    };
    return table;
  }),
  functions: {
    invoke: vi.fn(),
  },
};
mockNuxtImport('useRouter', () => () => ({
  beforeEach: vi.fn(),
  beforeResolve: vi.fn(),
  onError: vi.fn(),
  afterEach: vi.fn(),
}));
mockNuxtImport('useNuxtApp', () => () => ({
  $supabase: {
    client: mockSupabaseClient,
  },
}));
mockNuxtImport('useRuntimeConfig', () => () => ({
  public: runtimeConfig.public,
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
describe('useEdgeFunctions.getTeamMembers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
    runtimeConfig.public = {};
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
      error: null,
    });
    mockSupabaseClient.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'token-2' } },
      error: null,
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('rejects malformed team id before making requests', async () => {
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.getTeamMembers('team-1&select=*')).rejects.toThrow(
      'Invalid team id'
    );
    expect(mockSupabaseClient.auth.getSession).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
  });
  it('falls back to team-members when refresh retry fails with server error', async () => {
    const firstError = { status: 401 };
    const secondError = { status: 500 };
    mockFetch.mockRejectedValueOnce(firstError).mockRejectedValueOnce(secondError);
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: { members: ['fallback-member'] },
      error: null,
    });
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.getTeamMembers('team-1')).resolves.toEqual({
      members: ['fallback-member'],
      profiles: {},
    });
    expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/api/team/members',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token-1',
        },
        method: 'GET',
        query: { teamId: 'team-1' },
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      '/api/team/members',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token-2',
        },
        method: 'GET',
        query: { teamId: 'team-1' },
      })
    );
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('team-members', {
      body: { teamId: 'team-1' },
      method: 'POST',
    });
  });
  it('throws the retry auth error instead of the original auth error', async () => {
    const firstError = { status: 401 };
    const secondError = { status: 403 };
    mockFetch.mockRejectedValueOnce(firstError).mockRejectedValueOnce(secondError);
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.getTeamMembers('team-1')).rejects.toBe(secondError);
    expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
  });
});
describe('useEdgeFunctions.team mutations', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
    runtimeConfig.public = {
      teamGatewayUrl: 'https://legacy-gateway.tarkovtracker.test',
    };
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('invokes Supabase directly for team creation even when a gateway URL is configured', async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.createTeam('Alpha', 'join-code', 5, 'pve')).resolves.toEqual({
      success: true,
    });
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('team-create', {
      body: {
        game_mode: 'pve',
        join_code: 'join-code',
        maxMembers: 5,
        name: 'Alpha',
      },
      method: 'POST',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
describe('useEdgeFunctions.createToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('$fetch', mockFetch);
    runtimeConfig.public = {
      teamGatewayUrl: 'https://legacy-gateway.tarkovtracker.test',
      tokenGatewayUrl: 'https://gateway.tarkovtracker.test',
    };
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token-1' } },
      error: null,
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('invokes Supabase directly even when gateway URLs are configured', async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: { tokenValue: 'PVP_deadbeef' },
      error: null,
    });
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(
      edgeFunctions.createToken({ permissions: ['GP'], gameMode: 'pvp' })
    ).resolves.toEqual({ tokenValue: 'PVP_deadbeef' });
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('token-create', {
      body: { gameMode: 'pvp', permissions: ['GP'] },
      method: 'POST',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('propagates Supabase rate limit errors without a bypass', async () => {
    const rateLimitError = { status: 429, data: { message: 'Too many requests' } };
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: null,
      error: rateLimitError,
    });
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.createToken({ permissions: ['GP'], gameMode: 'pvp' })).rejects.toBe(
      rateLimitError
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('uses DELETE invocation for token revoke', async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.revokeToken('token-1')).resolves.toEqual({ success: true });
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('token-revoke', {
      body: { tokenId: 'token-1' },
      method: 'DELETE',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('falls back to direct delete when token-revoke is unavailable', async () => {
    const deleteEq = vi.fn(() => ({ error: null }));
    const deleteFn = vi.fn(() => ({
      eq: deleteEq,
    }));
    mockSupabaseClient.from.mockReturnValueOnce({
      delete: deleteFn,
      eq: vi.fn(),
    } as never);
    mockSupabaseClient.functions.invoke.mockResolvedValue({
      data: null,
      error: { status: 404, data: { message: 'Not found' } },
    });
    const { useEdgeFunctions } = await import('@/composables/api/useEdgeFunctions');
    const edgeFunctions = useEdgeFunctions();
    await expect(edgeFunctions.revokeToken('token-1')).resolves.toEqual({ success: true });
    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('token-revoke', {
      body: { tokenId: 'token-1' },
      method: 'DELETE',
    });
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_tokens');
    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith('token_id', 'token-1');
  });
});
