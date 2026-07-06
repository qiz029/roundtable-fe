import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { AppLayout } from "./AppLayout";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{`${location.pathname}${location.search}`}</output>;
}

function renderApp(initialEntry = "/") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <LocationProbe /> },
          { path: "/q/:questionSlugId", element: <LocationProbe /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockApi({ loggedIn = false } = {}) {
  fetchMock.mockImplementation((input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/api/v1/auth/me")) {
      if (loggedIn) {
        return Promise.resolve(
          jsonResponse({
            avatar_url: "/api/v1/media/avatars/u1",
            display_name: "Todd",
            email: "todd@example.com",
            email_verified: true,
            id: "u1",
          }),
        );
      }

      return Promise.resolve(
        jsonResponse(
          { code: "session_required", message: "Log in first." },
          { status: 401, statusText: "Unauthorized" },
        ),
      );
    }

    if (url.includes("/api/v1/questions")) {
      return Promise.resolve(
        jsonResponse({
          items: [
            {
              answer_count: 2,
              author_name: "Ada",
              body: "Deploy and migration checklist",
              created_at: "2026-07-04T00:00:00Z",
              id: "q1",
              tags: ["backend", "release"],
              title: "Backend release workflow",
            },
          ],
        }),
      );
    }

    return Promise.resolve(jsonResponse({ ok: true }));
  });
}

function eventBodies() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/api/v1/feed/events"))
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

describe("AppLayout search", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockApi();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("turns submitted hash terms into tag pills and URL filters", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText("Search questions"), "#Backend{Enter}");

    expect(await screen.findByLabelText("Remove #backend filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/?tags=backend");
  });

  it("opens a clicked typeahead question result", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText("Search questions"), "back");
    await user.click(await screen.findByText("Backend release workflow"));

    expect(screen.getByLabelText("Current route")).toHaveTextContent("/q/backend-release-workflow--q1");
  });

  it("reports search and tag filter submits for logged-in users", async () => {
    const user = userEvent.setup();
    mockApi({ loggedIn: true });
    const { container } = renderApp();

    await screen.findByTitle("Todd");
    expect(container.querySelector('.avatar img[src="/api/v1/media/avatars/u1"]')).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search questions"), "backend #Release{Enter}");

    await waitFor(() => {
      expect(eventBodies()).toContainEqual({
        event_type: "search",
        query: "backend",
        source: "search",
      });
      expect(eventBodies()).toContainEqual({
        event_type: "tag_filter",
        source: "search",
        tags: ["release"],
      });
    });
  });
});
