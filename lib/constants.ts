export const CHANNELS = ["linkedin", "whatsapp", "facebook", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  other: "Other",
};

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "replied",
  "call_booked",
  "proposal_sent",
  "won",
  "lost",
  "no_reply",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  call_booked: "Call booked",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  no_reply: "No reply",
};

export const LEAD_STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
  contacted:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900",
  replied:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-900",
  call_booked:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  proposal_sent:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-900",
  won: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900",
  lost: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
  no_reply:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-900",
};

export const SERVICES = [
  "AI Systems",
  "Automations",
  "SEO & GEO",
  "Digital Marketing",
  "Web Development",
  "Desktop Software",
  "other",
] as const;
export type ServicePitched = (typeof SERVICES)[number];

export const ACTIVITY_TYPES = [
  "dm_sent",
  "follow_up_3",
  "follow_up_7",
  "follow_up_14",
  "reply_received",
  "call_booked",
  "proposal_sent",
  "won",
  "lost",
  "note",
  "status_change",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  dm_sent: "First message sent",
  follow_up_3: "Day 3 follow-up",
  follow_up_7: "Day 7 follow-up",
  follow_up_14: "Day 14 follow-up",
  reply_received: "Reply received",
  call_booked: "Call booked",
  proposal_sent: "Proposal sent",
  won: "Marked won",
  lost: "Marked lost",
  note: "Note",
  status_change: "Status changed",
};

export const REPLY_TAGS = [
  "interested",
  "question",
  "not_now",
  "not_interested",
  "other",
] as const;
export type ReplyTag = (typeof REPLY_TAGS)[number];

export const REPLY_TAG_LABELS: Record<ReplyTag, string> = {
  interested: "Interested",
  question: "Question",
  not_now: "Not now",
  not_interested: "Not interested",
  other: "Other",
};

export const MESSAGE_ACTIVITY_TYPES: ActivityType[] = [
  "dm_sent",
  "follow_up_3",
  "follow_up_7",
  "follow_up_14",
];

export const FOLLOW_UP_ACTIVITY_BY_STAGE: Record<number, ActivityType> = {
  0: "follow_up_3",
  1: "follow_up_7",
  2: "follow_up_14",
};

export const DATE_RANGES = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "custom",
] as const;
export type DateRangeKey = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom",
};
