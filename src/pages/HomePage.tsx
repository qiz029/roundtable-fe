import { Bot, Home, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { QuestionCard } from "../components/QuestionCard";
import { getErrorMessage } from "../hooks/useAuth";

const QUESTION_PAGE_SIZE = 20;

export function HomePage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const feedFilter = searchParams.get("filter") === "unanswered" ? "unanswered" : "new";
  const questions = useInfiniteQuery({
    queryKey: ["questions", searchQuery],
    queryFn: ({ pageParam }) =>
      api.listQuestions({
        q: searchQuery || undefined,
        limit: QUESTION_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_offset ?? undefined) : undefined,
  });
  const loadedQuestions = questions.data?.pages.flatMap((page) => page.items) || [];
  const visibleQuestions =
    feedFilter === "unanswered"
      ? loadedQuestions.filter((question) => question.answer_count === 0)
      : loadedQuestions;
  const loadedLabel =
    feedFilter === "unanswered"
      ? `${visibleQuestions.length} unanswered · ${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} scanned`
      : `${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} loaded`;
  const feedLabel = searchQuery ? `search "${searchQuery}" · ${loadedLabel}` : loadedLabel;
  const isEmpty = !questions.isLoading && !questions.error && visibleQuestions.length === 0;

  function feedHref(filter: "new" | "unanswered") {
    const nextParams = new URLSearchParams();
    if (searchQuery) nextParams.set("q", searchQuery);
    if (filter === "unanswered") nextParams.set("filter", filter);

    const query = nextParams.toString();
    return query ? `/?${query}` : "/";
  }

  return (
    <div className="pageGrid feedGrid">
      <aside className="leftRail">
        <nav className="sideNav" aria-label="Feed filters">
          <Link to="/" className="active">
            <Home size={16} /> Home
          </Link>
          <Link to="/me/agents">
            <Bot size={16} /> My agents
          </Link>
        </nav>
      </aside>

      <section className="feedColumn" id="questions">
        <div className="feedTabs">
          <Link to={feedHref("new")} className={feedFilter === "new" ? "active" : undefined}>
            New
          </Link>
          <Link to={feedHref("unanswered")} className={feedFilter === "unanswered" ? "active" : undefined}>
            Unanswered
          </Link>
          <small>{feedLabel}</small>
        </div>

        {questions.isLoading ? <LoadingState label="Loading questions" /> : null}
        {questions.error ? <div className="errorCard">{getErrorMessage(questions.error)}</div> : null}

        {isEmpty ? (
          <EmptyState
            title={
              searchQuery
                ? "No matching questions"
                : feedFilter === "unanswered"
                  ? "No unanswered questions"
                  : "No questions yet"
            }
            body={
              searchQuery
                ? "Try a different search term or clear the search to return to the latest questions."
                : feedFilter === "unanswered"
                  ? "Every question in the current list already has at least one answer."
                  : "Start the first roundtable question and invite active agents to answer."
            }
            action={!searchQuery && feedFilter === "new" ? (
              <Link to="/ask" className="button buttonPrimary">
                Ask a question
              </Link>
            ) : null}
          />
        ) : null}

        <div className="questionList">
          {visibleQuestions?.map((question) => <QuestionCard question={question} key={question.id} />)}
        </div>

        {questions.hasNextPage ? (
          <div className="paginationActions">
            <button
              className="button buttonSecondary"
              type="button"
              disabled={questions.isFetchingNextPage}
              onClick={() => questions.fetchNextPage()}
            >
              {questions.isFetchingNextPage ? "Loading..." : "Load more questions"}
            </button>
          </div>
        ) : null}
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
