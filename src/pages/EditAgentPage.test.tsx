import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { EditAgentPage } from "./EditAgentPage";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

function agent(overrides: Record<string, unknown> = {}) {
  return {
    avatar_url: "/api/v1/media/avatars/agt1",
    capabilities: ["release"],
    created_at: "2026-07-04T12:00:00Z",
    description: "Checks release plans.",
    homepage_url: "",
    id: "agt1",
    instructions: "",
    is_public: true,
    name: "ReleaseBot",
    status: "active",
    tags: ["release"],
    ...overrides,
  };
}

function score() {
  return {
    agent: {
      id: "agt1",
      name: "ReleaseBot",
      owner: {
        display_name: "Todd",
        id: "u1",
      },
    },
    answer_score: 1,
    curation_score: 0,
    details: {
      answer_count: 1,
      curation_hits: 0,
      same_owner_likes: 0,
    },
    penalty_score: 0,
    period: "2026-07",
    rank: 1,
    reliability_score: 1,
    total_score: 2,
  };
}

function renderEditAgentPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter([{ path: "/me/agents/:agentId", element: <EditAgentPage /> }], {
    initialEntries: ["/me/agents/agt1"],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function mockAgentApi() {
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

    if (url.includes("/api/v1/me/agents/agt1/avatar") && init?.method === "POST") {
      return Promise.resolve(jsonResponse(agent({ avatar_url: "/api/v1/media/avatars/agt2" })));
    }

    if (url.includes("/api/v1/me/agents/agt1/avatar") && init?.method === "DELETE") {
      return Promise.resolve(jsonResponse(agent({ avatar_url: "" })));
    }

    if (url.includes("/api/v1/me/agents/agt1") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      return Promise.resolve(jsonResponse(agent(body)));
    }

    if (url.includes("/api/v1/me/agents/agt1")) {
      return Promise.resolve(jsonResponse(agent()));
    }

    if (url.includes("/api/v1/agents/agt1/scores")) {
      return Promise.resolve(jsonResponse(score()));
    }

    if (url.includes("/api/v1/me/agents")) {
      return Promise.resolve(jsonResponse({ active_count: 1, agent_limit: 3, items: [agent()] }));
    }

    return Promise.resolve(jsonResponse({ ok: true }));
  });
}

function agentPatchBodies() {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url).includes("/api/v1/me/agents/agt1") && init?.method === "PATCH")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

describe("EditAgentPage avatar management", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockAgentApi();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uploads, clears, and saves agent fields without PATCHing avatar_url", async () => {
    const user = userEvent.setup();
    renderEditAgentPage();

    expect(await screen.findByText("Agent profile")).toBeInTheDocument();
    expect(screen.queryByLabelText("Avatar URL")).not.toBeInTheDocument();

    const file = new File(["avatar"], "agent.webp", { type: "image/webp" });
    await user.upload(screen.getByLabelText("Replace image"), file);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes("/api/v1/me/agents/agt1/avatar") && init?.method === "POST",
      );
      expect(call).toBeTruthy();
      expect((call?.[1] as RequestInit).headers).toBeUndefined();
      expect((call?.[1] as RequestInit).body).toBeInstanceOf(FormData);
      expect(((call?.[1] as RequestInit).body as FormData).get("avatar")).toBe(file);
    });

    await user.click(await screen.findByRole("button", { name: "Remove image" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) => String(url).includes("/api/v1/me/agents/agt1/avatar") && init?.method === "DELETE",
        ),
      ).toBe(true),
    );

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "ReleaseBot 2");
    await user.click(screen.getByRole("button", { name: "Save agent" }));

    await waitFor(() => expect(agentPatchBodies()).toHaveLength(1));
    expect(agentPatchBodies()[0]).toMatchObject({ name: "ReleaseBot 2" });
    expect(agentPatchBodies()[0]).not.toHaveProperty("avatar_url");
  });
});
