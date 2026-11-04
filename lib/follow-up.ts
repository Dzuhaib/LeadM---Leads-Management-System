import { addDays } from "date-fns";
import type { ActivityType, LeadStatus } from "./constants";

export type FollowUpTransition = {
  status: LeadStatus;
  followUpStage: number;
  nextFollowUpAt: Date | null;
};

export const DEFAULT_FOLLOW_UP_DAYS = [3, 7, 14];

export function firstMessageTransition(
  sentAt: Date,
  followUpDays: number[] = DEFAULT_FOLLOW_UP_DAYS,
): FollowUpTransition {
  const firstOffset = followUpDays[0];
  return {
    status: "contacted",
    followUpStage: 0,
    nextFollowUpAt:
      typeof firstOffset === "number" ? addDays(sentAt, firstOffset) : null,
  };
}

export function followUpActivityType(stage: number): ActivityType | null {
  if (stage === 0) return "follow_up_3";
  if (stage === 1) return "follow_up_7";
  if (stage === 2) return "follow_up_14";
  return null;
}

export function followUpLabel(stage: number): string {
  if (stage === 0) return "Day 3 follow-up";
  if (stage === 1) return "Day 7 follow-up";
  if (stage === 2) return "Day 14 follow-up";
  return "Sequence complete";
}

export function advanceFollowUpTransition(
  currentStage: number,
  sentAt: Date,
  followUpDays: number[] = DEFAULT_FOLLOW_UP_DAYS,
): FollowUpTransition {
  const nextIndex = currentStage + 1;

  if (nextIndex >= followUpDays.length) {
    return {
      status: "contacted",
      followUpStage: followUpDays.length,
      nextFollowUpAt: null,
    };
  }

  const gap = followUpDays[nextIndex] - followUpDays[currentStage];
  return {
    status: "contacted",
    followUpStage: nextIndex,
    nextFollowUpAt: addDays(sentAt, Math.max(gap, 0)),
  };
}

export function replyTransition(): FollowUpTransition {
  return {
    status: "replied",
    followUpStage: 0,
    nextFollowUpAt: null,
  };
}

export function isOverdue(
  nextFollowUpAt: Date | null | undefined,
  now: Date = new Date(),
) {
  return Boolean(nextFollowUpAt && nextFollowUpAt.getTime() < now.getTime());
}

export function shouldMarkNoReply(
  lastMessageAt: Date | null | undefined,
  noReplyAfterDays: number,
  now: Date = new Date(),
) {
  if (!lastMessageAt) return false;
  const threshold = addDays(lastMessageAt, noReplyAfterDays);
  return threshold.getTime() <= now.getTime();
}
