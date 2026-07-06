import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { PublicAgentPage } from "./PublicAgentPage";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

function publicAgent() {
  return {
    answer_count: 1,
    avatar_url: "/api/v1/media/avatars/agt1",
    capabilities: ["release checks"],
    created_at: "2026-07-04T12:00:00Z",
    description: "Checks deployment plans before they go live.",
    homepage_url: "https://example.com/releasebot",
    id: "agt1",
    is_public: true,
    name: "ReleaseBot",
    owner_name: "Ops Team",
    status: "active",
    tags: ["release"],
  };
}

function agentAnswer() {
  return {
    answer: {
      agent: {
        avatar_url: "/api/v1/media/avatars/agt1",
        id: "agt1",
        name: "ReleaseBot",
        owner_name: "Ops Team",
      },
      body: "Run the migration preflight before deploy.",
      comment_count: 2,
      created_at: "2026-07-04T12:05:00Z",
      id: "ans1",
      like_count: 7,
    },
    question: {
      answer_count: 1,
      author_name: "Ada",
      body: "Deploy and migration checklist",
      created_at: "2026-07-04T12:00:00Z",
      id: "q1",
      tags: ["release"],
      title: "Backend release workflow",
    },
  };
}

function renderPublicAgentPage(initialEntry = "/agents/agt1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter([{ path: "/agents/:agentId", element: <PublicAgentPage /> }], {
    initialEntries: [initialEntry],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockAgentApi() {
  fetchMock.mockImplementation((input: string | URL | Request) => {
    const url = String(input);

    if (url.includes("/api/v1/agents/agt1/answers")) {
      return Promise.resolve(
        jsonResponse({
          items: [agentAnswer()],
          pagination: {
            has_more: false,
            limit: 100,
            next_offset: null,
            offset: 0,
          },
        }),
      );
    }

    if (url.includes("/api/v1/agents/agt1")) {
      return Promise.resolve(jsonResponse(publicAgent()));
    }

    return Promise.resolve(jsonResponse({ ok: true }));
  });
}

describe("PublicAgentPage", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockAgentApi();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows public agent identity and keeps sections collapsed by default", async () => {
    renderPublicAgentPage();

    expect(await screen.findByRole("heading", { name: "ReleaseBot" })).toBeInTheDocument();
    expect(screen.getByText("Owned by Ops Team")).toBeInTheDocument();
    expect(screen.queryByText("Checks deployment plans before they go live.")).not.toBeInTheDocument();
    expect(screen.queryByText("Backend release workflow")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/answers"))).toBe(false);
  });

  it("expands description and lazy-loads public answers", async () => {
    const user = userEvent.setup();
    renderPublicAgentPage();

    await screen.findByRole("heading", { name: "ReleaseBot" });
    await user.click(screen.getByRole("button", { name: /Description/ }));

    expect(screen.getByText("Checks deployment plans before they go live.")).toBeInTheDocument();
    expect(screen.getByText("#release")).toBeInTheDocument();
    expect(screen.getByText("release checks")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Answers/ }));

    expect(await screen.findByRole("link", { name: "Backend release workflow" })).toHaveAttribute(
      "href",
      "/q/backend-release-workflow--q1#answer-ans1",
    );
    expect(screen.getByText("Run the migration preflight before deploy.")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls).toContainEqual([
        "/api/v1/agents/agt1/answers?limit=100&offset=0",
        expect.any(Object),
      ]),
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/v1/me/agents"))).toBe(false);
  });
});
