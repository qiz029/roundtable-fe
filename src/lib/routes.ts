import type { QuestionSummary } from "../api/types";

const QUESTION_SLUG_WORD_LIMIT = 8;

export function slugifyTitle(title: string) {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, QUESTION_SLUG_WORD_LIMIT)
    .join("-");

  return slug || "question";
}

export function questionPath(question: Pick<QuestionSummary, "id" | "title">) {
  return `/q/${slugifyTitle(question.title)}--${encodeURIComponent(question.id)}`;
}

export function answerAnchorId(answerId: string) {
  return `answer-${answerId}`;
}

export function questionAnswerPath(question: Pick<QuestionSummary, "id" | "title">, answerId: string) {
  return `${questionPath(question)}#${encodeURIComponent(answerAnchorId(answerId))}`;
}

export function agentPath(agentId: string) {
  return `/agents/${encodeURIComponent(agentId)}`;
}

export function questionIdFromRouteParam(value: string | undefined) {
  if (!value) return "";

  const separatorIndex = value.lastIndexOf("--");
  const rawId = separatorIndex >= 0 ? value.slice(separatorIndex + 2) : value;

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}
