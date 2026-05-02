import { edgeCache } from '~/server/utils/edgeCache';
import { getValidatedLanguage } from '~/server/utils/language-helpers';
import { CACHE_TTL_EXTENDED } from '~/server/utils/tarkov-cache-config';
import { createTarkovJsonPrestigeFetcher } from '~/server/utils/tarkov-json';
const PRESTIGE_CACHE_VERSION = 'json-v1';
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const lang = getValidatedLanguage(query);
  const cacheKey = `prestige-${PRESTIGE_CACHE_VERSION}-${lang}`;
  const fetcher = createTarkovJsonPrestigeFetcher({ lang });
  return await edgeCache(event, cacheKey, fetcher, CACHE_TTL_EXTENDED, {
    cacheKeyPrefix: 'tarkov',
  });
});
