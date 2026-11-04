import type { Channel } from "./constants";

type Template = { title: string; body: string };
type ChannelTemplates = Record<"0" | "3" | "7" | "14", Template>;

export const TEMPLATE_STAGES = [0, 3, 7, 14] as const;
export type TemplateStage = (typeof TEMPLATE_STAGES)[number];

export function templateStageLabel(stage: number, followUpDays: number[]) {
  if (stage === 0) return "First message";
  const index = TEMPLATE_STAGES.indexOf(stage as TemplateStage);
  if (index > 0) {
    return `Day ${followUpDays[index - 1] ?? stage} follow-up`;
  }
  return `Day ${stage} follow-up`;
}

export const DEFAULT_TEMPLATES: Record<Channel, ChannelTemplates> = {
  linkedin: {
    "0": {
      title: "First message",
      body: "Hi [Name], I came across [Business] and noticed how you handle your outreach. I help teams like yours build AI systems and automations that save hours every week. Would you be open to a quick 15-minute call?",
    },
    "3": {
      title: "Day 3 follow-up",
      body: "Hi [Name], just following up on my note about [Business]. If now is not the right time, no problem at all. I can share a short case study instead?",
    },
    "7": {
      title: "Day 7 follow-up",
      body: "Hi [Name], sharing one idea for [Business]: a simple automation that removes the repetitive manual work from your pipeline. Want me to send a one-page overview?",
    },
    "14": {
      title: "Day 14 follow-up",
      body: "Hi [Name], last note from me for now. If improving [Business] with AI or automation becomes a priority later, I would be glad to help. Wishing you a great week.",
    },
  },
  whatsapp: {
    "0": {
      title: "First message",
      body: "Hi [Name], this is AIVized. I noticed [Business] and had a quick idea on how AI could reduce your manual follow-up work. Open to a short call this week?",
    },
    "3": {
      title: "Day 3 follow-up",
      body: "Hi [Name], just checking in on my message. Happy to share a quick example relevant to [Business] if that helps.",
    },
    "7": {
      title: "Day 7 follow-up",
      body: "Hi [Name], one quick idea for [Business]: automate the repetitive parts of your lead follow-up so nothing slips. Want me to send details?",
    },
    "14": {
      title: "Day 14 follow-up",
      body: "Hi [Name], I will close the loop here. If [Business] wants to explore AI systems or automation later, feel free to reach out anytime.",
    },
  },
  facebook: {
    "0": {
      title: "First message",
      body: "Hi [Name], I found [Business] while researching teams in your space. We help businesses build AI systems and automations that save time and win more clients. Would you be open to a quick chat?",
    },
    "3": {
      title: "Day 3 follow-up",
      body: "Hi [Name], following up on my earlier message. Is improving [Business] with automation on your radar this quarter?",
    },
    "7": {
      title: "Day 7 follow-up",
      body: "Hi [Name], sharing one simple automation idea for [Business] that could free up several hours a week. Want me to send a short summary?",
    },
    "14": {
      title: "Day 14 follow-up",
      body: "Hi [Name], I will leave it here for now. If [Business] revisits AI or automation later, I would be happy to help. Thanks for your time.",
    },
  },
  other: {
    "0": {
      title: "First message",
      body: "Hi [Name], I came across [Business] and wanted to reach out about how AI and automation could help your team. Open to a short call?",
    },
    "3": {
      title: "Day 3 follow-up",
      body: "Hi [Name], just following up on my message about [Business].",
    },
    "7": {
      title: "Day 7 follow-up",
      body: "Hi [Name], sharing one idea for [Business] that could save time each week.",
    },
    "14": {
      title: "Day 14 follow-up",
      body: "Hi [Name], last note for now. Feel free to reach out if [Business] explores this later.",
    },
  },
};

export function renderTemplate(
  body: string,
  values: { name?: string | null; business?: string | null },
) {
  return body
    .replaceAll("[Name]", values.name?.trim() || "there")
    .replaceAll("[Business]", values.business?.trim() || "your business");
}
