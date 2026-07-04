import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { PrivateUserProfile, SocialLink } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { compactNumber } from "../lib/format";

function serializeSocialLinks(links: SocialLink[] = []) {
  return links.map((link) => `${link.label} | ${link.url}`).join("\n");
}

function parseSocialLinks(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, urlPart] = line.includes("|") ? line.split("|") : line.split(/\s+/, 2);
      return {
        label: labelPart?.trim() || "",
        url: urlPart?.trim() || "",
      };
    })
    .filter((link) => link.label && link.url);
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [form, setForm] = useState({
    display_name: "",
    full_name: "",
    bio: "",
    background: "",
    avatar_url: "",
    website_url: "",
    social_links: "",
  });

  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: api.getMyProfile,
    enabled: Boolean(currentUser.data),
  });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      display_name: profile.data.display_name || "",
      full_name: profile.data.full_name || "",
      bio: profile.data.bio || "",
      background: profile.data.background || "",
      avatar_url: profile.data.avatar_url || "",
      website_url: profile.data.website_url || "",
      social_links: serializeSocialLinks(profile.data.social_links),
    });
  }, [profile.data]);

  const updateProfile = useMutation({
    mutationFn: api.updateMyProfile,
    onSuccess: async (result) => {
      queryClient.setQueryData<PrivateUserProfile>(["my-profile"], result);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile.mutate({
      display_name: form.display_name.trim(),
      full_name: form.full_name.trim(),
      bio: form.bio.trim(),
      background: form.background.trim(),
      avatar_url: form.avatar_url.trim(),
      website_url: form.website_url.trim(),
      social_links: parseSocialLinks(form.social_links),
    });
  }

  if (!currentUser.data && !currentUser.isLoading) {
    return (
      <div className="pageNarrow">
        <EmptyState
          title="Log in to edit your profile"
          body="Profile settings are tied to your roundtable account."
          action={
            <Link to="/login" className="button buttonPrimary">
              Log in
            </Link>
          }
        />
      </div>
    );
  }

  if (profile.isLoading || currentUser.isLoading) {
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

  const previewName = form.full_name || form.display_name || profile.data.display_name;
  const previewLinks = parseSocialLinks(form.social_links);

  return (
    <div className="profileShell">
      <section className="profileEditor">
        <div className="profileSectionHeader">
          <div>
            <span className="eyebrow">Your profile</span>
            <h1>Edit your public identity</h1>
          </div>
          {updateProfile.isSuccess ? <span className="saveState">Saved</span> : null}
        </div>

        <form className="profileForm" onSubmit={handleSubmit}>
          <section className="profilePanel">
            <h2>Identity</h2>
            <div className="profileAvatarRow">
              <ProfileAvatar name={previewName} url={form.avatar_url} size="lg" />
              <div>
                <p>Use an image URL for now. File uploads are not exposed by the backend.</p>
                <label>
                  Avatar URL
                  <input
                    value={form.avatar_url}
                    onChange={(event) => updateField("avatar_url", event.target.value)}
                    placeholder="https://example.com/avatar.png"
                  />
                </label>
              </div>
            </div>
            <div className="twoColumnFields">
              <label>
                Display name
                <input
                  value={form.display_name}
                  onChange={(event) => updateField("display_name", event.target.value)}
                  required
                />
              </label>
              <label>
                Full name
                <input value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="profilePanel">
            <h2>Bio</h2>
            <label>
              Bio
              <textarea value={form.bio} onChange={(event) => updateField("bio", event.target.value)} rows={4} />
            </label>
            <label>
              Background
              <textarea
                value={form.background}
                onChange={(event) => updateField("background", event.target.value)}
                rows={4}
              />
            </label>
          </section>

          <section className="profilePanel">
            <h2>Links</h2>
            <label>
              Website
              <input
                value={form.website_url}
                onChange={(event) => updateField("website_url", event.target.value)}
                placeholder="https://example.com"
              />
            </label>
            <label>
              Social links
              <textarea
                value={form.social_links}
                onChange={(event) => updateField("social_links", event.target.value)}
                rows={4}
                placeholder={"GitHub | https://github.com/example\nX | https://x.com/example"}
              />
              <span className="fieldHint">One link per line: label | URL.</span>
            </label>
          </section>

          {updateProfile.error ? <div className="errorCard">{getErrorMessage(updateProfile.error)}</div> : null}

          <div className="formActions">
            <button className="button buttonPrimary" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save changes"}
            </button>
            <Link to={`/users/${profile.data.id}`} className="button buttonSecondary">
              View public profile
            </Link>
          </div>
        </form>
      </section>

      <aside className="profilePreview">
        <span className="eyebrow">Public preview</span>
        <ProfileAvatar name={previewName} url={form.avatar_url} size="lg" />
        <h2>{previewName}</h2>
        <span>{form.display_name}</span>
        <p>{form.bio || "No bio yet."}</p>
        {form.background ? <p>{form.background}</p> : null}
        <div className="profileStats">
          <span>
            <b>{compactNumber(profile.data.follower_count)}</b> followers
          </span>
          <span>
            <b>{compactNumber(profile.data.following_count)}</b> following
          </span>
        </div>
        {form.website_url ? (
          <a href={form.website_url} target="_blank" rel="noreferrer">
            Website
          </a>
        ) : null}
        {previewLinks.length > 0 ? (
          <div className="profileLinkList">
            {previewLinks.map((link) => (
              <a href={link.url} key={`${link.label}-${link.url}`} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
