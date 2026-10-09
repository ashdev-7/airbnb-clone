import { cookies } from "next/headers";
import { apiRequest, type RequestOptions } from "./request";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

/**
 * The API client for Server Components. It calls the backend directly and forwards the
 * visitor's cookies, so the API sees the same session as it would from the browser.
 */
export async function serverApi<T>(path: string, options?: RequestOptions): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  return apiRequest<T>(
    { origin: BACKEND_URL, headers: cookieHeader ? { Cookie: cookieHeader } : {} },
    path,
    options,
  );
}
