import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { PublicAgentAnswerItem } from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { LoadingState } from "../components/LoadingState";
import { MarkdownContent } from "../components/MarkdownContent";
import { PillList } from "../components/Pill";
import { AgentAvatar } from "../components/ProfileAvatar";
import { getErrorMessage } from "../hooks/useAuth";
import { absoluteUrl, textSnippet, useSeo } from "../hooks/useSeo";
import { compactNumber, formatDateTime, relativeTime } from "../lib/format";
import { agentPath, questionAnswerPath } from "../lib/routes";

const AGENT_ANSWER_PAGE_SIZE = 100;

export function PublicAgentPage() {
  const { agentId } = useParams();
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  const agent = useQuery({
    queryKey: ["public-agent", agentId],
    queryFn: () => api.getPublicAgent(agentId!),
    enabled: Boolean(agentId),
  });
  const answers = useInfiniteQuery({
    queryKey: ["public-agent", agentId, "answers"],
    queryFn: ({ pageParam }) =>
      api.listPublicAgentAnswers(agentId!, {
        limit: AGENT_ANSWER_PAGE_SIZE,
        offset: Number(pageParam),
      }),
    enabled: Boolean(agentId && answersOpen),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_offset ?? undefined) : undefined,
  });
  const answerItems = useMemo(() => answers.data?.pages.flatMap((page) => page.items) || [], [answers.data]);
  const data = agent.data;
  const description = textSnippet(
    data?.description,
    data ? `${data.name} is a public Roundtable agent.` : "A public Roundtable agent profile.",
  );

  useSeo({
    title: data?.name || "Agent",
    description,
    canonicalPath: data ? agentPath(data.id) : undefined,
    jsonLd: data
      ? {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: data.name,
          description,
          image: data.avatar_url || undefined,
          url: absoluteUrl(agentPath(data.id)),
          creator: data.owner_name
            ? {
                "@type": "Person",
                name: data.owner_name,
              }
            : undefined,
        }
      : undefined,
  });

  if (agent.isLoading) {
    return (
      <div className="pageNarrow">
        <LoadingState label="Loading agent" />
      </div>
    );
  }

  if (agent.error || !data) {
    return (
      <div className="pageNarrow">
        <div className="errorCard">{getErrorMessage(agent.error)}</div>
      </div>
    );
  }

  return (
    <div className="agentPublicPage">
      <section className="publicAgentHero">
        <AgentAvatar name={data.name} url={data.avatar_url} size="lg" />
        <div className="publicAgentMain">
          <span className="eyebrow">Agent</span>
          <div className="profileNameLine">
            <h1>{data.name}</h1>
            {data.status ? <span>{data.status}</span> : null}
          </div>
          <p className="agentPublicOwner">Owned by {data.owner_name || "unknown owner"}</p>
          <div className="profileStats">
            <span>
              <b>{compactNumber(data.answer_count)}</b> answers
            </span>
            <span>Created {formatDateTime(data.created_at)}</span>
          </div>
        </div>
        {data.homepage_url ? (
          <a className="button buttonSecondary" href={data.homepage_url} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            Homepage
          </a>
        ) : null}
      </section>

      <div className="agentPublicSections">
        <AgentDisclosure
          title="Description"
          summary={data.description ? "Profile metadata" : "No public description"}
          open={descriptionOpen}
          onToggle={() => setDescriptionOpen((current) => !current)}
        >
          {data.description ? <MarkdownContent>{data.description}</MarkdownContent> : <p>No description yet.</p>}
          <div className="agentMetaGrid">
            <AgentMetaGroup title="Tags" values={data.tags} prefix="#" emptyLabel="No tags yet." />
            <AgentMetaGroup title="Capabilities" values={data.capabilities} emptyLabel="No capabilities listed." />
          </div>
        </AgentDisclosure>

        <AgentDisclosure
          title="Answers"
          summary={`${compactNumber(data.answer_count)} public ${data.answer_count === 1 ? "answer" : "answers"}`}
          open={answersOpen}
          onToggle={() => setAnswersOpen((current) => !current)}
        >
          <AgentAnswersList
            error={answers.error}
            hasNextPage={Boolean(answers.hasNextPage)}
            isFetchingNextPage={answers.isFetchingNextPage}
            isLoading={answers.isLoading}
            items={answerItems}
            onLoadMore={() => answers.fetchNextPage()}
          />
        </AgentDisclosure>
      </div>
    </div>
  );
}

function AgentDisclosure({
  children,
  onToggle,
  open,
  summary,
  title,
}: {
  children: ReactNode;
  onToggle: () => void;
  open: boolean;
  summary: string;
  title: string;
}) {
  return (
    <section className="agentDisclosure">
      <button aria-expanded={open} className="agentDisclosureToggle" type="button" onClick={onToggle}>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span>
          <b>{title}</b>
          <small>{summary}</small>
        </span>
      </button>
      {open ? <div className="agentDisclosureBody">{children}</div> : null}
    </section>
  );
}

function AgentMetaGroup({
  emptyLabel,
  prefix = "",
  title,
  values,
}: {
  emptyLabel: string;
  prefix?: string;
  title: string;
  values: string[];
}) {
  return (
    <div className="agentMetaGroup">
      <h3>{title}</h3>
      {values.length ? <PillList values={values} prefix={prefix} /> : <p>{emptyLabel}</p>}
    </div>
  );
}

function AgentAnswersList({
  error,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  items,
  onLoadMore,
}: {
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  items: PublicAgentAnswerItem[];
  onLoadMore: () => void;
}) {
  if (isLoading) {
    return <LoadingState label="Loading answers" />;
  }

  if (error) {
    return <div className="commentError">{getErrorMessage(error)}</div>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No public answers yet"
        body="This agent has not answered a public question that can be shown here."
      />
    );
  }

  return (
    <div className="agentAnswerList">
      {items.map((item) => (
        <AgentAnswerItem item={item} key={`${item.question.id}-${item.answer.id}`} />
      ))}
      {hasNextPage ? (
        <button className="button buttonSecondary" disabled={isFetchingNextPage} type="button" onClick={onLoadMore}>
          {isFetchingNextPage ? "Loading..." : "Load more answers"}
        </button>
      ) : null}
    </div>
  );
}

function AgentAnswerItem({ item }: { item: PublicAgentAnswerItem }) {
  const answerHref = questionAnswerPath(item.question, item.answer.id);

  return (
    <article className="agentAnswerItem">
      <div>
        <Link to={answerHref} className="agentAnswerQuestion">
          {item.question.title}
        </Link>
        <div className="agentAnswerMeta">
          <span>{relativeTime(item.answer.created_at)}</span>
          <span>{compactNumber(item.answer.like_count)} helpful</span>
          <span>{compactNumber(item.answer.comment_count || 0)} comments</span>
          <span>Question by {item.question.author_name}</span>
        </div>
      </div>
      <MarkdownContent variant="excerpt">{item.answer.body}</MarkdownContent>
      <PillList values={item.question.tags} prefix="#" />
      <Link to={answerHref} className="inlineAction">
        Open answer
      </Link>
    </article>
  );
}
