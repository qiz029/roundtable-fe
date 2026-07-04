import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { PublicUserProfile } from "../api/types";
import { LoadingState } from "../components/LoadingState";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { UserScoreSummary } from "../components/ScoreSummary";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { compactNumber, currentPeriod } from "../lib/format";

export function UserProfilePage() {
  const { userId } = useParams();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const scorePeriod = currentPeriod();
  const profile = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => api.getUserProfile(userId!),
    enabled: Boolean(userId),
  });
  const followers = useQuery({
    queryKey: ["user-followers", userId],
    queryFn: () => api.listFollowers(userId!),
    enabled: Boolean(userId),
  });
  const following = useQuery({
    queryKey: ["user-following", userId],
    queryFn: () => api.listFollowing(userId!),
    enabled: Boolean(userId),
  });
  const userScore = useQuery({
    queryKey: ["user-score", userId, scorePeriod],
    queryFn: () => api.getUserScores(userId!, { period: scorePeriod }),
    enabled: Boolean(userId),
    retry: false,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profile.data) throw new Error("Profile is not loaded.");
      return profile.data.viewer_following ? api.unfollowUser(profile.data.id) : api.followUser(profile.data.id);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PublicUserProfile>(["user-profile", userId], (current) =>
        current
          ? {
              ...current,
              follower_count: result.follower_count,
              viewer_following: result.following,
            }
          : current,
      );
      queryClient.invalidateQueries({ queryKey: ["user-followers", userId] });
    },
  });

  if (profile.isLoading) {
    return (
      <div className="pageNarrow">
        <LoadingState label="Loading profile" />
      </div>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <div className="pageNarrow">
        <div className="errorCard">{getErrorMessage(profile.error)}</div>
      </div>
    );
  }

  const data = profile.data;
  const isOwnProfile = currentUser.data?.id === data.id;
  const displayName = data.full_name || data.display_name;

  return (
    <div className="profilePage">
      <section className="publicProfileHero">
        <ProfileAvatar name={displayName} url={data.avatar_url} size="lg" />
        <div className="publicProfileMain">
          <div className="profileNameLine">
            <h1>{displayName}</h1>
            <span>{data.display_name}</span>
          </div>
          <p>{data.bio || "No bio yet."}</p>
          {data.background ? <p>{data.background}</p> : null}
          <div className="profileStats">
            <span>
              <b>{compactNumber(data.follower_count)}</b> followers
            </span>
            <span>
              <b>{compactNumber(data.following_count)}</b> following
            </span>
          </div>
        </div>
        <div className="profileActions">
          {isOwnProfile ? (
            <Link to="/me/profile" className="button buttonSecondary">
              Edit profile
            </Link>
          ) : currentUser.data ? (
            <button
              className={data.viewer_following ? "button buttonSecondary" : "button buttonPrimary"}
              disabled={followMutation.isPending}
              onClick={() => followMutation.mutate()}
            >
              {followMutation.isPending ? "Saving..." : data.viewer_following ? "Following" : "Follow"}
            </button>
          ) : (
            <Link to="/login" className="button buttonPrimary">
              Log in to follow
            </Link>
          )}
        </div>
      </section>

      {followMutation.error ? <div className="errorCard">{getErrorMessage(followMutation.error)}</div> : null}

      <div className="profileContentGrid">
        <section className="profilePanel">
          <h2>
            Monthly score <span>{scorePeriod}</span>
          </h2>
          {userScore.isLoading ? <LoadingState label="Loading score" /> : null}
          {userScore.error ? <p>No score for this period yet.</p> : null}
          {userScore.data ? <UserScoreSummary score={userScore.data} /> : null}
        </section>

        <section className="profilePanel">
          <h2>Links</h2>
          {data.website_url ? (
            <a className="profileExternalLink" href={data.website_url} target="_blank" rel="noreferrer">
              Website
            </a>
          ) : null}
          {data.social_links?.length ? (
            <div className="profileLinkList">
              {data.social_links.map((link) => (
                <a href={link.url} key={`${link.label}-${link.url}`} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          ) : !data.website_url ? (
            <p>No public links yet.</p>
          ) : null}
        </section>

        <ProfileList title="Followers" loading={followers.isLoading} profiles={followers.data || []} />
        <ProfileList title="Following" loading={following.isLoading} profiles={following.data || []} />
      </div>
    </div>
  );
}

function ProfileList({ title, loading, profiles }: { title: string; loading: boolean; profiles: PublicUserProfile[] }) {
  return (
    <section className="profilePanel">
      <h2>
        {title} <span>{profiles.length}</span>
      </h2>
      {loading ? <LoadingState label={`Loading ${title.toLowerCase()}`} /> : null}
      {!loading && profiles.length === 0 ? <p>No users yet.</p> : null}
      <div className="profileMiniList">
        {profiles.map((profile) => {
          const name = profile.full_name || profile.display_name;
          return (
            <Link to={`/users/${profile.id}`} key={profile.id} className="profileMiniRow">
              <ProfileAvatar name={name} url={profile.avatar_url} size="sm" />
              <span>
                <b>{name}</b>
                <small>{compactNumber(profile.follower_count)} followers</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
