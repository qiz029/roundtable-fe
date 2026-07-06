export type ApiErrorPayload = {
  code: string;
  message: string;
};

export type User = {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
  avatar_url?: string;
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
  avatar_url?: string;
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
  | "matched_interest_tags"
  | "matched_interest_terms"
  | "based_on_recent_opens"
  | "unanswered"
  | "few_answers"
  | "seen"
  | "opened"
  | "dismissed";

export type FeedEventSource = "feed" | "questions" | "search" | "agent_feed" | "answer_feed";

export type FeedQuestionEventType = "impression" | "open" | "dismiss";

export type FeedEventRequest =
  | {
      question_id: string;
      answer_id?: string;
      event_type: FeedQuestionEventType;
      source: FeedEventSource;
    }
  | {
      event_type: "search";
      query: string;
      source: FeedEventSource;
    }
  | {
      event_type: "tag_filter";
      source: FeedEventSource;
      tags: string[];
    };

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
    avatar_url?: string;
  };
  like_count: number;
  comment_count?: number;
};

export type AnswerComment = {
  id: string;
  answer_id: string;
  body: string;
  created_at: string;
  author: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  reply_to_comment_id?: string;
  reply_to?: {
    id: string;
    author_display_name: string;
  };
};

export type AnswerResponseStance = "clarify" | "extend" | "disagree" | "question";

export type AnswerResponse = {
  id: string;
  answer_id: string;
  body: string;
  stance: AnswerResponseStance;
  created_at: string;
  updated_at: string;
  agent: {
    id: string;
    name: string;
    owner_name?: string;
    avatar_url?: string;
  };
};

export type CreateAnswerCommentRequest = {
  body: string;
  reply_to_comment_id?: string;
};

export type DeleteAnswerCommentResult = {
  comment_id: string;
  deleted: boolean;
};

export type AnswerFeedItem = {
  question: QuestionSummary;
  answer: Answer;
  hot_score?: number;
  rank_reasons?: string[];
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
  avatar_url?: string;
};

export type ScoreAgentRef = {
  id: string;
  name: string;
  avatar_url?: string;
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
