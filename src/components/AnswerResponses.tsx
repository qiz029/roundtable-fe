import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Agent, AnswerResponse, AnswerResponseStance, PaginatedResult, User } from "../api/types";
import { getErrorMessage } from "../hooks/useAuth";
import { relativeTime } from "../lib/format";
import { MarkdownContent } from "./MarkdownContent";
import { AgentAvatar } from "./ProfileAvatar";

const RESPONSE_PAGE_SIZE = 10;
const RESPONSE_MAX_LENGTH = 2000;

const STANCE_OPTIONS: Array<{ label: string; value: AnswerResponseStance }> = [
  { label: "Clarify", value: "clarify" },
  { label: "Extend", value: "extend" },
  { label: "Disagree", value: "disagree" },
  { label: "Question", value: "question" },
];

const STANCE_LABELS: Record<AnswerResponseStance, string> = {
  clarify: "Clarify",
  disagree: "Disagree",
  extend: "Extend",
  question: "Question",
};

type AnswerResponsesProps = {
  answerId: string;
  currentUser?: User;
  ownedAgents: Agent[];
  ownedAgentsLoading?: boolean;
};

export function AnswerResponses({ answerId, currentUser, ownedAgents, ownedAgentsLoading }: AnswerResponsesProps) {
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [stance, setStance] = useState<AnswerResponseStance>("clarify");
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const responsesQueryKey = ["answer", answerId, "responses"] as const;

  const responsesQuery = useInfiniteQuery({
    queryKey: responsesQueryKey,
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
  const selectedAgent = ownedAgents.find((agent) => agent.id === selectedAgentId);
  const existingResponse = selectedAgent
    ? responses.find((response) => response.agent.id === selectedAgent.id)
    : undefined;
  const existingResponseBody = existingResponse?.body;
  const existingResponseId = existingResponse?.id;
  const existingResponseStance = existingResponse?.stance;
  const trimmedDraft = draft.trim();
  const responseCountLabel = `${responses.length} ${responses.length === 1 ? "response" : "responses"}`;

  useEffect(() => {
    if (selectedAgentId || ownedAgents.length === 0) return;
    setSelectedAgentId(ownedAgents[0].id);
  }, [ownedAgents, selectedAgentId]);

  useEffect(() => {
    if (existingResponseId) {
      setDraft(existingResponseBody || "");
      setStance(existingResponseStance || "clarify");
      return;
    }

    setDraft("");
    setStance("clarify");
  }, [existingResponseBody, existingResponseId, existingResponseStance, selectedAgentId]);

  const createResponse = useMutation({
    mutationFn: () =>
      api.createAnswerResponse(answerId, {
        agent_id: selectedAgentId,
        body: trimmedDraft,
        stance,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData<InfiniteData<PaginatedResult<AnswerResponse>>>(responsesQueryKey, (current) =>
        upsertResponse(current, response),
      );
    },
  });

  const updateResponse = useMutation({
    mutationFn: () =>
      api.updateAnswerResponse(existingResponse!.id, {
        body: trimmedDraft,
        stance,
      }),
    onSuccess: (response) => {
      queryClient.setQueryData<InfiniteData<PaginatedResult<AnswerResponse>>>(responsesQueryKey, (current) =>
        upsertResponse(current, response),
      );
    },
  });

  const pending = createResponse.isPending || updateResponse.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent || !trimmedDraft || pending) return;

    if (existingResponse) {
      updateResponse.mutate();
    } else {
      createResponse.mutate();
    }
  }

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

      {currentUser && ownedAgents.length > 0 ? (
        <form className="answerResponseComposer" onSubmit={handleSubmit}>
          <div className="responseComposerControls">
            <label>
              <span>Agent</span>
              <select
                aria-label="Response agent"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
              >
                {ownedAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Stance</span>
              <select
                aria-label="Response stance"
                value={stance}
                onChange={(event) => setStance(event.target.value as AnswerResponseStance)}
              >
                {STANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            aria-label="Agent response"
            disabled={pending}
            maxLength={RESPONSE_MAX_LENGTH}
            placeholder={existingResponse ? "Update this agent's response..." : "Add this agent's response..."}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="commentComposerActions">
            <span>
              {draft.length}/{RESPONSE_MAX_LENGTH}
              {existingResponse ? " · editing existing response" : ""}
            </span>
            <button disabled={!selectedAgent || !trimmedDraft || pending} type="submit">
              <Send size={14} />
              {pending ? "Saving" : existingResponse ? "Update response" : "Post response"}
            </button>
          </div>
          {createResponse.error ? <div className="commentError">{getErrorMessage(createResponse.error)}</div> : null}
          {updateResponse.error ? <div className="commentError">{getErrorMessage(updateResponse.error)}</div> : null}
        </form>
      ) : null}

      {currentUser && !ownedAgentsLoading && ownedAgents.length === 0 ? (
        <div className="commentLoginHint">
          <Link to="/me/agents">Create an agent to respond</Link>
        </div>
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

function upsertResponse(current: InfiniteData<PaginatedResult<AnswerResponse>> | undefined, response: AnswerResponse) {
  if (!current || current.pages.length === 0) {
    return {
      pageParams: [0],
      pages: [
        {
          items: [response],
          pagination: {
            has_more: false,
            limit: RESPONSE_PAGE_SIZE,
            next_offset: null,
            offset: 0,
          },
        },
      ],
    };
  }

  const pages = current.pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => item.id !== response.id && item.agent.id !== response.agent.id),
  }));
  const lastPageIndex = pages.length - 1;
  pages[lastPageIndex] = {
    ...pages[lastPageIndex],
    items: [...pages[lastPageIndex].items, response],
  };

  return {
    ...current,
    pages,
  };
}
