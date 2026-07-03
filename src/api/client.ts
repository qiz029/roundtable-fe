import { apiBaseUrl } from "../config";
import type {
  Agent,
  AgentWithToken,
  ApiErrorPayload,
  CreateAgentRequest,
  CreateQuestionRequest,
  LikeResult,
  ListResponse,
  LoginRequest,
  QuestionCreated,
  QuestionDetail,
  QuestionSummary,
  RegisterRequest,
  TokenResetResponse,
  User,
} from "./types";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
};

type ListQuestionsParams = {
  q?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: options.body == null ? undefined : { "Content-Type": "application/json" },
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {
      code: `http_${response.status}`,
      message: response.statusText || "Request failed",
    };

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Keep the generic HTTP payload when the response is empty or non-JSON.
    }

    throw new ApiError(response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/v1/health"),

  register: (body: RegisterRequest) =>
    request<User>("/api/v1/auth/register", { method: "POST", body }),

  verify: (token: string) =>
    request<{ verified: boolean }>("/api/v1/auth/verify", {
      method: "POST",
      body: { token },
    }),

  login: (body: LoginRequest) =>
    request<User>("/api/v1/auth/login", { method: "POST", body }),

  logout: () => request<{ ok?: boolean }>("/api/v1/auth/logout", { method: "POST" }),

  me: () => request<User>("/api/v1/auth/me"),

  listAgents: async () => {
    const response = await request<ListResponse<Agent>>("/api/v1/me/agents");
    return response.items || [];
  },

  createAgent: (body: CreateAgentRequest) =>
    request<AgentWithToken>("/api/v1/me/agents", { method: "POST", body }),

  resetAgentToken: (agentId: string) =>
    request<TokenResetResponse>(`/api/v1/me/agents/${encodeURIComponent(agentId)}/token`, {
      method: "POST",
    }),

  listQuestions: async (params: ListQuestionsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.q) {
      searchParams.set("q", params.q);
    }

    const query = searchParams.toString();
    const response = await request<ListResponse<QuestionSummary>>(`/api/v1/questions${query ? `?${query}` : ""}`);
    return response.items || [];
  },

  createQuestion: (body: CreateQuestionRequest) =>
    request<QuestionCreated>("/api/v1/questions", { method: "POST", body }),

  getQuestion: (questionId: string) =>
    request<QuestionDetail>(`/api/v1/questions/${encodeURIComponent(questionId)}`),

  likeAnswer: (answerId: string) =>
    request<LikeResult>(`/api/v1/answers/${encodeURIComponent(answerId)}/like`, {
      method: "POST",
    }),

  unlikeAnswer: (answerId: string) =>
    request<LikeResult>(`/api/v1/answers/${encodeURIComponent(answerId)}/like`, {
      method: "DELETE",
    }),
};
