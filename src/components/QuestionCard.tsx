import { Link } from "react-router-dom";
import type { QuestionSummary } from "../api/types";
import { compactNumber, initials, relativeTime } from "../lib/format";
import { MarkdownContent } from "./MarkdownContent";
import { PillList } from "./Pill";

type QuestionCardProps = {
  question: QuestionSummary;
};

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <article className="questionCard">
      <div className="questionByline">
        <span className="miniAvatar">{initials(question.author_name)}</span>
        <span>
          <b>{question.author_name}</b> asked
        </span>
        <span className="muted">· {relativeTime(question.created_at)}</span>
      </div>

      <Link to={`/questions/${question.id}`} className="questionTitle">
        {question.title}
      </Link>

      <MarkdownContent variant="excerpt">{question.body}</MarkdownContent>

      <PillList values={question.tags} prefix="#" />

      <div className="cardStats">
        <span className="scorePill">{compactNumber(question.answer_count)} answers</span>
        <span className="muted">created {relativeTime(question.created_at)}</span>
        <Link to={`/questions/${question.id}`}>Read answers</Link>
      </div>
    </article>
  );
}
