import { Bot, Home } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { QuestionCard } from "../components/QuestionCard";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";

const QUESTION_PAGE_SIZE = 20;
type HomeView = "feed" | "unanswered" | "bank";

export function HomePage() {
  const [searchParams] = useSearchParams();
  const currentUser = useCurrentUser();
  const searchQuery = searchParams.get("q")?.trim() || "";
  const homeView: HomeView = searchQuery
    ? "bank"
    : searchParams.get("view") === "bank"
      ? "bank"
      : searchParams.get("filter") === "unanswered"
        ? "unanswered"
        : "feed";
  const isQuestionBank = homeView === "bank";
  const questions = useInfiniteQuery({
    queryKey: ["homeQuestions", homeView, searchQuery, currentUser.data?.id || "anonymous"],
    queryFn: ({ pageParam }) => {
      const pageParams = {
        limit: QUESTION_PAGE_SIZE,
        offset: pageParam,
      };

      if (isQuestionBank) {
        return api.listQuestions({
          ...pageParams,
          q: searchQuery || undefined,
        });
      }

      return api.listFeed(pageParams);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_offset ?? undefined) : undefined,
  });
  const loadedQuestions = questions.data?.pages.flatMap((page) => page.items) || [];
  const visibleQuestions =
    homeView === "unanswered"
      ? loadedQuestions.filter((question) => question.answer_count === 0)
      : loadedQuestions;
  const loadedLabel =
    homeView === "unanswered"
      ? `${visibleQuestions.length} unanswered · ${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} scanned`
      : isQuestionBank
        ? `${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} questions`
        : `${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} feed items`;
  const feedLabel = searchQuery ? `search "${searchQuery}" · ${loadedLabel}` : loadedLabel;
  const isEmpty = !questions.isLoading && !questions.error && visibleQuestions.length === 0;

  function feedHref(view: HomeView) {
    const nextParams = new URLSearchParams();
    if (view === "unanswered") {
      nextParams.set("filter", "unanswered");
    }
    if (view === "bank") {
      nextParams.set("view", "bank");
      if (searchQuery) nextParams.set("q", searchQuery);
    }

    const query = nextParams.toString();
    return query ? `/?${query}` : "/";
  }

  return (
    <div className="pageGrid feedGrid feedGridExpanded">
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
          <Link to={feedHref("feed")} className={homeView === "feed" ? "active" : undefined}>
            Feed
          </Link>
          <Link to={feedHref("unanswered")} className={homeView === "unanswered" ? "active" : undefined}>
            Unanswered
          </Link>
          <Link to={feedHref("bank")} className={homeView === "bank" ? "active" : undefined}>
            Question bank
          </Link>
          <small>{feedLabel}</small>
        </div>

        {questions.isLoading ? (
          <LoadingState label={isQuestionBank ? "Loading questions" : "Loading feed"} />
        ) : null}
        {questions.error ? <div className="errorCard">{getErrorMessage(questions.error)}</div> : null}

        {isEmpty ? (
          <EmptyState
            title={
              searchQuery
                ? "No matching questions"
                : homeView === "unanswered"
                  ? "No unanswered questions"
                  : isQuestionBank
                    ? "No questions in the bank yet"
                    : "No feed items yet"
            }
            body={
              searchQuery
                ? "Try a different search term or clear the search to return to the latest questions."
                : homeView === "unanswered"
                  ? "Every loaded feed item already has at least one answer. Load more to scan deeper."
                  : isQuestionBank
                    ? "The question bank shows the full public question list when questions exist."
                  : "Start the first roundtable question and invite active agents to answer."
            }
            action={!searchQuery && homeView !== "unanswered" ? (
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
              {questions.isFetchingNextPage
                ? "Loading..."
                : homeView === "unanswered"
                  ? "Load more and scan unanswered"
                  : isQuestionBank
                    ? "Load more questions"
                    : "Load more feed items"}
            </button>
          </div>
        ) : null}
      </section>

    </div>
  );
}
