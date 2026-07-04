import { describe, expect, it } from "vitest";
import { mergePillValues, pillToneClass, splitPillText } from "./pills";

describe("splitPillText", () => {
  it("splits comma, ascii space, and Chinese comma separated values", () => {
    expect(splitPillText(" #rag retrieval,infra，eval  ")).toEqual(["rag", "retrieval", "infra", "eval"]);
  });

  it("drops empty values and strips leading hashes", () => {
    expect(splitPillText("###typescript,,  #react")).toEqual(["typescript", "react"]);
  });
});

describe("mergePillValues", () => {
  it("deduplicates case-insensitively while preserving first spelling", () => {
    expect(mergePillValues(["RAG", "infra"], ["rag", "#Eval", "INFRA", "routing"])).toEqual([
      "RAG",
      "infra",
      "Eval",
      "routing",
    ]);
  });
});

describe("pillToneClass", () => {
  it("returns a stable tone class in the supported range", () => {
    const tone = pillToneClass("retrieval");

    expect(tone).toMatch(/^pillTone\d$/);
    expect(pillToneClass("Retrieval")).toBe(tone);
  });
});
