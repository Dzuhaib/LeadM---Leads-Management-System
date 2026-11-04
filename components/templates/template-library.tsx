"use client";

import * as React from "react";
import { Check, Copy, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderTemplate, templateStageLabel } from "@/lib/templates";
import { CHANNELS, CHANNEL_LABELS, type Channel } from "@/lib/constants";

export type TemplateTree = Record<
  Channel,
  Record<string, { title: string; body: string }>
>;

type LeadOption = {
  id: string;
  contactName: string;
  businessName: string;
};

const STAGES = ["0", "3", "7", "14"] as const;

export function TemplateLibrary({
  templates,
  leads,
  followUpDays,
}: {
  templates: TemplateTree;
  leads: LeadOption[];
  followUpDays: number[];
}) {
  const [leadId, setLeadId] = React.useState("");
  const [copied, setCopied] = React.useState<string | null>(null);

  const selectedLead = leads.find((lead) => lead.id === leadId);

  async function copy(key: string, body: string) {
    const text = renderTemplate(body, {
      name: selectedLead?.contactName,
      business: selectedLead?.businessName,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("Message copied to clipboard.");
      window.setTimeout(() => setCopied((value) => (value === key ? null : value)), 1800);
    } catch {
      toast.error("Could not copy. Select the text and copy manually.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personalise your message</CardTitle>
          <CardDescription>
            Choose a lead to fill in [Name] and [Business] before copying.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label htmlFor="template-lead">Lead</Label>
            <Select
              id="template-lead"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
            >
              <option value="">No lead selected (keep placeholders)</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.businessName}
                  {lead.contactName ? ` — ${lead.contactName}` : ""}
                </option>
              ))}
            </Select>
            {leads.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Add a lead first to personalise templates.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="linkedin">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {CHANNELS.map((channel) => (
            <TabsTrigger key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </TabsTrigger>
          ))}
        </TabsList>
        {CHANNELS.map((channel) => (
          <TabsContent key={channel} value={channel}>
            <div className="grid gap-4 md:grid-cols-2">
              {STAGES.map((stage) => {
                const template = templates[channel]?.[stage] ?? templates[channel]?.["0"];
                if (!template) return null;
                const key = `${channel}-${stage}`;
                const rendered = renderTemplate(template.body, {
                  name: selectedLead?.contactName,
                  business: selectedLead?.businessName,
                });
                return (
                  <Card key={key}>
                    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-sm">
                          {template.title}
                        </CardTitle>
                        <CardDescription>
                          {templateStageLabel(Number(stage), followUpDays)}
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copy(key, template.body)}
                      >
                        {copied === key ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied === key ? "Copied" : "Copy"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm">
                        {rendered}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <p className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
        Templates are read-only for employees. Add a lead to fill placeholders,
        and always respect the privacy and messaging rules of the country you
        are contacting.
      </p>
    </div>
  );
}
