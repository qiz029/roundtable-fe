import { KeyRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Agent } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { TokenPanel } from "../components/TokenPanel";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { formatDateTime, initials, splitTags } from "../lib/format";

export function EditAgentPage() {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    tags: "",
    capabilities: "",
    instructions: "",
    homepage_url: "",
    is_public: true,
  });

  const agent = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => api.getAgent(agentId!),
    enabled: Boolean(agentId && currentUser.data),
  });

  useEffect(() => {
    if (!agent.data) return;
    setForm({
      name: agent.data.name || "",
      description: agent.data.description || "",
      tags: agent.data.tags.join(", "),
      capabilities: agent.data.capabilities.join(", "),
      instructions: agent.data.instructions || "",
      homepage_url: agent.data.homepage_url || "",
      is_public: agent.data.is_public,
    });
  }, [agent.data]);

  const updateAgent = useMutation({
    mutationFn: () =>
      api.updateAgent(agentId!, {
        name: form.name.trim(),
        description: form.description.trim(),
        tags: splitTags(form.tags),
        capabilities: splitTags(form.capabilities),
        instructions: form.instructions.trim(),
        homepage_url: form.homepage_url.trim(),
        is_public: form.is_public,
      }),
    onSuccess: async (result) => {
      queryClient.setQueryData<Agent>(["agent", agentId], result);
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const resetToken = useMutation({
    mutationFn: () => api.resetAgentToken(agentId!),
    onSuccess: (result) => {
      setLatestToken(result.token);
    },
  });

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateAgent.mutate();
  }

  if (!currentUser.data && !currentUser.isLoading) {
    return (
      <div className="pageNarrow">
        <EmptyState
          title="Log in to manage agents"
          body="Owned agent profile endpoints require your session cookie."
          action={
            <Link to="/login" className="button buttonPrimary">
              Log in
            </Link>
          }
        />
      </div>
    );
  }

  if (agent.isLoading || currentUser.isLoading) {
    return (
      <div className="pageNarrow">
        <LoadingState label="Loading agent" />
      </div>
    );
  }

  if (agent.error || !agent.data) {
    return (
      <div className="pageNarrow">
        <div className="errorCard">{getErrorMessage(agent.error)}</div>
      </div>
    );
  }

  return (
    <div className="agentManagePage">
      <section className="agentManageHero">
        <span className="agentAvatar agentAvatarLarge">{initials(form.name || agent.data.name)}</span>
        <div>
          <span className="eyebrow">Agent profile</span>
          <h1>{form.name || agent.data.name}</h1>
          <p>{form.description || "No description yet."}</p>
          <div className="profileStats">
            <span>{form.is_public ? "Public" : "Private"}</span>
            {agent.data.created_at ? <span>created {formatDateTime(agent.data.created_at)}</span> : null}
          </div>
        </div>
      </section>

      {latestToken ? <TokenPanel title={`${agent.data.name} token reset`} token={latestToken} /> : null}
      {updateAgent.isSuccess ? <div className="successCard">Agent profile saved.</div> : null}
      {updateAgent.error ? <div className="errorCard">{getErrorMessage(updateAgent.error)}</div> : null}
      {resetToken.error ? <div className="errorCard">{getErrorMessage(resetToken.error)}</div> : null}

      <form className="agentManageGrid" onSubmit={handleSubmit}>
        <section className="profilePanel">
          <h2>Identity</h2>
          <label>
            Name
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={4}
            />
          </label>
          <label>
            Homepage URL
            <input
              value={form.homepage_url}
              onChange={(event) => updateField("homepage_url", event.target.value)}
              placeholder="https://example.com/agent"
            />
          </label>
        </section>

        <section className="profilePanel">
          <h2>Routing</h2>
          <label>
            Tags
            <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} />
            <span className="fieldHint">Comma-separated tags used by the current backend contract.</span>
          </label>
          <label>
            Capabilities
            <input
              value={form.capabilities}
              onChange={(event) => updateField("capabilities", event.target.value)}
            />
          </label>
          <label>
            Instructions
            <textarea
              value={form.instructions}
              onChange={(event) => updateField("instructions", event.target.value)}
              rows={6}
            />
          </label>
        </section>

        <section className="profilePanel agentSettingsPanel">
          <h2>Controls</h2>
          <label className="switchRow">
            <span>
              Public profile
              <small>Controls the backend is_public field.</small>
            </span>
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(event) => updateField("is_public", event.target.checked)}
            />
          </label>
          <button
            className="button buttonSecondary"
            disabled={resetToken.isPending}
            onClick={() => resetToken.mutate()}
            type="button"
          >
            <KeyRound size={16} /> {resetToken.isPending ? "Resetting..." : "Reset token"}
          </button>
          <div className="formActions">
            <button className="button buttonPrimary" disabled={updateAgent.isPending}>
              {updateAgent.isPending ? "Saving..." : "Save agent"}
            </button>
            <Link to="/me/agents" className="button buttonSecondary">
              Back to agents
            </Link>
          </div>
        </section>
      </form>
    </div>
  );
}
