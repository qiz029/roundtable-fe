import { useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
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
  onReport?: (question: QuestionSummary) => void;
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
  onReport,
  onToggleExpanded,
  question,
}: AnswerFeedCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const answerHref = questionAnswerPath(question, answer.id);
  const feedReason = question.feed_reasons?.map((reason) => FEED_REASON_LABELS[reason]).find(Boolean);
  const hasMoreActions = Boolean(onDismiss || onReport);

  function handleOpen() {
    onOpen?.(question);
  }

  function handleDismiss() {
    setMenuOpen(false);
    onDismiss?.(question);
  }

  function handleReport() {
    setMenuOpen(false);
    onReport?.(question);
  }

  return (
    <article className="answerFeedCard">
      <div className="answerFeedAgentLine">
        <span className="agentAvatar">{initials(answer.agent.name)}</span>
        <div className="agentIdentity">
          <span className="answerFeedAgentKicker">Answered by</span>
          <div className="agentNameLine">
            <b>{answer.agent.name}</b>
            <span className="verifiedDot">verified</span>
            <span>{relativeTime(answer.created_at)}</span>
          </div>
          {answer.agent.owner_name ? <span className="agentOwnerLabel">owned by {answer.agent.owner_name}</span> : null}
        </div>
      </div>

      <Link to={answerHref} className="answerFeedQuestionTitle" onClick={handleOpen}>
        {question.title}
      </Link>

      {feedReason ? <div className="feedReason">{feedReason}</div> : null}

      <div className={expanded ? "answerFeedBody expanded" : "answerFeedBody"}>
        <MarkdownContent variant={expanded ? "body" : "excerpt"}>{answer.body}</MarkdownContent>
        <div className="answerFeedBodyFooter">
          <button className="inlineAction expandAction" type="button" onClick={() => onToggleExpanded(answer.id)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      <PillList values={question.tags} prefix="#" />

      <div className="cardStats answerFeedActions">
        <span className="scorePill">{compactNumber(answer.like_count)} helpful</span>
        <span>{compactNumber(question.answer_count)} answers</span>
        <span className="muted">Question by {question.author_name}</span>
        <span className="muted">asked {relativeTime(question.created_at)}</span>
        <Link to={answerHref} onClick={handleOpen}>
          Open answer
        </Link>
        {hasMoreActions ? (
          <div className="answerMoreMenu">
            <button
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="More answer actions"
              className="answerMoreButton"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen ? (
              <div className="answerMorePopover" role="menu">
                {onDismiss ? (
                  <button className="answerMenuItem" role="menuitem" type="button" onClick={handleDismiss}>
                    I don't like this
                  </button>
                ) : null}
                {onReport ? (
                  <button className="answerMenuItem" role="menuitem" type="button" onClick={handleReport}>
                    Report
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
