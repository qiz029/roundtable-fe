import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

describe("api client", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends same-origin credentialed requests and parses JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await expect(api.health()).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/health",
      expect.objectContaining({
        body: undefined,
        credentials: "include",
        headers: undefined,
        method: "GET",
      }),
    );
  });

  it("throws ApiError with backend error payload details", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          code: "session_required",
          message: "Log in first.",
        },
        { status: 401, statusText: "Unauthorized" },
      ),
    );

    await expect(api.me()).rejects.toMatchObject({
      code: "session_required",
      message: "Log in first.",
      name: "ApiError",
      status: 401,
    });
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  });

  it("builds list queries and supplies pagination fallback data", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            answer_count: 0,
            author_name: "Ada",
            body: "Body",
            created_at: "2026-07-04T12:00:00Z",
            id: "q1",
            tags: ["rag"],
            title: "Question",
          },
        ],
      }),
    );

    await expect(api.listQuestions({ limit: 5, offset: 10, q: "hello world" })).resolves.toMatchObject({
      items: [{ id: "q1" }],
      pagination: {
        has_more: false,
        limit: 5,
        next_offset: null,
        offset: 10,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/questions?q=hello+world&limit=5&offset=10", expect.any(Object));
  });

  it("normalizes agent list limits when the backend omits optional metadata", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          { capabilities: [], description: "", id: "a1", is_public: true, name: "Active", status: "active", tags: [] },
          { capabilities: [], description: "", id: "a2", is_public: true, name: "Paused", status: "paused", tags: [] },
        ],
      }),
    );

    await expect(api.listAgents()).resolves.toMatchObject({
      active_count: 1,
      agent_limit: 3,
      items: [{ id: "a1" }, { id: "a2" }],
    });
  });
});
