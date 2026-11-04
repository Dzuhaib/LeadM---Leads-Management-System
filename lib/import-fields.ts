export const IMPORT_FIELDS = [
  {
    key: "businessName",
    label: "Business name",
    required: true,
    aliases: ["business", "business name", "company", "company name", "client", "client name"],
  },
  {
    key: "contactName",
    label: "Contact name",
    required: false,
    aliases: ["contact", "contact name", "person", "lead name", "name"],
  },
  {
    key: "jobTitle",
    label: "Job title",
    required: false,
    aliases: ["job title", "title", "role", "position"],
  },
  {
    key: "industry",
    label: "Industry",
    required: false,
    aliases: ["industry", "sector", "niche"],
  },
  {
    key: "country",
    label: "Country",
    required: false,
    aliases: ["country", "location", "region"],
  },
  {
    key: "channel",
    label: "Channel",
    required: false,
    aliases: ["channel", "platform"],
  },
  {
    key: "source",
    label: "Source",
    required: false,
    aliases: ["source", "lead source", "source detail"],
  },
  {
    key: "profileUrl",
    label: "Profile URL",
    required: false,
    aliases: ["profile url", "profile link", "linkedin url", "url", "link"],
  },
  {
    key: "email",
    label: "Email",
    required: false,
    aliases: ["email", "email address"],
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    aliases: ["phone", "phone number", "whatsapp", "mobile"],
  },
  {
    key: "observation",
    label: "Observation",
    required: false,
    aliases: ["observation", "observations", "insight"],
  },
  {
    key: "servicePitched",
    label: "Service pitched",
    required: false,
    aliases: ["service pitched", "service", "offer", "pitch"],
  },
  {
    key: "status",
    label: "Status",
    required: false,
    aliases: ["status", "lead status", "stage"],
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    aliases: ["notes", "note", "comments", "remarks"],
  },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export type ImportMapping = Partial<Record<ImportFieldKey, number>>;

export type ImportSheetAnalysis = {
  fileName: string;
  headers: string[];
  totalRows: number;
  sampleRows: string[][];
  suggestedMapping: ImportMapping;
};

export type ImportPreviewRow = {
  rowNumber: number;
  values: Record<ImportFieldKey, string>;
  errors: string[];
  duplicateOwner?: string;
  duplicateKind?: "team" | "file";
};

export type ImportPreview = {
  fileName: string;
  totalRows: number;
  rows: ImportPreviewRow[];
  validCount: number;
};

export type ImportFailedRow = {
  rowNumber: number;
  values: Record<ImportFieldKey, string>;
  error: string;
  kind: "failed" | "skipped";
};

export type ImportResult = {
  fileName: string;
  created: number;
  skipped: number;
  failed: number;
  failedRows: ImportFailedRow[];
};

export function emptyImportValues(): Record<ImportFieldKey, string> {
  return Object.fromEntries(
    IMPORT_FIELDS.map((field) => [field.key, ""]),
  ) as Record<ImportFieldKey, string>;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

export function suggestImportMapping(headers: string[]): ImportMapping {
  const normalized = headers.map(normalizeHeader);
  const mapping: ImportMapping = {};

  for (const field of IMPORT_FIELDS) {
    const aliases = field.aliases.map(normalizeHeader);
    let match = normalized.findIndex((header) => aliases.includes(header));
    if (match === -1) {
      match = normalized.findIndex((header) =>
        aliases.some((alias) => alias.length >= 5 && header.includes(alias)),
      );
    }
    if (match >= 0) mapping[field.key] = match;
  }

  return mapping;
}

export function parseImportMapping(
  raw: unknown,
  headerCount: number,
): ImportMapping {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object") return {};

  const mapping: ImportMapping = {};
  const record = value as Record<string, unknown>;
  for (const field of IMPORT_FIELDS) {
    const index = record[field.key];
    if (
      typeof index === "number" &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < headerCount
    ) {
      mapping[field.key] = index;
    }
  }
  return mapping;
}
