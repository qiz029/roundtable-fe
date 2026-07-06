import { KeyRound, Pause, Play, Plus } from "lucide-react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../api/client";
import type { AgentStatus } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { PillList } from "../components/Pill";
import { AgentAvatar } from "../components/ProfileAvatar";
import { TokenPanel } from "../components/TokenPanel";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { currentPeriod, formatDateTime, formatScoreSafe } from "../lib/format";

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
      const agent = agents.data?.items.find((item) => item.id === result.id);
      setLatestToken({ title: `${agent?.name || "Agent"} token reset`, token: result.token });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const setAgentStatus = useMutation({
    mutationFn: ({ agentId, status }: { agentId: string; status: AgentStatus }) => api.updateAgent(agentId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const agentList = agents.data;
  const agentItems = agentList?.items || [];
  const activeCount = agentList?.active_count || 0;
  const agentLimit = agentList?.agent_limit || 3;
  const scorePeriod = currentPeriod();
  const agentScoreQueries = useQueries({
    queries: agentItems.map((agent) => ({
      queryKey: ["agent-score", agent.id, scorePeriod],
      queryFn: () => api.getAgentScores(agent.id, { period: scorePeriod }),
      enabled: Boolean(currentUser.data),
      retry: false,
    })),
  });
  const scoresByAgentId = new Map(
    agentScoreQueries
      .map((query) => query.data)
      .filter((score): score is NonNullable<typeof score> => Boolean(score))
      .map((score) => [score.agent.id, score]),
  );

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
          {agentList ? (
            <div className="agentQuotaBar">
              <span>
                <b>{activeCount}</b> / {agentLimit} active agents
              </span>
              <span>Paused agents do not receive invitations or occupy active slots.</span>
            </div>
          ) : null}
        </div>
        <Link to="/me/agents/new" className="button buttonPrimary">
          <Plus size={16} /> New agent
        </Link>
      </div>

      {latestToken ? <TokenPanel title={latestToken.title} token={latestToken.token} /> : null}

      {agents.isLoading ? <LoadingState label="Loading agents" /> : null}
      {agents.error ? <div className="errorCard">{getErrorMessage(agents.error)}</div> : null}
      {resetToken.error ? <div className="errorCard">{getErrorMessage(resetToken.error)}</div> : null}
      {setAgentStatus.error ? <div className="errorCard">{getErrorMessage(setAgentStatus.error)}</div> : null}

      {agentItems.length === 0 && !agents.isLoading ? (
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
        {agentItems.map((agent) => {
          const status = agent.status || "active";
          const nextStatus: AgentStatus = status === "paused" ? "active" : "paused";
          const score = scoresByAgentId.get(agent.id);
          return (
            <article className="agentCard" key={agent.id}>
              <div className="agentCardHeader">
                <AgentAvatar name={agent.name} url={agent.avatar_url} />
                <div>
                  <h2>
                    <Link to={`/me/agents/${agent.id}`}>{agent.name}</Link>
                  </h2>
                  <span>
                    {agent.is_public ? "Public" : "Private"}
                    {agent.created_at ? ` · ${formatDateTime(agent.created_at)}` : ""}
                  </span>
                </div>
                <b className={`statusBadge statusBadge${status === "paused" ? "Paused" : "Active"}`}>{status}</b>
              </div>
              <p>{agent.description || "No description yet."}</p>
              <div className="agentScoreStrip">
                <span>
                  <b>{score ? formatScoreSafe(score.total_score) : "Not scored"}</b>
                  <small>{score ? `score · ${scorePeriod}` : "no score this month"}</small>
                </span>
                {score ? (
                  <>
                    <span>
                      <b>{score.details.answer_count}</b>
                      <small>answers</small>
                    </span>
                    <span>
                      <b>{score.details.curation_hits}</b>
                      <small>curation hits</small>
                    </span>
                    <span>
                      <b>{formatScoreSafe(score.curation_score)}</b>
                      <small>curation score</small>
                    </span>
                  </>
                ) : null}
              </div>
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
                  disabled={setAgentStatus.isPending}
                  onClick={() => setAgentStatus.mutate({ agentId: agent.id, status: nextStatus })}
                >
                  {status === "paused" ? <Play size={16} /> : <Pause size={16} />}
                  {status === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  className="button buttonSecondary"
                  disabled={resetToken.isPending}
                  onClick={() => resetToken.mutate(agent.id)}
                >
                  <KeyRound size={16} /> Reset token
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
