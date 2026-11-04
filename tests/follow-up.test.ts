import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import {
  advanceFollowUpTransition,
  firstMessageTransition,
  followUpActivityType,
  isOverdue,
  shouldMarkNoReply,
} from "@/lib/follow-up";
import { normalizeProfileUrl, normalizeBusinessName } from "@/lib/duplicates";

const sentAt = new Date("2026-01-01T10:00:00.000Z");

describe("follow-up engine", () => {
  it("starts the sequence three days after the first message", () => {
    const transition = firstMessageTransition(sentAt, [3, 7, 14]);
    expect(transition.status).toBe("contacted");
    expect(transition.followUpStage).toBe(0);
    expect(transition.nextFollowUpAt?.toISOString()).toBe(
      addDays(sentAt, 3).toISOString(),
    );
  });

  it("advances day 3 to day 7 and then day 14", () => {
    expect(followUpActivityType(0)).toBe("follow_up_3");
    expect(followUpActivityType(1)).toBe("follow_up_7");
    expect(followUpActivityType(2)).toBe("follow_up_14");
    expect(followUpActivityType(3)).toBeNull();

    const day3 = advanceFollowUpTransition(0, sentAt, [3, 7, 14]);
    expect(day3.followUpStage).toBe(1);
    expect(day3.nextFollowUpAt?.toISOString()).toBe(
      addDays(sentAt, 4).toISOString(),
    );

    const day7 = advanceFollowUpTransition(1, sentAt, [3, 7, 14]);
    expect(day7.followUpStage).toBe(2);
    expect(day7.nextFollowUpAt?.toISOString()).toBe(
      addDays(sentAt, 7).toISOString(),
    );
  });

  it("clears the next follow-up after day 14", () => {
    const done = advanceFollowUpTransition(2, sentAt, [3, 7, 14]);
    expect(done.followUpStage).toBe(3);
    expect(done.nextFollowUpAt).toBeNull();
  });

  it("detects overdue and no-reply thresholds", () => {
    expect(isOverdue(addDays(new Date(), -1))).toBe(true);
    expect(isOverdue(addDays(new Date(), 1))).toBe(false);
    expect(
      shouldMarkNoReply(addDays(new Date(), -15), 14),
    ).toBe(true);
    expect(shouldMarkNoReply(addDays(new Date(), -2), 14)).toBe(false);
  });
});

describe("duplicate normalization", () => {
  it("normalizes profile URLs", () => {
    expect(
      normalizeProfileUrl("https://www.LinkedIn.com/in/Jane-Doe/?trk=abc"),
    ).toBe("linkedin.com/in/jane-doe");
    expect(normalizeProfileUrl("http://example.com/")).toBe("example.com");
    expect(normalizeProfileUrl("  ")).toBeNull();
  });

  it("normalizes business names", () => {
    expect(normalizeBusinessName("  Acme   Corp  ")).toBe("acme corp");
  });
});
