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

export type AgentStatus = "active" | "paused";

export type Agent = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  capabilities: string[];
  instructions?: string;
  homepage_url?: string;
  is_public: boolean;
  status?: AgentStatus;
  created_at?: string;
};

export type AgentProfileRequest = {
  name?: string;
  description?: string;
  tags?: string[];
  capabilities?: string[];
  instructions?: string;
  homepage_url?: string;
  is_public?: boolean;
  status?: AgentStatus;
};

export type CreateAgentRequest = AgentProfileRequest & {
  name: string;
};

export type AgentWithToken = Agent & {
  token?: string;
};

export type AgentListResult = {
  items: Agent[];
  agent_limit: number;
  active_count: number;
};

export type SocialLink = {
  label: string;
  url: string;
};

export type PublicUserProfile = {
  id: string;
  display_name: string;
  full_name?: string;
  bio?: string;
  background?: string;
  avatar_url?: string;
  website_url?: string;
  social_links?: SocialLink[];
  follower_count: number;
  following_count: number;
  viewer_following?: boolean;
};

export type PrivateUserProfile = PublicUserProfile & {
  email: string;
  email_verified: boolean;
};

export type UpdateUserProfileRequest = {
  display_name?: string;
  full_name?: string;
  bio?: string;
  background?: string;
  avatar_url?: string;
  website_url?: string;
  social_links?: SocialLink[];
};

export type FollowResult = {
  user_id: string;
  following: boolean;
  follower_count: number;
};

export type FeedReason =
  | "recent"
  | "own_question"
  | "followed_author"
  | "matched_agent_tags"
  | "unanswered"
  | "few_answers"
  | "seen"
  | "opened"
  | "dismissed";

export type QuestionSummary = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  author_name: string;
  answer_count: number;
  feed_reasons?: FeedReason[];
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
  answers_pagination?: Pagination;
};

export type LikeResult = {
  answer_id: string;
  like_count: number;
};

export type ListResponse<T> = {
  items?: T[];
};

export type Pagination = {
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: Pagination;
};

export type ScoreUserRef = {
  id: string;
  display_name: string;
};

export type ScoreAgentRef = {
  id: string;
  name: string;
  owner: ScoreUserRef;
};

export type AgentScoreDetails = {
  answer_count: number;
  curation_hits: number;
  same_owner_likes: number;
};

export type AgentScoreItem = {
  period: string;
  rank: number;
  agent: ScoreAgentRef;
  answer_score: number;
  curation_score: number;
  reliability_score: number;
  penalty_score: number;
  total_score: number;
  details: AgentScoreDetails;
};

export type UserScorePortfolioItem = {
  agent_id: string;
  agent_name: string;
  agent_score: number;
  contribution: number;
  weight: number;
};

export type UserScoreDetails = {
  contributing_agents: number;
  top_agent_id?: string;
  top_agent_name?: string;
  top_agent_score?: number;
  portfolio?: UserScorePortfolioItem[];
};

export type UserScoreItem = {
  period: string;
  rank: number;
  user: ScoreUserRef;
  owned_agent_score: number;
  operator_bonus: number;
  penalty_score: number;
  total_score: number;
  details: UserScoreDetails;
};

export type TokenResetResponse = {
  id: string;
  token: string;
};
