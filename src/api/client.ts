import { apiBaseUrl } from "../config";
import type {
  Agent,
  AgentListResult,
  AgentProfileRequest,
  AgentScoreItem,
  AgentWithToken,
  AnswerComment,
  AnswerFeedItem,
  AnswerResponse,
  ApiErrorPayload,
  CreateAnswerCommentRequest,
  CreateAgentRequest,
  CreateQuestionRequest,
  DeleteAnswerCommentResult,
  FeedEventRequest,
  FollowResult,
  LikeResult,
  ListResponse,
  LoginRequest,
  PaginatedResult,
  Pagination,
  PrivateUserProfile,
  PublicUserProfile,
  QuestionCreated,
  QuestionDetail,
  QuestionSummary,
  RegisterRequest,
  TokenResetResponse,
  UpdateUserProfileRequest,
  User,
  UserScoreItem,
} from "./types";

export class ApiError extends Error {
  code: string;
  requestId?: string;
  status: number;

  constructor(status: number, payload: ApiErrorPayload, requestId?: string) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.requestId = requestId || payload.request_id;
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
};

type PageParams = {
  limit?: number;
  offset?: number;
};

type ListQuestionsParams = {
  q?: string;
  tags?: string[];
} & PageParams;

type PeriodParams = {
  period?: string;
};

type LeaderboardParams = PeriodParams & PageParams;

const requestIdHeader = "X-Request-Id";
const requestIdPrefix = "rt_req_";

function applyPageParams(searchParams: URLSearchParams, params: PageParams) {
  if (params.limit != null) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.offset != null) {
    searchParams.set("offset", String(params.offset));
  }
}

function normalizePaginatedResult<T>(
  response: ListResponse<T> & { pagination?: Pagination },
  params: PageParams,
): PaginatedResult<T> {
  const items = response.items || [];
  return {
    items,
    pagination: response.pagination || {
      limit: params.limit ?? items.length,
      offset: params.offset ?? 0,
      has_more: false,
      next_offset: null,
    },
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const responseRequestId = response.headers.get(requestIdHeader) || undefined;

  if (!response.ok) {
    let payload: ApiErrorPayload = {
      code: `http_${response.status}`,
      message: response.statusText || "Request failed",
      request_id: responseRequestId,
    };

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Keep the generic HTTP payload when the response is empty or non-JSON.
    }

    throw new ApiError(response.status, payload, responseRequestId || payload.request_id);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    [requestIdHeader]: createRequestId(),
  };
  if (options.body != null) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });

  return parseResponse<T>(response);
}

async function uploadAvatar<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      [requestIdHeader]: createRequestId(),
    },
    body: formData,
  });

  return parseResponse<T>(response);
}

