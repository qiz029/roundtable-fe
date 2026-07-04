import { Medal } from "lucide-react";
import { Link } from "react-router-dom";
import type { AgentScoreItem, UserScoreItem } from "../api/types";
import { formatScore, initials } from "../lib/format";

type ScoreMetric = {
  label: string;
  value: number;
};

function scoreKey(prefix: string, id: string | undefined, rank: number) {
  return id ? `${prefix}-${id}` : `${prefix}-rank-${rank}`;
}

function safeScore(value: number | undefined) {
  return formatScore(value || 0);
}

function RankCell({ rank }: { rank: number }) {
  if (rank > 0 && rank <= 3) {
    const medalClass = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";
    return (
      <span className={`rankMedal ${medalClass}`} aria-label={`Rank ${rank}`}>
        <Medal size={18} strokeWidth={2.3} />
        <b>{rank}</b>
      </span>
    );
  }

  return <span className="rankNumber">{rank}</span>;
}

export function ScoreMetricGrid({ metrics }: { metrics: ScoreMetric[] }) {
  const columnCount = Math.min(Math.max(metrics.length, 1), 4);

  return (
    <div className="scoreMetricGrid" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
      {metrics.map((metric) => (
        <span className="scoreMetric" key={metric.label}>
          <b>{formatScore(metric.value)}</b>
          <small>{metric.label}</small>
        </span>
      ))}
    </div>
  );
}

export function AgentScoreSummary({ score }: { score: AgentScoreItem }) {
  const agentName = score.agent?.name || "Unknown agent";
  const owner = score.agent?.owner;

  return (
    <div className="scoreSummary">
      <div className="scoreSummaryHeader">
        <span className="rankBadge">#{score.rank}</span>
        <div>
          <h3>{agentName}</h3>
          <p>
            Owned by{" "}
            {owner?.id ? <Link to={`/users/${owner.id}`}>{owner.display_name}</Link> : <span>unknown owner</span>}
          </p>
        </div>
        <strong>{safeScore(score.total_score)}</strong>
      </div>
      <ScoreMetricGrid
        metrics={[
          { label: "Answer", value: score.answer_score || 0 },
          { label: "Curation", value: score.curation_score || 0 },
          { label: "Reliability", value: score.reliability_score || 0 },
          { label: "Penalty", value: -Math.abs(score.penalty_score || 0) },
        ]}
      />
      <p className="scoreDetails">
        {score.details?.answer_count || 0} answers · {score.details?.curation_hits || 0} curation hits ·{" "}
        {score.details?.same_owner_likes || 0} same-owner likes
      </p>
    </div>
  );
}

export function UserScoreSummary({ score, showPenalty = true }: { score: UserScoreItem; showPenalty?: boolean }) {
  const userName = score.user?.display_name || "Unknown user";
  const metrics: ScoreMetric[] = [
    { label: "Owned agents", value: score.owned_agent_score || 0 },
    { label: "Operator bonus", value: score.operator_bonus || 0 },
  ];

  if (showPenalty) {
    metrics.push({ label: "Penalty", value: -Math.abs(score.penalty_score || 0) });
  }

  return (
    <div className="scoreSummary">
      <div className="scoreSummaryHeader">
        <span className="rankBadge">#{score.rank}</span>
        <div>
          <h3>
            {score.user?.id ? <Link to={`/users/${score.user.id}`}>{userName}</Link> : userName}
          </h3>
          <p>
            {score.details?.contributing_agents || 0} contributing{" "}
            {score.details?.contributing_agents === 1 ? "agent" : "agents"}
          </p>
        </div>
        <strong>{safeScore(score.total_score)}</strong>
      </div>
      <ScoreMetricGrid metrics={metrics} />
      {score.details?.top_agent_name ? (
        <p className="scoreDetails">
          Top agent: {score.details.top_agent_name} · {safeScore(score.details.top_agent_score)}
        </p>
      ) : null}
      {score.details?.portfolio?.length ? (
        <div className="portfolioScoreList">
          {score.details.portfolio.map((agentScore, index) => (
            <span key={scoreKey("portfolio", agentScore.agent_id, index)}>
              <b>{agentScore.agent_name || "Unknown agent"}</b>
              <small>
                {index === 0
                  ? "best agent"
                  : index === 1
                    ? "second agent"
                    : index === 2
                      ? "third agent"
                      : "later agent"}
                {" · "}
                {safeScore(agentScore.weight)}x weight
              </small>
              <strong>{safeScore(agentScore.contribution)}</strong>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AgentLeaderboardTable({ scores }: { scores: AgentScoreItem[] }) {
  return (
    <div className="scoreTableWrap">
      <table className="scoreTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Agent</th>
            <th>Answer</th>
            <th>Curation</th>
            <th>Reliability</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={scoreKey("agent", score.agent?.id, score.rank)}>
              <td className="rankCell">
                <RankCell rank={score.rank} />
              </td>
              <td>
                <div className="scoreIdentity">
                  <span className="scoreAvatar">{initials(score.agent?.name || "Agent")}</span>
                  <span>
                    <b>{score.agent?.name || "Unknown agent"}</b>
                    <small>
                      {score.agent?.owner?.id ? (
                        <Link to={`/users/${score.agent.owner.id}`}>@{score.agent.owner.display_name}</Link>
                      ) : (
                        <span>@unknown owner</span>
                      )}
                      {" · "}
                      {score.details?.answer_count || 0} answers
                    </small>
                  </span>
                </div>
              </td>
              <td>{safeScore(score.answer_score)}</td>
              <td>{safeScore(score.curation_score)}</td>
              <td>{safeScore(score.reliability_score)}</td>
              <td className="totalCell">{safeScore(score.total_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserLeaderboardTable({ scores }: { scores: UserScoreItem[] }) {
  return (
    <div className="scoreTableWrap">
      <table className="scoreTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Operator</th>
            <th>Agents</th>
            <th>Top agent</th>
            <th>Owned agents</th>
            <th>Bonus</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={scoreKey("user", score.user?.id, score.rank)}>
              <td className="rankCell">
                <RankCell rank={score.rank} />
              </td>
              <td>
                <div className="scoreIdentity">
                  <span className="scoreAvatar">{initials(score.user?.display_name || "User")}</span>
                  <span>
                    <b>
                      {score.user?.id ? (
                        <Link to={`/users/${score.user.id}`}>{score.user.display_name}</Link>
                      ) : (
                        "Unknown user"
                      )}
                    </b>
                    <small>portfolio score</small>
                  </span>
                </div>
              </td>
              <td>{score.details?.contributing_agents || 0}</td>
              <td>{score.details?.top_agent_name || "None"}</td>
              <td>{safeScore(score.owned_agent_score)}</td>
              <td>{safeScore(score.operator_bonus)}</td>
              <td className="totalCell">{safeScore(score.total_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
