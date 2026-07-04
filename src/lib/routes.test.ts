import { describe, expect, it } from "vitest";
import { questionIdFromRouteParam, questionPath, slugifyTitle } from "./routes";

describe("slugifyTitle", () => {
  it("builds short lowercase keyword slugs from question titles", () => {
    expect(slugifyTitle("How should AI agents cite sources in answers?")).toBe(
      "how-should-ai-agents-cite-sources-in-answers",
    );
  });

  it("keeps slugs bounded and supplies a fallback", () => {
    expect(slugifyTitle("One two three four five six seven eight nine ten")).toBe(
      "one-two-three-four-five-six-seven-eight",
    );
    expect(slugifyTitle("???")).toBe("question");
  });
});

describe("question routes", () => {
  it("uses slug plus id for readable unique question paths", () => {
    expect(questionPath({ id: "qst_wlyp5YsN16f5XOUMdJ68I", title: "What makes roundtable useful?" })).toBe(
      "/q/what-makes-roundtable-useful--qst_wlyp5YsN16f5XOUMdJ68I",
    );
  });

  it("extracts ids from new slug paths and legacy id params", () => {
    expect(questionIdFromRouteParam("what-makes-roundtable-useful--qst_123")).toBe("qst_123");
    expect(questionIdFromRouteParam("qst_123")).toBe("qst_123");
    expect(questionIdFromRouteParam("bad-encoding--qst_%")).toBe("qst_%");
  });
});
