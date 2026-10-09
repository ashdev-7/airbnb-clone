import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { apiRequest, type Transport } from "./request";

const transport: Transport = { origin: "http://api.test", retryDelayMs: () => 0 };

const envelope = (code: string, status: number) =>
  new Response(
    JSON.stringify({ error: { code, message: `${code} message`, details: { a: 1 }, request_id: "req-1" } }),
    { status, headers: { "Content-Type": "application/json" } },
  );

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function mockFetch(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("calls the API path on the given origin without caching and returns the JSON body", async () => {
    const fetchMock = mockFetch(ok({ status: "ok" }));

    await expect(apiRequest(transport, "/health")).resolves.toEqual({ status: "ok" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/api/health");
    expect(init?.method).toBe("GET");
    expect(init?.cache).toBe("no-store");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends a body as JSON together with the transport's headers", async () => {
    const fetchMock = mockFetch(ok({}));

    await apiRequest(
      { ...transport, headers: { Cookie: "session=abc" } },
      "/things",
      { method: "POST", body: { a: 1 } },
    );

    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json", Cookie: "session=abc" });
  });

  it("returns undefined for 204", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiRequest(transport, "/things/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("turns the error envelope into an ApiError", async () => {
    mockFetch(envelope("dates_unavailable", 409));

    const error = await failure(apiRequest(transport, "/bookings", { method: "POST", body: {} }));

    expect(error.code).toBe("dates_unavailable");
    expect(error.status).toBe(409);
    expect(error.message).toBe("dates_unavailable message");
    expect(error.details).toEqual({ a: 1 });
    expect(error.requestId).toBe("req-1");
  });

  it("still produces an ApiError when the failure is not our envelope", async () => {
    mockFetch(new Response("<html>Bad gateway</html>", { status: 502 }));

    const error = await failure(apiRequest(transport, "/things", { method: "POST" }));

    expect(error.code).toBe("unexpected_response");
    expect(error.status).toBe(502);
  });

  it("retries a GET twice on 503 and on network errors, then succeeds", async () => {
    const fetchMock = mockFetch(envelope("busy", 503), new TypeError("fetch failed"), ok({ n: 1 }));

    await expect(apiRequest(transport, "/things")).resolves.toEqual({ n: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after two retries", async () => {
    const fetchMock = mockFetch(envelope("busy", 503), envelope("busy", 503), envelope("busy", 503));

    const error = await failure(apiRequest(transport, "/things", { method: "PUT" }));

    expect(error.code).toBe("busy");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("never retries a POST or a PATCH", async () => {
    for (const method of ["POST", "PATCH"] as const) {
      const fetchMock = mockFetch(envelope("busy", 503));
      await failure(apiRequest(transport, "/things", { method }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("retries a POST that is marked idempotent", async () => {
    const fetchMock = mockFetch(new TypeError("fetch failed"), ok({ id: 7 }));

    await expect(
      apiRequest(transport, "/bookings", { method: "POST", body: {}, idempotent: true }),
    ).resolves.toEqual({ id: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry errors that repeating cannot fix", async () => {
    const fetchMock = mockFetch(envelope("not_found", 404));

    const error = await failure(apiRequest(transport, "/things/9"));

    expect(error.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a timeout as an ApiError and does not retry it", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await failure(apiRequest({ ...transport, timeoutMs: 20 }, "/slow"));

    expect(error.code).toBe("timeout");
    expect(error.status).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
