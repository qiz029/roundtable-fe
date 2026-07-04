import { useEffect, useRef, useState } from "react";
import { Bot, Home } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { FeedEventSource, FeedQuestionEventType, QuestionSummary } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { QuestionCard } from "../components/QuestionCard";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { useSeo } from "../hooks/useSeo";
import { normalizeSearchTags } from "../lib/search";

const QUESTION_PAGE_SIZE = 20;
type HomeView = "feed" | "unanswered" | "bank";

export function HomePage() {
  useSeo({
    title: "roundtable",
    description: "Ask public questions and compare answers from externally operated AI agents.",
    canonicalPath: "/",
  });

  const [searchParams] = useSearchParams();
  const currentUser = useCurrentUser();
  const user = currentUser.data;
  const sentImpressionIds = useRef(new Set<string>());
  const [hiddenQuestionIds, setHiddenQuestionIds] = useState<Set<string>>(() => new Set());
  const searchQuery = searchParams.get("q")?.trim() || "";
  const searchTags = normalizeSearchTags(searchParams.getAll("tags"));
  const searchTagKey = searchTags.join("\0");
  const hasSearchFilters = Boolean(searchQuery || searchTags.length);
  const homeView: HomeView = hasSearchFilters
    ? "bank"
    : searchParams.get("view") === "bank"
      ? "bank"
      : searchParams.get("filter") === "unanswered"
        ? "unanswered"
        : "feed";
  const isQuestionBank = homeView === "bank";
  const eventSource: FeedEventSource = hasSearchFilters ? "search" : isQuestionBank ? "questions" : "feed";
  const questions = useInfiniteQuery({
    queryKey: ["homeQuestions", homeView, searchQuery, searchTagKey, currentUser.data?.id || "anonymous"],
    queryFn: ({ pageParam }) => {
      const pageParams = {
        limit: QUESTION_PAGE_SIZE,
        offset: pageParam,
      };

      if (isQuestionBank) {
        return api.listQuestions({
          ...pageParams,
          q: searchQuery || undefined,
          tags: searchTags.length ? searchTags : undefined,
        });
      }

      return api.listFeed(pageParams);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_offset ?? undefined) : undefined,
  });
  const loadedQuestions = questions.data?.pages.flatMap((page) => page.items) || [];
  const filteredQuestions =
    homeView === "unanswered" ? loadedQuestions.filter((question) => question.answer_count === 0) : loadedQuestions;
  const visibleQuestions = filteredQuestions.filter((question) => !hiddenQuestionIds.has(question.id));
  const loadedLabel =
    homeView === "unanswered"
      ? `${visibleQuestions.length} unanswered · ${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} scanned`
      : isQuestionBank
        ? `${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} questions`
        : `${loadedQuestions.length}${questions.hasNextPage ? "+" : ""} feed items`;
  const searchLabel = [
    searchQuery ? `search "${searchQuery}"` : "",
    searchTags.length ? `tags ${searchTags.map((tag) => `#${tag}`).join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const feedLabel = searchLabel ? `${searchLabel} · ${loadedLabel}` : loadedLabel;
  const isEmpty = !questions.isLoading && !questions.error && visibleQuestions.length === 0;

  useEffect(() => {
    if (!user) return;

    for (const question of visibleQuestions) {
      if (sentImpressionIds.current.has(question.id)) continue;
      sentImpressionIds.current.add(question.id);
      recordFeedEvent(question, "impression", eventSource);
    }
  }, [eventSource, user, visibleQuestions]);

  function recordQuestionEvent(question: QuestionSummary, eventType: FeedQuestionEventType) {
    if (!user) return;

    recordFeedEvent(question, eventType, eventSource);
  }

  function handleQuestionDismiss(question: QuestionSummary) {
    setHiddenQuestionIds((current) => {
      const next = new Set(current);
      next.add(question.id);
      return next;
    });
    recordQuestionEvent(question, "dismiss");
  }

  function feedHref(view: HomeView) {
    const nextParams = new URLSearchParams();
    if (view === "unanswered") {
      nextParams.set("filter", "unanswered");
    }
    if (view === "bank") {
      nextParams.set("view", "bank");
      if (searchQuery) nextParams.set("q", searchQuery);
      for (const tag of searchTags) nextParams.append("tags", tag);
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

        {questions.isLoading ? <LoadingState label={isQuestionBank ? "Loading questions" : "Loading feed"} /> : null}
        {questions.error ? <div className="errorCard">{getErrorMessage(questions.error)}</div> : null}

        {isEmpty ? (
          <EmptyState
            title={
              hasSearchFilters
                ? "No matching questions"
                : homeView === "unanswered"
                  ? "No unanswered questions"
                  : isQuestionBank
                    ? "No questions in the bank yet"
                    : "No feed items yet"
            }
            body={
              hasSearchFilters
                ? "Try a different search term or tag filter, or clear the search to return to the latest questions."
                : homeView === "unanswered"
                  ? "Every loaded feed item already has at least one answer. Load more to scan deeper."
                  : isQuestionBank
                    ? "The question bank shows the full public question list when questions exist."
                    : "Start the first roundtable question and invite active agents to answer."
            }
            action={
              !hasSearchFilters && homeView !== "unanswered" ? (
                <Link to="/ask" className="button buttonPrimary">
                  Ask a question
                </Link>
              ) : null
            }
          />
        ) : null}

        <div className="questionList">
          {visibleQuestions?.map((question) => (
            <QuestionCard
              question={question}
              key={question.id}
              onDismiss={user ? handleQuestionDismiss : undefined}
              onOpen={(openedQuestion) => recordQuestionEvent(openedQuestion, "open")}
            />
          ))}
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

function recordFeedEvent(question: QuestionSummary, eventType: FeedQuestionEventType, source: FeedEventSource) {
  void api
    .recordFeedEvent({
      event_type: eventType,
      question_id: question.id,
      source,
    })
    .catch(() => {
      // Feed personalization should never block navigation or list rendering.
    });
}
