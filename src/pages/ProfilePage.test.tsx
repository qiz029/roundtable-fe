import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
    ...init,
  });
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    avatar_url: "/api/v1/media/avatars/u1",
    bio: "Builder",
    display_name: "Todd",
    email: "todd@example.com",
    email_verified: true,
    follower_count: 0,
    following_count: 0,
    full_name: "Todd Zheng",
    id: "u1",
    social_links: [],
    website_url: "",
    ...overrides,
  };
}

function renderProfilePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockProfileApi() {
  fetchMock.mockImplementation((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/v1/auth/me")) {
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

    if (url.includes("/api/v1/me/profile") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      return Promise.resolve(jsonResponse(profile({ ...body, avatar_url: "/api/v1/media/avatars/u2" })));
    }

    if (url.includes("/api/v1/me/profile")) {
      return Promise.resolve(jsonResponse(profile()));
    }

    if (url.includes("/api/v1/me/avatar") && init?.method === "POST") {
      return Promise.resolve(jsonResponse(profile({ avatar_url: "/api/v1/media/avatars/u2" })));
    }

    if (url.includes("/api/v1/me/avatar") && init?.method === "DELETE") {
      return Promise.resolve(jsonResponse(profile({ avatar_url: "" })));
    }

    return Promise.resolve(jsonResponse({ ok: true }));
  });
}

function profilePatchBodies() {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url).includes("/api/v1/me/profile") && init?.method === "PATCH")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

describe("ProfilePage avatar management", () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockProfileApi();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uploads, clears, and saves profile fields without PATCHing avatar_url", async () => {
    const user = userEvent.setup();
    renderProfilePage();

    expect(await screen.findByText("Edit your public identity")).toBeInTheDocument();
    expect(screen.queryByLabelText("Avatar URL")).not.toBeInTheDocument();

    const uploadInput = screen.getByLabelText("Replace image");
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await user.upload(uploadInput, file);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes("/api/v1/me/avatar") && init?.method === "POST",
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
          ([url, init]) => String(url).includes("/api/v1/me/avatar") && init?.method === "DELETE",
        ),
      ).toBe(true),
    );

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Todd Z");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(profilePatchBodies()).toHaveLength(1));
    expect(profilePatchBodies()[0]).toMatchObject({ display_name: "Todd Z" });
    expect(profilePatchBodies()[0]).not.toHaveProperty("avatar_url");
  });
});
