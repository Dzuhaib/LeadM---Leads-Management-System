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
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  no_reply: "No reply",
};

export const LEAD_STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  contacted:
    "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-800",
  replied:
    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800",
  call_booked:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800",
  proposal_sent:
    "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-800",
  won: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800",
  lost: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800",
  no_reply:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800",
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
