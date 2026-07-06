import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QuestionPage } from "./QuestionPage";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

function renderQuestionPage(initialEntry = "/q/backend-release-workflow--q1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter([{ path: "/q/:questionSlugId", element: <QuestionPage /> }], {
    initialEntries: [initialEntry],
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, ...result };
}

function questionDetail() {
  return {
    answer_count: 3,
    answers: [
      {
        agent: {
          id: "agt1",
          name: "ReleaseBot",
          owner_name: "Ops Team",
        },
        body: "Run the migration preflight before deploy.",
        comment_count: 1,
        created_at: "2026-07-04T12:05:00Z",
        id: "ans1",
        like_count: 7,
      },
      {
        agent: {
          id: "agt2",
          name: "QualityBot",
          owner_name: "QA Team",
        },
        body: "Use the canary dashboard to compare answer quality.",
        comment_count: 0,
        created_at: "2026-07-04T12:07:00Z",
        id: "ans2",
        like_count: 4,
      },
      {
        agent: {
          id: "agt1",
          name: "ReleaseBot",
          owner_name: "Ops Team",
        },
        body: "Check rollback metadata after the migration.",
        comment_count: 0,
        created_at: "2026-07-04T12:09:00Z",
        id: "ans3",
        like_count: 3,
      },
    ],
    answers_pagination: {
      has_more: false,
      limit: 20,
      next_offset: null,
      offset: 0,
    },
    author_name: "Ada",
    body: "Deploy and migration checklist",
    created_at: "2026-07-04T12:00:00Z",
    id: "q1",
    tags: ["release"],
    title: "Backend release workflow",
  };
}

function answerResponse(overrides: Record<string, unknown> = {}) {
  return {
    agent: {
      id: "agt-owned",
      name: "CounterBot",
      owner_name: "Todd",
    },
    answer_id: "ans1",
    body: "This misses the post-deploy verification window.",
    created_at: "2026-07-04T12:14:00Z",
    id: "rsp1",
    stance: "disagree",
    updated_at: "2026-07-04T12:14:00Z",
    ...overrides,
  };
}

function existingComment() {
  return {
    answer_id: "ans1",
    author: {
      display_name: "Ada Lovelace",
      id: "u2",
    },
    body: "What should we verify after deploy?",
    created_at: "2026-07-04T12:10:00Z",
    id: "com1",
  };
}

function mockQuestionApi({ responsesByAnswerId = {} }: { responsesByAnswerId?: Record<string, unknown[]> } = {}) {
  fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/v1/auth/me")) {
      return Promise.resolve(
        jsonResponse({
          display_name: "Todd",
          email: "todd@example.com",
          email_verified: true,
          id: "u1",
        }),
      );
    }

    if (url.includes("/api/v1/questions/q1")) {
      return Promise.resolve(jsonResponse(questionDetail()));
    }

    if (url.includes("/api/v1/answers/") && url.includes("/responses")) {
      const answerId = decodeURIComponent(url.split("/api/v1/answers/")[1].split("/responses")[0]);
      return Promise.resolve(
        jsonResponse({
          items: responsesByAnswerId[answerId] || [],
          pagination: {
            has_more: false,
            limit: 10,
            next_offset: null,
            offset: 0,
          },
        }),
      );
    }

    if (url.includes("/api/v1/answers/ans1/comments") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return Promise.resolve(
        jsonResponse(
          {
            answer_id: "ans1",
            author: {
              display_name: "Todd",
              id: "u1",
            },
            body: body.body,
            created_at: "2026-07-04T12:12:00Z",
            id: "com2",
            reply_to: {
              author_display_name: "Ada Lovelace",
              id: "com1",
            },
            reply_to_comment_id: body.reply_to_comment_id,
          },
          { status: 201, statusText: "Created" },
        ),
      );
    }

    if (url.includes("/api/v1/answers/ans1/comments")) {
      return Promise.resolve(
        jsonResponse({
          items: [existingComment()],
          pagination: {
            has_more: false,
            limit: 10,
            next_offset: null,
            offset: 0,
          },
        }),
      );
    }

    return Promise.resolve(jsonResponse({ ok: true }));
  });
}

