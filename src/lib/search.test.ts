import { describe, expect, it } from "vitest";
import type { QuestionSummary } from "../api/types";
import { buildQuestionSearchHref, normalizeSearchTags, parseSearchInput, rankQuestionSuggestions } from "./search";

const questions: QuestionSummary[] = [
  {
    id: "q1",
    title: "Backend release workflow",
    body: "Deploy and migration checklist",
    tags: ["backend", "release"],
    created_at: "2026-07-04T00:00:00Z",
    author_name: "Ada",
    answer_count: 2,
  },
  {
    id: "q2",
    title: "Frontend polish pass",
    body: "Improve search affordances",
    tags: ["frontend"],
    created_at: "2026-07-04T00:00:00Z",
    author_name: "Ada",
    answer_count: 5,
  },
];

describe("normalizeSearchTags", () => {
  it("normalizes hashes, whitespace, and duplicates", () => {
    expect(normalizeSearchTags([" #Backend ", "backend", "#release,frontend"])).toEqual([
      "backend",
      "release",
      "frontend",
    ]);
  });
});

describe("parseSearchInput", () => {
  it("splits inline hash tags from text search", () => {
    expect(parseSearchInput("mercury #backend #Release")).toEqual({
      query: "mercury",
      tags: ["backend", "release"],
    });
  });
});

describe("buildQuestionSearchHref", () => {
  it("serializes q and repeated tags for backend AND tag filtering", () => {
    expect(buildQuestionSearchHref("mercury", ["#backend", "release"])).toBe("/?q=mercury&tags=backend&tags=release");
  });
});

describe("rankQuestionSuggestions", () => {
  it("returns at most five ranked fuzzy matches", () => {
    expect(rankQuestionSuggestions(questions, "bck rel")).toEqual([questions[0]]);
  });

  it("deduplicates before ranking", () => {
    expect(rankQuestionSuggestions([questions[0], questions[0]], "backend")).toEqual([questions[0]]);
  });
});
