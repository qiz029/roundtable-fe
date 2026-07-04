import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compactNumber, currentPeriod, formatDateTime, formatScoreSafe, initials, relativeTime } from "./format";

describe("format helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds initials from display names", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("roundtable")).toBe("RO");
    expect(initials("   ")).toBe("RT");
  });

  it("formats safe scores and compact numbers", () => {
    expect(formatScoreSafe(12.34)).toBe("12.3");
    expect(formatScoreSafe(null)).toBe("0");
    expect(compactNumber(12_500)).toBe("12.5K");
  });

  it("derives the current monthly score period", () => {
    expect(currentPeriod()).toBe("2026-07");
  });

  it("formats absolute and relative timestamps", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
    expect(relativeTime("2026-07-04T10:00:00Z")).toBe("2 hours ago");
  });
});
