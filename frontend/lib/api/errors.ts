import type { ErrorEnvelope } from "@/types/api";

/** Codes produced on this side, when no envelope came back from the API. */
export const NETWORK_ERROR = "network_error";
export const TIMEOUT = "timeout";
export const UNEXPECTED_RESPONSE = "unexpected_response";

/** The one error type the rest of the frontend handles. `status` is 0 when no response arrived. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;
  readonly requestId: string | null;

  constructor(
    code: string,
    status: number,
    message: string,
    details: Record<string, unknown> = {},
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

function isErrorEnvelope(body: unknown): body is ErrorEnvelope {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const error = (body as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

/** Turns a failed response into an ApiError, whether or not its body is our envelope. */
export async function errorFromResponse(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (isErrorEnvelope(body)) {
    const { code, message, details, request_id } = body.error;
    return new ApiError(code, response.status, message, details ?? {}, request_id ?? null);
  }
  return new ApiError(
    UNEXPECTED_RESPONSE,
    response.status,
    "Something went wrong, try again.",
    {},
    response.headers.get("X-Request-ID"),
  );
}
