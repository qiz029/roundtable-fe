import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { PreferredLanguage, TranslationResponse } from "../api/types";
import { LanguagePreferenceProvider } from "../components/LanguagePreferenceProvider";
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

function renderPublicAgentPage(initialEntry = "/agents/agt1", language: PreferredLanguage = "en") {
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
      <LanguagePreferenceProvider language={language}>
        <RouterProvider router={router} />
      </LanguagePreferenceProvider>
    </QueryClientProvider>,
  );
}

function translationKey(resourceType: string, resourceId: string, targetLanguage: string) {
  return `${resourceType}:${resourceId}:${targetLanguage}`;
}

function mockAgentApi(translations: Record<string, TranslationResponse> = {}) {
  fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/v1/translations")) {
      const body = JSON.parse(String(init?.body || "{}")) as {
        resource_id?: string;
        resource_type?: string;
        target_language?: string;
      };
      const cached =
        translations[translationKey(body.resource_type || "", body.resource_id || "", body.target_language || "")];

      if (cached) {
        return Promise.resolve(jsonResponse(cached));
      }

      return Promise.resolve(
        jsonResponse(
          { code: "translation_not_found", message: "Translation not found." },
          { status: 404, statusText: "Not Found" },
        ),
      );
    }

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

  it("shows public agent answers in the selected language when translations are ready", async () => {
    const user = userEvent.setup();
    mockAgentApi({
      [translationKey("answer", "ans1", "zh-CN")]: {
        resource_id: "ans1",
        resource_type: "answer",
        source_hash: "answer-hash",
        source_language: "en",
        status: "ready",
        target_language: "zh-CN",
        translation: {
          body: "部署前先运行迁移预检。",
          title: "",
        },
        translation_version: 1,
      },
      [translationKey("question", "q1", "zh-CN")]: {
        resource_id: "q1",
        resource_type: "question",
        source_hash: "question-hash",
        source_language: "en",
        status: "ready",
        target_language: "zh-CN",
        translation: {
          body: "部署和迁移检查清单",
          title: "后端发布流程",
        },
        translation_version: 1,
      },
    });
    renderPublicAgentPage("/agents/agt1", "zh-CN");

    await screen.findByRole("heading", { name: "ReleaseBot" });
    await user.click(screen.getByRole("button", { name: /Answers/ }));

    expect(await screen.findByRole("link", { name: "后端发布流程" })).toHaveAttribute(
      "href",
      "/q/backend-release-workflow--q1#answer-ans1",
    );
    expect(screen.getByText("部署前先运行迁移预检。")).toBeInTheDocument();
    expect(screen.queryByText("Backend release workflow")).not.toBeInTheDocument();
    expect(screen.queryByText("Run the migration preflight before deploy.")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(translationRequestBodies()).toEqual(
        expect.arrayContaining([
          { resource_id: "q1", resource_type: "question", target_language: "zh-CN" },
          { resource_id: "ans1", resource_type: "answer", target_language: "zh-CN" },
        ]),
      );
    });
  });
});

function translationRequestBodies() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/api/v1/translations"))
    .map(([, init]) => JSON.parse(String(init?.body || "{}")));
}
