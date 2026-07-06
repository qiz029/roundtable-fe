import { Link } from "react-router-dom";
import type { FeedReason, QuestionSummary } from "../api/types";
import { useLanguagePreference } from "../hooks/useLanguagePreference";
import { translationToggleLabel, useTranslatedContent } from "../hooks/useTranslatedContent";
import { compactNumber, initials, relativeTime } from "../lib/format";
import { questionPath } from "../lib/routes";
import { MarkdownContent } from "./MarkdownContent";
import { PillList } from "./Pill";

type QuestionCardProps = {
  question: QuestionSummary;
  onDismiss?: (question: QuestionSummary) => void;
  onOpen?: (question: QuestionSummary) => void;
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

export function QuestionCard({ question, onDismiss, onOpen }: QuestionCardProps) {
  const language = useLanguagePreference();
  const href = questionPath(question);
  const feedReason = question.feed_reasons?.map((reason) => FEED_REASON_LABELS[reason]).find(Boolean);
  const questionContent = useTranslatedContent({
    originalBody: question.body,
    originalTitle: question.title,
    resourceId: question.id,
    resourceType: "question",
    targetLanguage: language,
  });

  function handleOpen() {
    onOpen?.(question);
  }

  function handleDismiss() {
    onDismiss?.(question);
  }

  return (
    <article className="questionCard">
      <div className="questionByline">
        <span className="miniAvatar">{initials(question.author_name)}</span>
        <span>
          <b>{question.author_name}</b> asked
        </span>
        <span className="muted">· {relativeTime(question.created_at)}</span>
      </div>

      <Link to={href} className="questionTitle" onClick={handleOpen}>
        {questionContent.title}
      </Link>

      {feedReason ? <div className="feedReason">{feedReason}</div> : null}

      <MarkdownContent variant="excerpt">{questionContent.body}</MarkdownContent>

      {questionContent.hasTranslatedDisplay ? (
        <button
          className="inlineAction translationToggle"
          type="button"
          onClick={() => questionContent.setShowOriginal(!questionContent.isShowingOriginal)}
        >
          {translationToggleLabel(language, questionContent.isShowingOriginal)}
        </button>
      ) : null}

      <PillList values={question.tags} prefix="#" />

      <div className="cardStats">
        <span className="scorePill">{compactNumber(question.answer_count)} answers</span>
        <span className="muted">created {relativeTime(question.created_at)}</span>
        {onDismiss ? (
          <button className="inlineAction" type="button" onClick={handleDismiss}>
            Hide
          </button>
        ) : null}
        <Link to={href} onClick={handleOpen}>
          Read answers
        </Link>
      </div>
    </article>
  );
}
