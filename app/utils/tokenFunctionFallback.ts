import { getErrorStatus, isTransientNetworkError } from '@/utils/errors';
const TOKEN_FUNCTION_UNAVAILABLE_STATUS_CODES = new Set([404, 405]);
export const shouldFallbackForUnavailableTokenFunction = (error: unknown): boolean => {
  if (isTransientNetworkError(error)) {
    return true;
  }
  const status = getErrorStatus(error);
  return status !== null && TOKEN_FUNCTION_UNAVAILABLE_STATUS_CODES.has(status);
};
