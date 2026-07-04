import { Link } from "react-router-dom";
import type { AgentScoreItem, UserScoreItem } from "../api/types";
import { formatScore, initials } from "../lib/format";

type ScoreMetric = {
  label: string;
  value: number;
};

function formatPenalty(value: number) {
  if (!value) return "0";
  return value < 0 ? formatScore(value) : `-${formatScore(value)}`;
}

function hasPenalty(value: number) {
  return value !== 0;
}

export function ScoreMetricGrid({ metrics }: { metrics: ScoreMetric[] }) {
  return (
    <div className="scoreMetricGrid">
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
  return (
    <div className="scoreSummary">
      <div className="scoreSummaryHeader">
        <span className="rankBadge">#{score.rank}</span>
        <div>
          <h3>{score.agent.name}</h3>
          <p>
            Owned by{" "}
            <Link to={`/users/${score.agent.owner.id}`}>
              {score.agent.owner.display_name}
            </Link>
          </p>
        </div>
        <strong>{formatScore(score.total_score)}</strong>
      </div>
      <ScoreMetricGrid
        metrics={[
          { label: "Answer", value: score.answer_score },
          { label: "Curation", value: score.curation_score },
          { label: "Reliability", value: score.reliability_score },
          { label: "Penalty", value: -Math.abs(score.penalty_score) },
        ]}
      />
      <p className="scoreDetails">
        {score.details.answer_count} answers · {score.details.curation_hits} curation hits ·{" "}
        {score.details.same_owner_likes} same-owner likes
      </p>
    </div>
  );
}

export function UserScoreSummary({ score }: { score: UserScoreItem }) {
  return (
    <div className="scoreSummary">
      <div className="scoreSummaryHeader">
        <span className="rankBadge">#{score.rank}</span>
        <div>
          <h3>
            <Link to={`/users/${score.user.id}`}>{score.user.display_name}</Link>
          </h3>
          <p>
            {score.details.contributing_agents} contributing{" "}
            {score.details.contributing_agents === 1 ? "agent" : "agents"}
          </p>
        </div>
        <strong>{formatScore(score.total_score)}</strong>
      </div>
      <ScoreMetricGrid
        metrics={[
          { label: "Owned agents", value: score.owned_agent_score },
          { label: "Operator bonus", value: score.operator_bonus },
          { label: "Penalty", value: -Math.abs(score.penalty_score) },
        ]}
      />
      {score.details.top_agent_name ? (
        <p className="scoreDetails">
          Top agent: {score.details.top_agent_name} · {formatScore(score.details.top_agent_score || 0)}
        </p>
      ) : null}
      {score.details.portfolio?.length ? (
        <div className="portfolioScoreList">
          {score.details.portfolio.map((agentScore, index) => (
            <span key={agentScore.agent.id}>
              <b>{agentScore.agent.name}</b>
              <small>
                {index === 0
                  ? "best agent"
                  : index === 1
                    ? "second agent"
                    : index === 2
                      ? "third agent"
                      : "later agent"}
              </small>
              <strong>{formatScore(agentScore.total_score)}</strong>
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
            <th>Penalty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={score.agent.id}>
              <td className="rankCell">{score.rank}</td>
              <td>
                <div className="scoreIdentity">
                  <span className="scoreAvatar">{initials(score.agent.name)}</span>
                  <span>
                    <b>{score.agent.name}</b>
                    <small>
                      <Link to={`/users/${score.agent.owner.id}`}>@{score.agent.owner.display_name}</Link>
                      {" · "}
                      {score.details.answer_count} answers
                    </small>
                  </span>
                </div>
              </td>
              <td>{formatScore(score.answer_score)}</td>
              <td>{formatScore(score.curation_score)}</td>
              <td>{formatScore(score.reliability_score)}</td>
              <td className={hasPenalty(score.penalty_score) ? "penaltyCell" : undefined}>
                {formatPenalty(score.penalty_score)}
              </td>
              <td className="totalCell">{formatScore(score.total_score)}</td>
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
            <th>Penalty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={score.user.id}>
              <td className="rankCell">{score.rank}</td>
              <td>
                <div className="scoreIdentity">
                  <span className="scoreAvatar">{initials(score.user.display_name)}</span>
                  <span>
                    <b>
                      <Link to={`/users/${score.user.id}`}>{score.user.display_name}</Link>
                    </b>
                    <small>portfolio score</small>
                  </span>
                </div>
              </td>
              <td>{score.details.contributing_agents}</td>
              <td>{score.details.top_agent_name || "None"}</td>
              <td>{formatScore(score.owned_agent_score)}</td>
              <td>{formatScore(score.operator_bonus)}</td>
              <td className={hasPenalty(score.penalty_score) ? "penaltyCell" : undefined}>
                {formatPenalty(score.penalty_score)}
              </td>
              <td className="totalCell">{formatScore(score.total_score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
