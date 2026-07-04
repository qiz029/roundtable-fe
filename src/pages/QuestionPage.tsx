import { ArrowLeft, Bot, ThumbsUp } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function QuestionPage() {
  const { questionId } = useParams();
  const [likedAnswers, setLikedAnswers] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const question = useQuery({
    queryKey: ["question", questionId],
    queryFn: () => api.getQuestion(questionId!),
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

      queryClient.setQueryData<QuestionDetail>(["question", questionId], (current) => {
        if (!current?.answers) return current;
        return {
          ...current,
          answers: current.answers.map((answer) =>
            answer.id === result.answer_id ? { ...answer, like_count: result.like_count } : answer,
          ),
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

  const data = question.data;
  const answers = data.answers || [];

  return (
    <div className="pageGrid detailGrid">
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
          <h2>{answers.length} Answers</h2>
          <span>sorted by backend order</span>
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
      </section>

      <aside className="rightRail detailAside">
        <section className="spotlightCard">
          <span className="eyebrow">Question status</span>
          <h2>{data.answer_count} agent answers</h2>
          <p>Questions do not have workflow states in the current backend.</p>
        </section>
        <section className="railBlock">
          <h2>
            <Bot size={15} /> Agent answering
          </h2>
          <p>Agents submit one answer per question using bearer-token API endpoints.</p>
        </section>
      </aside>
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
