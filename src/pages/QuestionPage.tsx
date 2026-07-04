import { ArrowLeft, ThumbsUp } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { api } from "../api/client";
import type { Answer, QuestionDetail } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { MarkdownContent } from "../components/MarkdownContent";
import { PillList } from "../components/Pill";
import { getErrorMessage } from "../hooks/useAuth";
import { formatDateTime, initials, relativeTime } from "../lib/format";

const ANSWER_PAGE_SIZE = 20;

export function QuestionPage() {
  const { questionId } = useParams();
  const [likedAnswers, setLikedAnswers] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const questionQueryKey = ["question", questionId, "answers"] as const;

  const question = useInfiniteQuery({
    queryKey: questionQueryKey,
    queryFn: ({ pageParam }) =>
      api.getQuestion(questionId!, {
        limit: ANSWER_PAGE_SIZE,
        offset: Number(pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.answers_pagination?.has_more ? (lastPage.answers_pagination.next_offset ?? undefined) : undefined,
    enabled: Boolean(questionId),
  });

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

  if (question.error || !question.data) {
    return (
      <div className="pageNarrow">
        <div className="errorCard">{getErrorMessage(question.error)}</div>
      </div>
    );
  }

  const data = question.data.pages[0];
  const answers = question.data.pages.flatMap((page) => page.answers || []);

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
    <article className="answerCard">
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
