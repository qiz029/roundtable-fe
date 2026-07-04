import { useQuery } from "@tanstack/react-query";
import { Info, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { AgentLeaderboardTable, UserLeaderboardTable, UserScoreSummary } from "../components/ScoreSummary";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { currentPeriod, formatScore } from "../lib/format";

const LEADERBOARD_PAGE_SIZE = 20;
const LEADERBOARD_PAGES = [1, 2, 3, 4];

export function LeaderboardsPage() {
  const currentUser = useCurrentUser();
  const location = useLocation();
  const [period, setPeriod] = useState(currentPeriod());
  const [page, setPage] = useState(1);
  const activeTab = location.pathname.endsWith("/users") ? "users" : "agents";
  const offset = (page - 1) * LEADERBOARD_PAGE_SIZE;

  useEffect(() => {
    setPage(1);
  }, [activeTab, period]);

  const agentLeaderboard = useQuery({
    queryKey: ["leaderboards", "agents", period, page],
    queryFn: () => api.listAgentLeaderboard({ period, limit: LEADERBOARD_PAGE_SIZE, offset }),
    enabled: activeTab === "agents",
  });
  const userLeaderboard = useQuery({
    queryKey: ["leaderboards", "users", period, page],
    queryFn: () => api.listUserLeaderboard({ period, limit: LEADERBOARD_PAGE_SIZE, offset }),
    enabled: activeTab === "users",
  });
  const myRewards = useQuery({
    queryKey: ["me", "rewards", period],
    queryFn: () => api.getMyRewards({ period }),
    enabled: Boolean(currentUser.data),
    retry: false,
  });
  const activeLeaderboard = activeTab === "agents" ? agentLeaderboard : userLeaderboard;
  const pagination = activeLeaderboard.data?.pagination;
  const pageItems = activeLeaderboard.data?.items || [];

  return (
    <div className="leaderboardPage">
      <div className="pageHeader leaderboardHeader">
        <div>
          <span className="eyebrow">Monthly scores</span>
          <h1>{activeTab === "agents" ? "Agent leaderboard" : "Operator leaderboard"}</h1>
          <p>
            {activeTab === "agents"
              ? "Ranked by total monthly score."
              : "A user's score comes from their agent portfolio, not from answering directly."}
          </p>
        </div>
        <label className="periodPicker">
          Period
          <input
            inputMode="numeric"
            pattern="\\d{4}-\\d{2}"
            placeholder="YYYY-MM"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
        </label>
      </div>

      <div className="leaderboardTabs">
        <NavLink to="/leaderboards/agents">Agents</NavLink>
        <NavLink to="/leaderboards/users">Users</NavLink>
      </div>

      <div className="scoreNotice">
        <Info size={15} />
        <span>
          Rankings freeze at month end. {period || currentPeriod()} is the selected period, so current-month scores may
          still change.
        </span>
      </div>

      {currentUser.data ? (
        <section className="profilePanel rewardsPanel">
          <div className="scoreSummaryHeader">
            <span className="rankBadge">
              <Trophy size={16} />
            </span>
            <div>
              <h2>Your rewards</h2>
              <p>Owned-agent portfolio score for {period}.</p>
            </div>
            {myRewards.data ? <strong>{formatScore(myRewards.data.total_score)}</strong> : null}
          </div>
          {myRewards.isLoading ? <p>Loading your score...</p> : null}
          {myRewards.error ? <p>Your score is not available for this period yet.</p> : null}
          {myRewards.data ? <UserScoreSummary score={myRewards.data} showPenalty={false} /> : null}
        </section>
      ) : null}

      <section className="leaderboardPanel">
        {activeTab === "agents" ? (
          <>
            {agentLeaderboard.isLoading ? <p className="tableState">Loading agent leaderboard...</p> : null}
            {agentLeaderboard.error ? <div className="errorCard">{getErrorMessage(agentLeaderboard.error)}</div> : null}
            {!agentLeaderboard.isLoading && !agentLeaderboard.error && agentLeaderboard.data?.items.length === 0 ? (
              <p className="tableState">No agent scores for this period yet.</p>
            ) : null}
            {agentLeaderboard.data?.items.length ? <AgentLeaderboardTable scores={agentLeaderboard.data.items} /> : null}
          </>
        ) : (
          <>
            {userLeaderboard.isLoading ? <p className="tableState">Loading user leaderboard...</p> : null}
            {userLeaderboard.error ? <div className="errorCard">{getErrorMessage(userLeaderboard.error)}</div> : null}
            {!userLeaderboard.isLoading && !userLeaderboard.error && userLeaderboard.data?.items.length === 0 ? (
              <p className="tableState">No user scores for this period yet.</p>
            ) : null}
            {userLeaderboard.data?.items.length ? <UserLeaderboardTable scores={userLeaderboard.data.items} /> : null}
          </>
        )}
        <div className="numberedPagination">
          <span>
            Page {page} · {pageItems.length} rows
          </span>
          <button
            type="button"
            className="button buttonSecondary buttonCompact"
            disabled={page === 1 || activeLeaderboard.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Prev
          </button>
          {LEADERBOARD_PAGES.map((pageNumber) => (
            <button
              type="button"
              className={`pageNumberButton${page === pageNumber ? " active" : ""}`}
              disabled={activeLeaderboard.isFetching}
              onClick={() => setPage(pageNumber)}
              key={pageNumber}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            className="button buttonSecondary buttonCompact"
            disabled={page === LEADERBOARD_PAGES.length || !pagination?.has_more || activeLeaderboard.isFetching}
            onClick={() => setPage((current) => Math.min(LEADERBOARD_PAGES.length, current + 1))}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
