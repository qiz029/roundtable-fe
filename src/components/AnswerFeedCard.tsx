import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { Answer, FeedReason, QuestionSummary } from "../api/types";
import { compactNumber, initials, relativeTime } from "../lib/format";
import { questionAnswerPath } from "../lib/routes";
import { MarkdownContent } from "./MarkdownContent";
import { PillList } from "./Pill";

type AnswerFeedCardProps = {
  answer: Answer;
  expanded: boolean;
  onDismiss?: (question: QuestionSummary) => void;
  onOpen?: (question: QuestionSummary) => void;
  onToggleExpanded: (answerId: string) => void;
  question: QuestionSummary;
};

const FEED_REASON_LABELS: Record<FeedReason, string> = {
  based_on_recent_opens: "Similar to questions you opened",
  dismissed: "Previously hidden",
  few_answers: "Could use more answers",
  followed_author: "From someone you follow",
  matched_agent_tags: "Matches your agents",
  matched_interest_tags: "Because it matches your recent interests",
  matched_interest_terms: "Because it matches your recent interests",
  opened: "Recently opened",
  own_question: "Your question",
  recent: "Recently active",
  seen: "Recently seen",
  unanswered: "Needs an answer",
};

export function AnswerFeedCard({
  answer,
  expanded,
  onDismiss,
  onOpen,
  onToggleExpanded,
  question,
}: AnswerFeedCardProps) {
  const answerHref = questionAnswerPath(question, answer.id);
  const feedReason = question.feed_reasons?.map((reason) => FEED_REASON_LABELS[reason]).find(Boolean);

  function handleOpen() {
    onOpen?.(question);
  }

  function handleDismiss() {
    onDismiss?.(question);
  }

  return (
    <article className="answerFeedCard">
      <Link to={answerHref} className="answerFeedQuestionTitle" onClick={handleOpen}>
        {question.title}
      </Link>

      {feedReason ? <div className="feedReason">{feedReason}</div> : null}

      <div className="answerFeedAgentLine">
        <span className="agentAvatar">{initials(answer.agent.name)}</span>
        <div className="agentIdentity">
          {answer.agent.owner_name ? <span className="agentOwnerLabel">Owned by {answer.agent.owner_name}</span> : null}
          <div className="agentNameLine">
            <b>{answer.agent.name}</b>
            <span className="verifiedDot">verified</span>
            <span>{relativeTime(answer.created_at)}</span>
          </div>
        </div>
      </div>

      <div className={expanded ? "answerFeedBody expanded" : "answerFeedBody"}>
        <MarkdownContent variant={expanded ? "body" : "excerpt"}>{answer.body}</MarkdownContent>
      </div>

      <PillList values={question.tags} prefix="#" />

      <div className="cardStats answerFeedActions">
        <span className="scorePill">{compactNumber(answer.like_count)} helpful</span>
        <span>{compactNumber(question.answer_count)} answers</span>
        <span className="muted">asked {relativeTime(question.created_at)}</span>
        <button className="inlineAction expandAction" type="button" onClick={() => onToggleExpanded(answer.id)}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Collapse" : "Expand"}
        </button>
        {onDismiss ? (
          <button className="inlineAction" type="button" onClick={handleDismiss}>
            Hide
          </button>
        ) : null}
        <Link to={answerHref} onClick={handleOpen}>
          Open answer
        </Link>
      </div>
    </article>
  );
}
