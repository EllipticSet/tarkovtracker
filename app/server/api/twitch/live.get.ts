import { defineEventHandler, getQuery, setResponseHeaders } from 'h3';
import { createLogger } from '@/server/utils/logger';
const logger = createLogger('twitch-live');
const TWITCH_GQL_URL = 'https://gql.twitch.tv/gql';
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
const CACHE_TTL_MS = 60_000;
const LIVE_HEADERS = { 'cache-control': 'public, max-age=30, s-maxage=60' };
let cachedResult: { channel: string; isLive: boolean; checkedAt: number } | null = null;
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const channel =
    (typeof query.channel === 'string' ? query.channel.trim().toLowerCase() : '') || '';
  if (!channel || !/^[a-z0-9_]+$/.test(channel)) {
    setResponseHeaders(event, { 'cache-control': 'no-store' });
    return { isLive: false };
  }
  if (
    cachedResult &&
    cachedResult.channel === channel &&
    Date.now() - cachedResult.checkedAt < CACHE_TTL_MS
  ) {
    setResponseHeaders(event, LIVE_HEADERS);
    return { isLive: cachedResult.isLive };
  }
  try {
    const response = await fetch(TWITCH_GQL_URL, {
      method: 'POST',
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query($login:String!){user(login:$login){stream{id}}}',
        variables: { login: channel },
      }),
    });
    if (!response.ok) {
      logger.warn(`Twitch GQL returned ${response.status}`);
      setResponseHeaders(event, { 'cache-control': 'no-store' });
      return { isLive: false };
    }
    const data = await response.json();
    const isLive = !!data?.data?.user?.stream?.id;
    cachedResult = { channel, isLive, checkedAt: Date.now() };
    setResponseHeaders(event, LIVE_HEADERS);
    return { isLive };
  } catch (err) {
    logger.error('Twitch live check failed:', err);
    setResponseHeaders(event, { 'cache-control': 'no-store' });
    return { isLive: false };
  }
});
