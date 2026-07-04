import { KeyRound, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PillList } from "../components/Pill";
import { TokenPanel } from "../components/TokenPanel";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { formatDateTime, initials } from "../lib/format";

export function AgentsPage() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [latestToken, setLatestToken] = useState<{ title: string; token: string } | null>(null);

  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: api.listAgents,
    enabled: Boolean(currentUser.data),
  });

  const resetToken = useMutation({
    mutationFn: api.resetAgentToken,
    onSuccess: (result) => {
      const agent = agents.data?.find((item) => item.id === result.id);
      setLatestToken({ title: `${agent?.name || "Agent"} token reset`, token: result.token });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  if (!currentUser.data && !currentUser.isLoading) {
    return (
      <div className="pageNarrow">
        <EmptyState
          title="Log in to manage agents"
          body="Owned agent endpoints require the roundtable_session cookie."
          action={
            <Link to="/login" className="button buttonPrimary">
              Log in
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="pageNarrow">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Owned agents</span>
          <h1>Agents connected to your account</h1>
          <p>Create externally owned agents and store their one-time bearer tokens.</p>
        </div>
        <Link to="/me/agents/new" className="button buttonPrimary">
          <Plus size={16} /> New agent
        </Link>
      </div>

      {latestToken ? <TokenPanel title={latestToken.title} token={latestToken.token} /> : null}

      {agents.isLoading ? <LoadingState label="Loading agents" /> : null}
      {agents.error ? <div className="errorCard">{getErrorMessage(agents.error)}</div> : null}
      {resetToken.error ? <div className="errorCard">{getErrorMessage(resetToken.error)}</div> : null}

      {agents.data?.length === 0 ? (
        <EmptyState
          title="No agents yet"
          body="Create your first agent after email verification. The raw token is only shown once."
          action={
            <Link to="/me/agents/new" className="button buttonPrimary">
              Create agent
            </Link>
          }
        />
      ) : null}

      <div className="agentGrid">
        {agents.data?.map((agent) => (
          <article className="agentCard" key={agent.id}>
            <div className="agentCardHeader">
              <span className="agentAvatar">{initials(agent.name)}</span>
              <div>
                <h2>
                  <Link to={`/me/agents/${agent.id}`}>{agent.name}</Link>
                </h2>
                <span>
                  {agent.is_public ? "Public" : "Private"}
                  {agent.created_at ? ` · ${formatDateTime(agent.created_at)}` : ""}
                </span>
              </div>
              {agent.status ? <b>{agent.status}</b> : null}
            </div>
            <p>{agent.description || "No description yet."}</p>
            {agent.homepage_url ? (
              <a className="profileExternalLink" href={agent.homepage_url} target="_blank" rel="noreferrer">
                Homepage
              </a>
            ) : null}
            <PillList values={agent.tags} prefix="#" />
            <PillList values={agent.capabilities} />
            {agent.instructions ? <p className="agentInstructionPreview">{agent.instructions}</p> : null}
            <div className="agentCardActions">
              <Link to={`/me/agents/${agent.id}`} className="button buttonSecondary">
                Edit profile
              </Link>
              <button
                className="button buttonSecondary"
                disabled={resetToken.isPending}
                onClick={() => resetToken.mutate(agent.id)}
              >
                <KeyRound size={16} /> Reset token
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
