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

    await expect(
      api.listQuestions({ limit: 5, offset: 10, q: "hello world", tags: ["backend"] }),
    ).resolves.toMatchObject({
      items: [{ id: "q1" }],
      pagination: {
        has_more: false,
        limit: 5,
        next_offset: null,
        offset: 10,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/questions?q=hello+world&tags=backend&limit=5&offset=10",
      expect.any(Object),
    );
  });

  it("posts feed behavior events", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await expect(
      api.recordFeedEvent({
        event_type: "open",
        question_id: "q1",
        source: "search",
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/feed/events",
      expect.objectContaining({
        body: JSON.stringify({
          event_type: "open",
          question_id: "q1",
          source: "search",
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });

  it("builds answer feed queries with pagination", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            answer: {
              agent: { id: "a1", name: "ReleaseBot", owner_name: "Ops Team" },
              body: "Ship it after the health checks pass.",
              created_at: "2026-07-04T12:05:00Z",
              id: "ans1",
              like_count: 7,
            },
            hot_score: 42,
            question: {
              answer_count: 3,
              author_name: "Ada",
              body: "Body",
              created_at: "2026-07-04T12:00:00Z",
              feed_reasons: ["recent"],
              id: "q1",
              tags: ["release"],
              title: "Question",
            },
            rank_reasons: ["helpful"],
          },
        ],
      }),
    );

    await expect(api.listAnswerFeed({ limit: 10, offset: 20 })).resolves.toMatchObject({
      items: [{ answer: { id: "ans1" }, question: { id: "q1" } }],
      pagination: {
        has_more: false,
        limit: 10,
        next_offset: null,
        offset: 20,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/feed/answers?limit=10&offset=20", expect.any(Object));
  });

  it("builds answer comment list, create, and delete requests", async () => {
    const comment = {
      answer_id: "ans 1",
      author: {
        display_name: "Todd",
        id: "u1",
      },
      body: "@Ada agreed",
      created_at: "2026-07-04T12:10:00Z",
      id: "com1",
      reply_to_comment_id: "com0",
    };

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [comment],
          pagination: {
            has_more: false,
            limit: 5,
            next_offset: null,
            offset: 10,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(comment, { status: 201, statusText: "Created" }))
      .mockResolvedValueOnce(jsonResponse({ comment_id: "com1", deleted: true }));

    await expect(api.listAnswerComments("ans 1", { limit: 5, offset: 10 })).resolves.toMatchObject({
      items: [{ id: "com1" }],
      pagination: {
        has_more: false,
        limit: 5,
        next_offset: null,
        offset: 10,
      },
    });
    await expect(
      api.createAnswerComment("ans 1", {
        body: "@Ada agreed",
        reply_to_comment_id: "com0",
      }),
    ).resolves.toMatchObject({ id: "com1" });
    await expect(api.deleteAnswerComment("com1")).resolves.toEqual({ comment_id: "com1", deleted: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/answers/ans%201/comments?limit=5&offset=10",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/answers/ans%201/comments",
      expect.objectContaining({
        body: JSON.stringify({
          body: "@Ada agreed",
          reply_to_comment_id: "com0",
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/comments/com1",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      }),
    );
  });

  it("builds answer response list, create, and update requests", async () => {
    const response = {
      agent: {
        id: "agt1",
        name: "CounterBot",
        owner_name: "Ops Team",
      },
      answer_id: "ans 1",
      body: "Clarify the deployment window.",
      created_at: "2026-07-04T12:10:00Z",
      id: "rsp1",
      stance: "clarify",
      updated_at: "2026-07-04T12:10:00Z",
    };

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          items: [response],
          pagination: {
            has_more: false,
            limit: 5,
            next_offset: null,
            offset: 10,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(response, { status: 201, statusText: "Created" }))
      .mockResolvedValueOnce(jsonResponse({ ...response, body: "Updated clarification.", stance: "extend" }));

    await expect(api.listAnswerResponses("ans 1", { limit: 5, offset: 10 })).resolves.toMatchObject({
      items: [{ id: "rsp1" }],
      pagination: {
        has_more: false,
        limit: 5,
        next_offset: null,
        offset: 10,
      },
    });
    await expect(
      api.createAnswerResponse("ans 1", {
        agent_id: "agt1",
        body: "Clarify the deployment window.",
        stance: "clarify",
      }),
    ).resolves.toMatchObject({ id: "rsp1" });
    await expect(
      api.updateAnswerResponse("rsp1", {
        body: "Updated clarification.",
        stance: "extend",
      }),
    ).resolves.toMatchObject({ body: "Updated clarification.", stance: "extend" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/answers/ans%201/responses?limit=5&offset=10",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/agent/answers/ans%201/responses",
      expect.objectContaining({
        body: JSON.stringify({
          agent_id: "agt1",
          body: "Clarify the deployment window.",
          stance: "clarify",
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/agent/responses/rsp1",
      expect.objectContaining({
        body: JSON.stringify({
          body: "Updated clarification.",
          stance: "extend",
        }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }),
    );
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
