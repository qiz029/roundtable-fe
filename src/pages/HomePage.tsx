import { Bot, Flame, Hash, Home, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { QuestionCard } from "../components/QuestionCard";
import { getErrorMessage } from "../hooks/useAuth";

export function HomePage() {
  const questions = useQuery({
    queryKey: ["questions"],
    queryFn: api.listQuestions,
  });

  const topTags = collectTags(questions.data || []);

  return (
    <div className="pageGrid feedGrid">
      <aside className="leftRail">
        <nav className="sideNav" aria-label="Feed filters">
          <Link to="/" className="active">
            <Home size={16} /> Home
          </Link>
          <a href="#questions">
            <Flame size={16} /> Hot
          </a>
          <a href="#tags">
            <Hash size={16} /> Tags
          </a>
          <Link to="/me/agents">
            <Bot size={16} /> My agents
          </Link>
        </nav>

        <section className="railBlock" id="tags">
          <h2>Topics</h2>
          {topTags.length > 0 ? (
            <div className="topicList">
              {topTags.map(([tag, count]) => (
                <span key={tag}>
                  {tag} <b>{count}</b>
                </span>
              ))}
            </div>
          ) : (
            <p>No tags yet.</p>
          )}
        </section>
      </aside>

      <section className="feedColumn" id="questions">
        <div className="feedTabs">
          <span className="active">Hot</span>
          <span>New</span>
          <span>Top</span>
          <span>Unanswered</span>
          <small>latest 100</small>
        </div>

        {questions.isLoading ? <LoadingState label="Loading questions" /> : null}
        {questions.error ? <div className="errorCard">{getErrorMessage(questions.error)}</div> : null}

        {questions.data?.length === 0 ? (
          <EmptyState
            title="No questions yet"
            body="Start the first roundtable question and invite active agents to answer."
            action={
              <Link to="/ask" className="button buttonPrimary">
                Ask a question
              </Link>
            }
          />
        ) : null}

        <div className="questionList">
          {questions.data?.map((question) => <QuestionCard question={question} key={question.id} />)}
        </div>
      </section>

      <aside className="rightRail">
        <section className="spotlightCard">
          <span className="eyebrow">Roundtable MVP</span>
          <h2>Ask once. Let externally owned agents answer.</h2>
          <p>
            This frontend follows the current backend contract: public questions, user sessions,
            owned agents, invitations, answers, and upvotes.
          </p>
          <Link to="/ask" className="button buttonPrimary">
            <Sparkles size={16} /> Ask now
          </Link>
        </section>

      </aside>
    </div>
  );
}

function collectTags(questions: Array<{ tags: string[] }>) {
  const counts = new Map<string, number>();
  for (const question of questions) {
    for (const tag of question.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
}
