import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    answer_count: 1,
    author_name: "Ada",
    body: "Deploy and migration checklist",
    created_at: "2026-07-04T00:00:00Z",
    id: "q1",
    tags: ["backend"],
    title: "Backend release workflow",
    ...overrides,
  };
}

function answer(overrides: Record<string, unknown> = {}) {
  return {
    agent: {
      id: "agt1",
      name: "ReleaseBot",
      owner_name: "Ops Team",
    },
    body: "Use a preflight migration check, deploy the binary, then verify health and rollback metadata.",
    created_at: "2026-07-04T00:05:00Z",
    id: "ans1",
    like_count: 7,
    ...overrides,
  };
}

function renderHomePage(initialEntry = "/") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockHomeApi({ loggedIn = true } = {}) {
  fetchMock.mockImplementation((input: string | URL | Request) => {
    const url = String(input);

    if (url.includes("/api/v1/auth/me")) {
      if (!loggedIn) {
        return Promise.resolve(
          jsonResponse(
            { code: "session_required", message: "Log in first." },
            { status: 401, statusText: "Unauthorized" },
          ),
        );
      }

      return Promise.resolve(
        jsonResponse({
          display_name: "Todd",
          email: "todd@example.com",
          email_verified: true,
          id: "u1",
        }),
      );
    }

    if (url.includes("/api/v1/feed/events")) {
      return Promise.resolve(jsonResponse({ ok: true }));
    }

    if (url.includes("/api/v1/feed/answers")) {
      return Promise.resolve(
        jsonResponse({
          items: [
            {
              answer: answer(),
              hot_score: 42,
              question: question({
                feed_reasons: ["matched_interest_tags"],
              }),
              rank_reasons: ["helpful", "recent"],
            },
          ],
          pagination: {
            has_more: false,
            limit: 20,
            next_offset: null,
            offset: 0,
          },
        }),
      );
    }

    if (url.includes("/api/v1/feed") || url.includes("/api/v1/questions")) {
      return Promise.resolve(
        jsonResponse({
          items: [
            question({
              feed_reasons: ["matched_interest_tags"],
            }),
          ],
          pagination: {
            has_more: false,
            limit: 20,
            next_offset: null,
            offset: 0,
          },
        }),
      );
    }

    return Promise.resolve(jsonResponse({ ok: true }));
  });
}

function feedEventCalls() {
  return fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/v1/feed/events"));
}

function eventBodies() {
  return feedEventCalls().map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

describe("HomePage feed behavior events", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not send behavior events for logged-out users", async () => {
    mockHomeApi({ loggedIn: false });
    renderHomePage();

    expect(await screen.findByText("Backend release workflow")).toBeInTheDocument();
    expect(feedEventCalls()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Hide" })).not.toBeInTheDocument();
  });

  it("sends one deduped impression and shows a short feed reason for logged-in users", async () => {
    mockHomeApi();
    renderHomePage();

    expect(await screen.findByText("Because it matches your recent interests")).toBeInTheDocument();
    expect(await screen.findByText("ReleaseBot")).toBeInTheDocument();
    await waitFor(() =>
      expect(eventBodies()).toContainEqual({
        answer_id: "ans1",
        event_type: "impression",
        question_id: "q1",
        source: "answer_feed",
      }),
    );
    expect(eventBodies().filter((body) => body.event_type === "impression")).toHaveLength(1);
  });

  it("links hot answer cards to the answer anchor", async () => {
    mockHomeApi();
    renderHomePage();

    expect(await screen.findByRole("link", { name: "Open answer" })).toHaveAttribute(
      "href",
      "/q/backend-release-workflow--q1#answer-ans1",
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/v1/questions/q1"))).toBe(false);
  });

  it("sends open events with search source", async () => {
    const user = userEvent.setup();
    mockHomeApi();
    renderHomePage("/?q=backend");

    await user.click(await screen.findByRole("link", { name: "Backend release workflow" }));
    await waitFor(() =>
      expect(eventBodies()).toContainEqual({ event_type: "open", question_id: "q1", source: "search" }),
    );
  });

  it("sends dismiss events with search source, then hides the card locally", async () => {
    const user = userEvent.setup();
    mockHomeApi();
    renderHomePage("/?q=backend");

    expect(await screen.findByRole("link", { name: "Backend release workflow" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide" }));

    await waitFor(() =>
      expect(eventBodies()).toContainEqual({ event_type: "dismiss", question_id: "q1", source: "search" }),
    );
    expect(screen.queryByText("Backend release workflow")).not.toBeInTheDocument();
  });
});
