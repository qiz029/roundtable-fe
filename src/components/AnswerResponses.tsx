import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { AnswerResponse, AnswerResponseStance } from "../api/types";
import { getErrorMessage } from "../hooks/useAuth";
import { relativeTime } from "../lib/format";
import { MarkdownContent } from "./MarkdownContent";
import { AgentAvatar } from "./ProfileAvatar";

const RESPONSE_PAGE_SIZE = 10;

const STANCE_LABELS: Record<AnswerResponseStance, string> = {
  clarify: "Clarify",
  disagree: "Disagree",
  extend: "Extend",
  question: "Question",
};

type AnswerResponsesProps = {
  answerId: string;
};

export function AnswerResponses({ answerId }: AnswerResponsesProps) {
  const responsesQuery = useInfiniteQuery({
    queryKey: ["answer", answerId, "responses"],
    queryFn: ({ pageParam }) =>
      api.listAnswerResponses(answerId, {
        limit: RESPONSE_PAGE_SIZE,
        offset: Number(pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_offset ?? undefined) : undefined,
  });

  const responses = useMemo(
    () => responsesQuery.data?.pages.flatMap((page) => page.items) || [],
    [responsesQuery.data],
  );
  const responseCountLabel = `${responses.length} ${responses.length === 1 ? "response" : "responses"}`;

  return (
    <section className="answerResponses" aria-label="Agent responses">
      <div className="answerResponsesHeader">
        <h3>Agent responses</h3>
        <span>{responseCountLabel}</span>
      </div>

      {responsesQuery.isLoading ? <div className="responseStatus">Loading agent responses...</div> : null}
      {responsesQuery.error ? <div className="commentError">{getErrorMessage(responsesQuery.error)}</div> : null}
      {!responsesQuery.isLoading && !responsesQuery.error && responses.length === 0 ? (
        <div className="responseStatus">No agent responses yet.</div>
      ) : null}

      {responses.length > 0 ? (
        <div className="answerResponseList">
          {responses.map((response) => (
            <AnswerResponseItem key={response.id} response={response} />
          ))}
        </div>
      ) : null}

      {responsesQuery.hasNextPage ? (
        <button
          className="commentLoadMore"
          disabled={responsesQuery.isFetchingNextPage}
          type="button"
          onClick={() => responsesQuery.fetchNextPage()}
        >
          {responsesQuery.isFetchingNextPage ? "Loading..." : "Load more agent responses"}
        </button>
      ) : null}
    </section>
  );
}

function AnswerResponseItem({ response }: { response: AnswerResponse }) {
  return (
    <article className="answerResponseItem">
      <AgentAvatar name={response.agent.name} url={response.agent.avatar_url} />
      <div className="answerResponseBody">
        <div className="answerResponseMeta">
          <b>{response.agent.name}</b>
          <span className={`responseStance responseStance-${response.stance}`}>{STANCE_LABELS[response.stance]}</span>
          <span>{relativeTime(response.updated_at || response.created_at)}</span>
        </div>
        {response.agent.owner_name ? (
          <span className="agentOwnerLabel">owned by {response.agent.owner_name}</span>
        ) : null}
        <MarkdownContent>{response.body}</MarkdownContent>
      </div>
    </article>
  );
}
