import type { QuestionSummary } from "../api/types";
import { splitPillText } from "./pills";

const SUGGESTION_LIMIT = 5;

export type ParsedSearchInput = {
  query: string;
  tags: string[];
};

export function normalizeSearchTags(values: string[]) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    for (const tag of splitPillText(value)) {
      const key = tag.toLowerCase();
      if (!key || seen.has(key)) continue;

      normalized.push(key);
      seen.add(key);
    }
  }

  return normalized;
}

export function parseSearchInput(value: string): ParsedSearchInput {
  const queryParts: string[] = [];
  const tags: string[] = [];

  for (const part of value.trim().split(/\s+/).filter(Boolean)) {
    if (part.startsWith("#")) {
      tags.push(part);
      continue;
    }

    queryParts.push(part);
  }

  return {
    query: queryParts.join(" "),
    tags: normalizeSearchTags(tags),
  };
}

export function buildQuestionSearchHref(query: string, tags: string[]) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  const normalizedTags = normalizeSearchTags(tags);

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  for (const tag of normalizedTags) {
    params.append("tags", tag);
  }

  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export function questionFuzzyScore(question: QuestionSummary, query: string) {
  const needle = normalizeText(query);
  if (!needle) return 1;

  const title = normalizeText(question.title);
  const body = normalizeText(question.body);
  const tags = question.tags.map(normalizeText);

  let score = 0;
  if (title === needle) score += 120;
  if (title.startsWith(needle)) score += 90;
  if (title.includes(needle)) score += 70;
  if (tags.some((tag) => tag === needle)) score += 65;
  if (tags.some((tag) => tag.includes(needle))) score += 45;
  if (body.includes(needle)) score += 25;

  score += subsequenceScore(title, needle);
  score += Math.max(...tags.map((tag) => subsequenceScore(tag, needle)), 0);

  return score;
}

export function rankQuestionSuggestions(questions: QuestionSummary[], query: string, limit = SUGGESTION_LIMIT) {
  const seen = new Set<string>();
  const uniqueQuestions = questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });

  if (!query.trim()) {
    return uniqueQuestions.slice(0, limit);
  }

  return uniqueQuestions
    .map((question) => ({ question, score: questionFuzzyScore(question, query) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.question.answer_count - left.question.answer_count)
    .slice(0, limit)
    .map((item) => item.question);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function subsequenceScore(haystack: string, needle: string) {
  if (!needle) return 0;

  let haystackIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;

  for (const char of needle) {
    const foundAt = haystack.indexOf(char, haystackIndex);
    if (foundAt < 0) return 0;

    if (firstMatch < 0) firstMatch = foundAt;
    lastMatch = foundAt;
    haystackIndex = foundAt + 1;
  }

  const span = Math.max(lastMatch - firstMatch + 1, needle.length);
  return Math.max(1, Math.round((needle.length / span) * 30));
}