function commentPostBodies() {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url).includes("/api/v1/answers/ans1/comments") && init?.method === "POST")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

function responseWriteCalls() {
  return fetchMock.mock.calls.filter(
    ([url]) => String(url).includes("/api/v1/agent/answers/") || String(url).includes("/api/v1/agent/responses/"),
  );
}

describe("QuestionPage agent filtering", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockQuestionApi();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters loaded answers by agent and stores the selection in the URL", async () => {
    const user = userEvent.setup();
    const { router } = renderQuestionPage();

    expect(await screen.findByText("Run the migration preflight before deploy.")).toBeInTheDocument();
    expect(screen.getByText("Use the canary dashboard to compare answer quality.")).toBeInTheDocument();
    expect(screen.getByText("Check rollback metadata after the migration.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "QualityBot 1" }));

    expect(screen.queryByText("Run the migration preflight before deploy.")).not.toBeInTheDocument();
    expect(screen.getByText("Use the canary dashboard to compare answer quality.")).toBeInTheDocument();
    expect(screen.queryByText("Check rollback metadata after the migration.")).not.toBeInTheDocument();
    expect(router.state.location.search).toBe("?agent=agt2");

    await user.click(screen.getByRole("button", { name: "All agents 3" }));

    expect(screen.getByText("Run the migration preflight before deploy.")).toBeInTheDocument();
    expect(screen.getByText("Use the canary dashboard to compare answer quality.")).toBeInTheDocument();
    expect(screen.getByText("Check rollback metadata after the migration.")).toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });

  it("uses the agent query parameter as the initial filter", async () => {
    renderQuestionPage("/q/backend-release-workflow--q1?agent=agt1");

    expect(await screen.findByText("Run the migration preflight before deploy.")).toBeInTheDocument();
    expect(screen.queryByText("Use the canary dashboard to compare answer quality.")).not.toBeInTheDocument();
    expect(screen.getByText("Check rollback metadata after the migration.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ReleaseBot 2" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("QuestionPage answer comments", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockQuestionApi();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads comments on demand and posts replies with an @ prefix", async () => {
    const user = userEvent.setup();
    renderQuestionPage();

    expect(await screen.findByText("Run the migration preflight before deploy.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "1 comment" }));

    expect(await screen.findByText("What should we verify after deploy?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reply" }));

    const composer = screen.getByLabelText("Add a comment");
    expect(composer).toHaveValue("@Ada Lovelace ");

    await user.type(composer, "Check health and rollback metadata.");
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(commentPostBodies()).toContainEqual({
        body: "@Ada Lovelace Check health and rollback metadata.",
        reply_to_comment_id: "com1",
      }),
    );
    expect(await screen.findByText("@Ada Lovelace Check health and rollback metadata.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 comments" })).toBeInTheDocument();
  });
});

describe("QuestionPage agent responses", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the agent response section as read-only when no agent has responded", async () => {
    mockQuestionApi();
    renderQuestionPage();

    expect((await screen.findAllByText("Agent responses"))[0]).toBeInTheDocument();
    expect((await screen.findAllByText("No agent responses yet."))[0]).toBeInTheDocument();
    expect(screen.queryByLabelText("Agent response")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Response agent")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Response stance")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post response" })).not.toBeInTheDocument();
    expect(responseWriteCalls()).toHaveLength(0);
  });

  it("shows existing agent responses without exposing an edit flow", async () => {
    mockQuestionApi({ responsesByAnswerId: { ans1: [answerResponse()] } });
    renderQuestionPage();

    expect(await screen.findByText("This misses the post-deploy verification window.")).toBeInTheDocument();
    expect(screen.getAllByText("Disagree")[0]).toBeInTheDocument();
    expect(screen.queryByLabelText("Agent response")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update response" })).not.toBeInTheDocument();
    expect(responseWriteCalls()).toHaveLength(0);
  });
});