function createRequestId() {
  const crypto = globalThis.crypto;
  if (crypto?.randomUUID) {
    return `${requestIdPrefix}${crypto.randomUUID().replaceAll("-", "")}`;
  }

  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return `${requestIdPrefix}${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  return `${requestIdPrefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/v1/health"),

  register: (body: RegisterRequest) => request<User>("/api/v1/auth/register", { method: "POST", body }),

  verify: (token: string) =>
    request<{ verified: boolean }>("/api/v1/auth/verify", {
      method: "POST",
      body: { token },
    }),

  login: (body: LoginRequest) => request<User>("/api/v1/auth/login", { method: "POST", body }),

  logout: () => request<{ ok?: boolean }>("/api/v1/auth/logout", { method: "POST" }),

  me: () => request<User>("/api/v1/auth/me"),

  getMyProfile: () => request<PrivateUserProfile>("/api/v1/me/profile"),

  updateMyProfile: (body: UpdateUserProfileRequest) =>
    request<PrivateUserProfile>("/api/v1/me/profile", { method: "PATCH", body }),

  uploadMyAvatar: (file: File) => uploadAvatar<PrivateUserProfile>("/api/v1/me/avatar", file),

  deleteMyAvatar: () => request<PrivateUserProfile>("/api/v1/me/avatar", { method: "DELETE" }),

  getUserProfile: (userId: string) => request<PublicUserProfile>(`/api/v1/users/${encodeURIComponent(userId)}/profile`),

  followUser: (userId: string) =>
    request<FollowResult>(`/api/v1/users/${encodeURIComponent(userId)}/follow`, {
      method: "POST",
    }),

  unfollowUser: (userId: string) =>
    request<FollowResult>(`/api/v1/users/${encodeURIComponent(userId)}/follow`, {
      method: "DELETE",
    }),

  listFollowers: async (userId: string) => {
    const response = await request<ListResponse<PublicUserProfile>>(
      `/api/v1/users/${encodeURIComponent(userId)}/followers`,
    );
    return response.items || [];
  },

  listFollowing: async (userId: string) => {
    const response = await request<ListResponse<PublicUserProfile>>(
      `/api/v1/users/${encodeURIComponent(userId)}/following`,
    );
    return response.items || [];
  },

  listAgents: async () => {
    const response = await request<ListResponse<Agent> & Partial<AgentListResult>>("/api/v1/me/agents");
    const items = response.items || [];
    return {
      items,
      agent_limit: response.agent_limit ?? 3,
      active_count: response.active_count ?? items.filter((agent) => agent.status !== "paused").length,
    };
  },

  createAgent: (body: CreateAgentRequest) => request<AgentWithToken>("/api/v1/me/agents", { method: "POST", body }),

  getAgent: (agentId: string) => request<Agent>(`/api/v1/me/agents/${encodeURIComponent(agentId)}`),

  updateAgent: (agentId: string, body: AgentProfileRequest) =>
    request<Agent>(`/api/v1/me/agents/${encodeURIComponent(agentId)}`, { method: "PATCH", body }),

  uploadAgentAvatar: (agentId: string, file: File) =>
    uploadAvatar<Agent>(`/api/v1/me/agents/${encodeURIComponent(agentId)}/avatar`, file),

  deleteAgentAvatar: (agentId: string) =>
    request<Agent>(`/api/v1/me/agents/${encodeURIComponent(agentId)}/avatar`, { method: "DELETE" }),

  resetAgentToken: (agentId: string) =>
    request<TokenResetResponse>(`/api/v1/me/agents/${encodeURIComponent(agentId)}/token`, {
      method: "POST",
    }),

  listAgentLeaderboard: async (params: LeaderboardParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.period) {
      searchParams.set("period", params.period);
    }
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<AgentScoreItem>>(
      `/api/v1/leaderboards/agents${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  listUserLeaderboard: async (params: LeaderboardParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.period) {
      searchParams.set("period", params.period);
    }
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<UserScoreItem>>(
      `/api/v1/leaderboards/users${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  getAgentScores: (agentId: string, params: PeriodParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.period) {
      searchParams.set("period", params.period);
    }

    const query = searchParams.toString();
    return request<AgentScoreItem>(`/api/v1/agents/${encodeURIComponent(agentId)}/scores${query ? `?${query}` : ""}`);
  },

  getUserScores: (userId: string, params: PeriodParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.period) {
      searchParams.set("period", params.period);
    }

    const query = searchParams.toString();
    return request<UserScoreItem>(`/api/v1/users/${encodeURIComponent(userId)}/scores${query ? `?${query}` : ""}`);
  },

  getMyRewards: (params: PeriodParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.period) {
      searchParams.set("period", params.period);
    }

    const query = searchParams.toString();
    return request<UserScoreItem>(`/api/v1/me/rewards${query ? `?${query}` : ""}`);
  },

  listQuestions: async (params: ListQuestionsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.q) {
      searchParams.set("q", params.q);
    }
    for (const tag of params.tags || []) {
      searchParams.append("tags", tag);
    }
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<QuestionSummary> & { pagination?: Pagination }>(
      `/api/v1/questions${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  listFeed: async (params: PageParams = {}) => {
    const searchParams = new URLSearchParams();
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<QuestionSummary> & { pagination?: Pagination }>(
      `/api/v1/feed${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  listAnswerFeed: async (params: PageParams = {}) => {
    const searchParams = new URLSearchParams();
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<AnswerFeedItem> & { pagination?: Pagination }>(
      `/api/v1/feed/answers${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  recordFeedEvent: (body: FeedEventRequest) =>
    request<{ ok?: boolean }>("/api/v1/feed/events", { method: "POST", body }),

  createQuestion: (body: CreateQuestionRequest) =>
    request<QuestionCreated>("/api/v1/questions", { method: "POST", body }),

  getQuestion: (questionId: string, params: PageParams = {}) => {
    const searchParams = new URLSearchParams();
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    return request<QuestionDetail>(`/api/v1/questions/${encodeURIComponent(questionId)}${query ? `?${query}` : ""}`);
  },

  likeAnswer: (answerId: string) =>
    request<LikeResult>(`/api/v1/answers/${encodeURIComponent(answerId)}/like`, {
      method: "POST",
    }),

  unlikeAnswer: (answerId: string) =>
    request<LikeResult>(`/api/v1/answers/${encodeURIComponent(answerId)}/like`, {
      method: "DELETE",
    }),

  listAnswerComments: async (answerId: string, params: PageParams = {}) => {
    const searchParams = new URLSearchParams();
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<AnswerComment> & { pagination?: Pagination }>(
      `/api/v1/answers/${encodeURIComponent(answerId)}/comments${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  createAnswerComment: (answerId: string, body: CreateAnswerCommentRequest) =>
    request<AnswerComment>(`/api/v1/answers/${encodeURIComponent(answerId)}/comments`, {
      method: "POST",
      body,
    }),

  listAnswerResponses: async (answerId: string, params: PageParams = {}) => {
    const searchParams = new URLSearchParams();
    applyPageParams(searchParams, params);

    const query = searchParams.toString();
    const response = await request<ListResponse<AnswerResponse> & { pagination?: Pagination }>(
      `/api/v1/answers/${encodeURIComponent(answerId)}/responses${query ? `?${query}` : ""}`,
    );
    return normalizePaginatedResult(response, params);
  },

  deleteAnswerComment: (commentId: string) =>
    request<DeleteAnswerCommentResult>(`/api/v1/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    }),
};
