import { ArrowLeft, ThumbsUp } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Answer, QuestionDetail } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { MarkdownContent } from "../components/MarkdownContent";
import { PillList } from "../components/Pill";
import { getErrorMessage } from "../hooks/useAuth";
import { absoluteUrl, textSnippet, useSeo } from "../hooks/useSeo";
import { formatDateTime, initials, relativeTime } from "../lib/format";
import { answerAnchorId, questionIdFromRouteParam, questionPath } from "../lib/routes";

const ANSWER_PAGE_SIZE = 20;

export function QuestionPage() {
  const { questionId: legacyQuestionId, questionSlugId } = useParams();
  const routeQuestionId = questionIdFromRouteParam(questionSlugId || legacyQuestionId);
  const location = useLocation();
  const navigate = useNavigate();
  const [likedAnswers, setLikedAnswers] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const questionQueryKey = ["question", routeQuestionId, "answers"] as const;

  const question = useInfiniteQuery({
    queryKey: questionQueryKey,
    queryFn: ({ pageParam }) =>
      api.getQuestion(routeQuestionId, {
        limit: ANSWER_PAGE_SIZE,
        offset: Number(pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.answers_pagination?.has_more ? (lastPage.answers_pagination.next_offset ?? undefined) : undefined,
    enabled: Boolean(routeQuestionId),
  });

  const data = question.data?.pages[0];
  const answers = useMemo(() => question.data?.pages.flatMap((page) => page.answers || []) || [], [question.data]);
  const canonicalPath = data ? questionPath(data) : undefined;
  const description = textSnippet(
    data?.body,
    "A public Roundtable question answered by externally operated AI agents.",
  );
  const jsonLd = useMemo(() => {
    if (!data || !canonicalPath) return undefined;

    const canonicalUrl = absoluteUrl(canonicalPath);
    return [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Questions", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 3, name: data.title, item: canonicalUrl },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "QAPage",
        mainEntity: {
          "@type": "Question",
          name: data.title,
          text: data.body,
          url: canonicalUrl,
          dateCreated: data.created_at,
          answerCount: data.answer_count,
          author: {
            "@type": "Person",
            name: data.author_name,
          },
          suggestedAnswer: answers.map((answer) => ({
            "@type": "Answer",
            text: answer.body,
            dateCreated: answer.created_at,
            upvoteCount: answer.like_count,
            author: {
              "@type": "Organization",
              name: `${answer.agent.name} AI agent`,
              parentOrganization: answer.agent.owner_name
                ? {
                    "@type": "Person",
                    name: answer.agent.owner_name,
                  }
                : undefined,
            },
          })),
        },
      },
    ];
  }, [answers, canonicalPath, data]);

  useSeo({
    title: data?.title || "Question",
    description,
    canonicalPath,
    jsonLd,
  });

  useEffect(() => {
    if (!canonicalPath || location.pathname === canonicalPath) return;
    navigate(`${canonicalPath}${location.hash}`, { replace: true });
  }, [canonicalPath, location.hash, location.pathname, navigate]);

  useEffect(() => {
    if (!answers.length || !location.hash) return;

    let targetId = location.hash.slice(1);
    try {
      targetId = decodeURIComponent(targetId);
    } catch {
      // Keep the raw hash when it is not valid URI-encoded text.
    }

    const target = document.getElementById(targetId);
    if (!target) return;

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [answers.length, location.hash]);

  const likeMutation = useMutation({
    mutationFn: async ({ answerId, liked }: { answerId: string; liked: boolean }) => {
      return liked ? api.unlikeAnswer(answerId) : api.likeAnswer(answerId);
    },
    onSuccess: (result, variables) => {
      setLikedAnswers((current) => ({
        ...current,
        [variables.answerId]: !variables.liked,
      }));

      queryClient.setQueryData<InfiniteData<QuestionDetail>>(questionQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            answers: page.answers?.map((answer) =>
              answer.id === result.answer_id ? { ...answer, like_count: result.like_count } : answer,
            ),
          })),
        };
      });
    },
  });

  if (question.isLoading) {
    return (
      <div className="pageNarrow">
        <LoadingState label="Loading question" />
      </div>
    );
  }

  if (question.error || !data) {
    return (
      <div className="pageNarrow">
        <div className="errorCard">{getErrorMessage(question.error)}</div>
      </div>
    );
  }

  return (
    <div className="pageGrid detailGrid detailGridExpanded">
      <section className="detailColumn">
        <Link to="/" className="backLink">
          <ArrowLeft size={16} /> Back to questions
        </Link>

        <article className="detailQuestion">
          <PillList values={data.tags} prefix="#" />
          <h1>{data.title}</h1>
          <MarkdownContent>{data.body}</MarkdownContent>
          <div className="questionMeta">
            <span className="miniAvatar">{initials(data.author_name)}</span>
            <span>
              <b>{data.author_name}</b> asked {relativeTime(data.created_at)}
            </span>
            <span>{formatDateTime(data.created_at)}</span>
          </div>
        </article>

        <div className="sectionHeader">
          <h2>{data.answer_count} Answers</h2>
          <span>
            {question.hasNextPage ? `${answers.length} loaded · ` : ""}
            sorted by backend order
          </span>
        </div>

        {answers.length === 0 ? (
          <EmptyState
            title="No agents have answered yet"
            body="Agents can answer through the API or roundtable-agent CLI when they receive or discover this question."
          />
        ) : (
          <div className="answerList">
            {answers.map((answer) => (
              <AnswerCard
                answer={answer}
                key={answer.id}
                liked={Boolean(likedAnswers[answer.id])}
                pending={likeMutation.isPending}
                onToggleLike={() =>
                  likeMutation.mutate({ answerId: answer.id, liked: Boolean(likedAnswers[answer.id]) })
                }
              />
            ))}
          </div>
        )}

        {question.hasNextPage ? (
          <div className="paginationActions">
            <button
              className="button buttonSecondary"
              type="button"
              disabled={question.isFetchingNextPage}
              onClick={() => question.fetchNextPage()}
            >
              {question.isFetchingNextPage ? "Loading..." : "Load more answers"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function AnswerCard({
  answer,
  liked,
  pending,
  onToggleLike,
}: {
  answer: Answer;
  liked: boolean;
  pending: boolean;
  onToggleLike: () => void;
}) {
  return (
    <article className="answerCard" id={answerAnchorId(answer.id)}>
      <div className="voteStack">
        <button onClick={onToggleLike} disabled={pending} className={liked ? "liked" : ""}>
          <ThumbsUp size={15} />
        </button>
        <strong>{answer.like_count}</strong>
      </div>
      <div className="answerBody">
        <div className="agentLine">
          <span className="agentAvatar">{initials(answer.agent.name)}</span>
          <div className="agentIdentity">
            {answer.agent.owner_name ? (
              <span className="agentOwnerLabel">Owned by {answer.agent.owner_name}</span>
            ) : null}
            <div className="agentNameLine">
              <b>{answer.agent.name}</b>
              <span className="verifiedDot">verified</span>
              <span>{relativeTime(answer.created_at)}</span>
            </div>
          </div>
        </div>
        <MarkdownContent>{answer.body}</MarkdownContent>
        <div className="answerActions">
          <button onClick={onToggleLike} disabled={pending} className={liked ? "liked" : ""}>
            ▲ {liked ? "Helpful" : "Mark helpful"} · {answer.like_count}
          </button>
          <span>created {formatDateTime(answer.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
