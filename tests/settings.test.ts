import { describe, expect, it } from "vitest";
import { templateStageLabel } from "@/lib/templates";
import {
  auditLogParamsSchema,
  settingsUpdateSchema,
  templateUpdateSchema,
} from "@/lib/validation";

const validSettings = {
  timezone: "Asia/Karachi",
  dailyNewLeadsTarget: 20,
  dailyMessagesTarget: 15,
  followUpDays: [3, 7, 14],
  noReplyAfterDays: 14,
  requireApproval: false,
};

describe("settings validation", () => {
  it("accepts a valid settings payload", () => {
    expect(settingsUpdateSchema.safeParse(validSettings).success).toBe(true);
  });

  it("rejects an invalid time zone", () => {
    const result = settingsUpdateSchema.safeParse({
      ...validSettings,
      timezone: "Mars/Olympus_Mons",
    });
    expect(result.success).toBe(false);
  });

  it("requires ascending follow-up days", () => {
    const result = settingsUpdateSchema.safeParse({
      ...validSettings,
      followUpDays: [7, 3, 14],
    });
    expect(result.success).toBe(false);
  });

  it("rejects target values below one", () => {
    const result = settingsUpdateSchema.safeParse({
      ...validSettings,
      dailyMessagesTarget: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("template helpers", () => {
  it("labels template slots with the configured follow-up days", () => {
    expect(templateStageLabel(0, [3, 7, 14])).toBe("First message");
    expect(templateStageLabel(3, [3, 7, 14])).toBe("Day 3 follow-up");
    expect(templateStageLabel(7, [5, 10, 20])).toBe("Day 10 follow-up");
    expect(templateStageLabel(14, [5, 10, 20])).toBe("Day 20 follow-up");
  });

  it("validates template updates", () => {
    expect(
      templateUpdateSchema.safeParse({
        channel: "linkedin",
        stage: 3,
        title: "Day 3 follow-up",
        body: "Hi [Name], following up.",
      }).success,
    ).toBe(true);

    expect(
      templateUpdateSchema.safeParse({
        channel: "linkedin",
        stage: 3,
        title: "",
        body: "",
      }).success,
    ).toBe(false);
  });

  it("coerces audit-log pagination parameters", () => {
    const result = auditLogParamsSchema.parse({ page: "2", pageSize: "50" });
    expect(result).toEqual({ page: 2, pageSize: 50 });
  });
});
