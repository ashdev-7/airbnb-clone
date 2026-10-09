import { API_BASE_PATH, API_TIMEOUT_MS } from "@/lib/config";
import { ApiError, NETWORK_ERROR, TIMEOUT, errorFromResponse } from "./errors";

/**
 * The request logic shared by the browser client and the server client (plan §7.4 rule 2,
 * §9.4): a timeout, the error envelope parsed into ApiError, and retries for requests
 * that are safe to repeat. This is the only place in the frontend that calls fetch.
 */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: Method;
  /** Sent as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Marks a POST as safe to repeat (the booking POST, which carries an idempotency key). */
  idempotent?: boolean;
};

export type Transport = {
  /** "" in the browser (same origin); the backend's address on the server. */
  origin: string;
  /** Headers added to every request, such as the forwarded cookie. */
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Pause before retry number `attempt` (1-based). */
  retryDelayMs?: (attempt: number) => number;
};

const RETRYABLE_METHODS: ReadonlySet<Method> = new Set(["GET", "PUT", "DELETE"]);
const MAX_RETRIES = 2;
const defaultRetryDelayMs = (attempt: number) => 300 * 2 ** (attempt - 1);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Network failures and 503 ("busy") are worth repeating; a timeout or any other status is not. */
function isRetryable(error: ApiError): boolean {
  return error.code === NETWORK_ERROR || error.status === 503;
}

async function attempt<T>(transport: Transport, path: string, options: RequestOptions): Promise<T> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(`${transport.origin}${API_BASE_PATH}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...transport.headers,
        ...options.headers,
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      // Availability changes with every booking: nothing is cached (plan §7.4 rule 6).
      cache: "no-store",
      signal: AbortSignal.timeout(transport.timeoutMs ?? API_TIMEOUT_MS),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "TimeoutError") {
      throw new ApiError(TIMEOUT, 0, "The request took too long, try again.");
    }
    throw new ApiError(NETWORK_ERROR, 0, "Could not reach the server, try again.");
  }

  if (!response.ok) throw await errorFromResponse(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiRequest<T>(
  transport: Transport,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const retries = RETRYABLE_METHODS.has(method) || options.idempotent ? MAX_RETRIES : 0;
  const retryDelayMs = transport.retryDelayMs ?? defaultRetryDelayMs;

  for (let retry = 0; ; retry++) {
    try {
      return await attempt<T>(transport, path, options);
    } catch (error) {
      if (!(error instanceof ApiError) || !isRetryable(error) || retry >= retries) throw error;
      await sleep(retryDelayMs(retry + 1));
    }
  }
}
