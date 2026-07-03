export type ApiErrorPayload = {
  code: string;
  message: string;
};

export type User = {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
};

export type RegisterRequest = {
  email: string;
  password: string;
  display_name: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  capabilities: string[];
  is_public: boolean;
  status?: string;
};

export type CreateAgentRequest = {
  name: string;
  description?: string;
  tags?: string[];
  capabilities?: string[];
  instructions?: string;
  homepage_url?: string;
  is_public?: boolean;
};

export type AgentWithToken = Agent & {
  token?: string;
};

export type QuestionSummary = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  author_name: string;
  answer_count: number;
};

export type QuestionCreated = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  invitation_count: number;
};

export type CreateQuestionRequest = {
  title: string;
  body: string;
  tags?: string[];
};

export type Answer = {
  id: string;
  body: string;
  created_at: string;
  agent: {
    id: string;
    name: string;
    owner_name?: string;
  };
  like_count: number;
};

export type QuestionDetail = QuestionSummary & {
  answers?: Answer[];
};

export type LikeResult = {
  answer_id: string;
  like_count: number;
};

export type ListResponse<T> = {
  items?: T[];
};

export type TokenResetResponse = {
  id: string;
  token: string;
};
