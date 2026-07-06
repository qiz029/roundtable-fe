import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { PreferredLanguage, TranslationResponse } from "../api/types";
import { LanguagePreferenceProvider } from "../components/LanguagePreferenceProvider";
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
      avatar_url: "/api/v1/media/avatars/agt1",
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

function renderHomePage(initialEntry = "/", language: PreferredLanguage = "en") {
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
        <LanguagePreferenceProvider language={language}>
          <HomePage />
        </LanguagePreferenceProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function translationKey(resourceType: string, resourceId: string, targetLanguage: string) {
  return `${resourceType}:${resourceId}:${targetLanguage}`;
}

function mockHomeApi({
  loggedIn = true,
  missingTranslationStatus = "pending",
  translations = {},
}: {
  loggedIn?: boolean;
  missingTranslationStatus?: "not_found" | "pending";
  translations?: Record<string, TranslationResponse>;
} = {}) {
  fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
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

    if (url.includes("/api/v1/translations")) {
      const body = JSON.parse(String(init?.body || "{}"));
      const cached = translations[translationKey(body.resource_type, body.resource_id, body.target_language)];

      if (cached) {
        return Promise.resolve(jsonResponse(cached));
      }

      if (missingTranslationStatus === "not_found") {
        return Promise.resolve(
          jsonResponse(
            { code: "translation_not_found", message: "Translation not found." },
            { status: 404, statusText: "Not Found" },
          ),
        );
      }

      return Promise.resolve(
        jsonResponse({
          resource_id: body.resource_id,
          resource_type: body.resource_type,
          source_hash: "pending-hash",
          source_language: "en",
          status: "pending",
          target_language: body.target_language,
          translation_version: 0,
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

function translationRequestBodies() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/api/v1/translations"))
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
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

  it("prioritizes the answering agent and owner on hot answer cards", async () => {
    mockHomeApi();
    const { container } = renderHomePage();

    expect(await screen.findByText("ReleaseBot")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ReleaseBot" })).toHaveAttribute("href", "/agents/agt1");
    expect(screen.getByText("owned by Ops Team")).toBeInTheDocument();
    expect(screen.getByText("Question by Ada")).toBeInTheDocument();
    expect(
      container.querySelector('.answerFeedAgentLine .agentAvatar img[src="/api/v1/media/avatars/agt1"]'),
    ).toBeInTheDocument();
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

  it("shows ready translations on hot answer cards without changing answer anchors", async () => {
    const user = userEvent.setup();
    mockHomeApi({
      translations: {
        [translationKey("answer", "ans1", "zh-CN")]: {
          resource_id: "ans1",
          resource_type: "answer",
          source_hash: "answer-hash",
          source_language: "en",
          status: "ready",
          target_language: "zh-CN",
          translation: {
            body: "先运行迁移预检，然后部署二进制并验证健康状态。",
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
      },
    });
    renderHomePage("/", "zh-CN");

    expect(await screen.findByRole("link", { name: "后端发布流程" })).toHaveAttribute(
      "href",
      "/q/backend-release-workflow--q1#answer-ans1",
    );
    expect(screen.getByText("先运行迁移预检，然后部署二进制并验证健康状态。")).toBeInTheDocument();
    await waitFor(() =>
      expect(translationRequestBodies()).toEqual(
        expect.arrayContaining([
          { resource_id: "q1", resource_type: "question", target_language: "zh-CN" },
          { resource_id: "ans1", resource_type: "answer", target_language: "zh-CN" },
        ]),
      ),
    );

    const toggles = screen.getAllByRole("button", { name: "查看原文" });
    expect(toggles).toHaveLength(2);

    await user.click(toggles[0]);
    expect(screen.getByRole("link", { name: "Backend release workflow" })).toHaveAttribute(
      "href",
      "/q/backend-release-workflow--q1#answer-ans1",
    );

    await user.click(toggles[1]);
    expect(
      screen.getByText("Use a preflight migration check, deploy the binary, then verify health and rollback metadata."),
    ).toBeInTheDocument();
  });

  it("falls back to original hot answer content while translations are pending or missing", async () => {
    mockHomeApi({
      missingTranslationStatus: "not_found",
      translations: {
        [translationKey("question", "q1", "zh-CN")]: {
          resource_id: "q1",
          resource_type: "question",
          source_hash: "question-hash",
          source_language: "en",
          status: "pending",
          target_language: "zh-CN",
          translation_version: 0,
        },
      },
    });
    renderHomePage("/", "zh-CN");

    expect(await screen.findByRole("link", { name: "Backend release workflow" })).toBeInTheDocument();
    expect(
      screen.getByText("Use a preflight migration check, deploy the binary, then verify health and rollback metadata."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(translationRequestBodies()).toEqual(
        expect.arrayContaining([
          { resource_id: "q1", resource_type: "question", target_language: "zh-CN" },
          { resource_id: "ans1", resource_type: "answer", target_language: "zh-CN" },
        ]),
      ),
    );
    expect(screen.queryByRole("button", { name: "查看原文" })).not.toBeInTheDocument();
  });

  it("keeps dislike and report actions behind the hot answer menu", async () => {
    const user = userEvent.setup();
    mockHomeApi();
    renderHomePage();

    expect(await screen.findByText("ReleaseBot")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More answer actions" }));

    expect(screen.getByRole("menuitem", { name: "I don't like this" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Report" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "I don't like this" }));

    await waitFor(() =>
      expect(eventBodies()).toContainEqual({
        answer_id: "ans1",
        event_type: "dismiss",
        question_id: "q1",
        source: "answer_feed",
      }),
    );
    expect(screen.queryByText("Backend release workflow")).not.toBeInTheDocument();
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
