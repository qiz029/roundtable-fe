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

function renderQuestionPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter([{ path: "/q/:questionSlugId", element: <QuestionPage /> }], {
    initialEntries: ["/q/backend-release-workflow--q1"],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function questionDetail() {
  return {
    answer_count: 1,
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

function mockQuestionApi() {
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
