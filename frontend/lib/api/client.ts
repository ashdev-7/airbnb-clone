import { apiRequest, type RequestOptions } from "./request";

/**
 * The API client for Client Components. Requests go to /api on our own origin, so the
 * browser attaches the session cookie by itself.
 */
export function api<T>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>({ origin: "" }, path, options);
}
