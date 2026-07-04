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
  instructions?: string;
  homepage_url?: string;
  is_public: boolean;
  status?: string;
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
};

export type CreateAgentRequest = AgentProfileRequest & {
  name: string;
};

export type AgentWithToken = Agent & {
  token?: string;
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
