import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { ActionError } from "@/lib/action-result";
import {
  CHANNELS,
  CHANNEL_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  SERVICES,
  type Channel,
  type LeadStatus,
  type ServicePitched,
} from "@/lib/constants";
import {
  normalizeBusinessName,
  normalizeProfileUrl,
} from "@/lib/duplicates";
import {
  emptyImportValues,
  parseImportMapping,
  suggestImportMapping,
  type ImportFieldKey,
  type ImportMapping,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportResult,
  type ImportSheetAnalysis,
} from "@/lib/import-fields";
import { leadInputSchema, type LeadInput } from "@/lib/validation";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

type ParsedSheet = {
  fileName: string;
  headers: string[];
  rows: string[][];
};

type MappedRow = {
  rowNumber: number;
  values: Record<ImportFieldKey, string>;
};

type PreparedRow = {
  payload: LeadInput;
  profileKey: string | null;
  businessKey: string;
};

type DuplicateLookup = {
  byProfile: Map<string, string>;
  byBusiness: Map<string, string>;
};

type SeenKeys = {
  byProfile: Map<string, number>;
  byBusiness: Map<string, number>;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value) {
      return String(value.text ?? "").trim();
    }
    if ("result" in value) {
      return cellText(value.result as ExcelJS.CellValue);
    }
    if ("hyperlink" in value) {
      return String(value.hyperlink ?? "").trim();
    }
  }
  return String(value).trim();
}

function trimSheet(headers: string[], rows: string[][]) {
  let headerCount = headers.length;
  while (headerCount > 0 && !headers[headerCount - 1]) headerCount -= 1;
  if (headerCount === 0) {
    throw new ActionError("The first row must contain column headers.");
  }

  const finalHeaders = headers.slice(0, headerCount).map((header, index) => {
    const name = header.trim();
    return name || `Column ${String.fromCharCode(65 + (index % 26))}`;
  });

  const finalRows = rows
    .map((row) => row.slice(0, headerCount))
    .filter((row) => row.some((cell) => cell.trim()));

  return { headers: finalHeaders, rows: finalRows };
}

async function parseSheet(buffer: ArrayBuffer, fileName: string): Promise<ParsedSheet> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
    let records: string[][];
    try {
      records = parseCsv(text, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as string[][];
    } catch {
      throw new ActionError("Could not read this CSV file.");
    }
    if (records.length === 0) throw new ActionError("The file is empty.");
    const [headers, ...rows] = records;
    return { fileName, ...trimSheet(headers, rows) };
  }

  if (!lower.endsWith(".xlsx")) {
    throw new ActionError("Upload an .xlsx or .csv file.");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ActionError("Could not read this Excel file.");
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new ActionError("The workbook has no sheets.");

  const columnCount = Math.min(worksheet.columnCount, 100);
  const records: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let column = 1; column <= columnCount; column += 1) {
      values.push(cellText(row.getCell(column).value));
    }
    records.push(values);
  });

  if (records.length === 0) throw new ActionError("The sheet is empty.");
  const [headers, ...rows] = records;
  return { fileName, ...trimSheet(headers, rows) };
}

async function readFormFile(formData: FormData): Promise<ParsedSheet> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ActionError("Choose an .xlsx or .csv file to import.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ActionError("The file is too large. Use a file up to 5 MB.");
  }

  const sheet = await parseSheet(await file.arrayBuffer(), file.name);
  if (sheet.rows.length > MAX_ROWS) {
    throw new ActionError(`Import up to ${MAX_ROWS} rows at a time.`);
  }
  return sheet;
}

function mappingFrom(formData: FormData, headerCount: number): ImportMapping {
  const mapping = parseImportMapping(formData.get("mapping"), headerCount);
  if (mapping.businessName === undefined) {
    throw new ActionError("Map the Business name column before continuing.");
  }
  return mapping;
}

function mapRows(
  headers: string[],
  rows: string[][],
  mapping: ImportMapping,
): MappedRow[] {
  return rows.map((row, index) => {
    const values = emptyImportValues();
    for (const [key, column] of Object.entries(mapping)) {
      if (typeof column !== "number") continue;
      values[key as ImportFieldKey] = row[column] ?? "";
    }
    return { rowNumber: index + 2, values };
  });
}

function matchOption<T extends string>(
  value: string,
  options: readonly T[],
  labels?: Record<T, string>,
): T | null {
  const normalized = value.trim().toLowerCase();
  for (const option of options) {
    if (option.toLowerCase() === normalized) return option;
    if (labels && labels[option].toLowerCase() === normalized) return option;
  }
  return null;
}

function prepareRow(values: Record<ImportFieldKey, string>):
  | { errors: string[] }
  | { errors: []; prepared: PreparedRow } {
  const errors: string[] = [];

  const channel: Channel | null = values.channel.trim()
    ? matchOption(values.channel, CHANNELS, CHANNEL_LABELS)
    : "linkedin";
  if (!channel) errors.push(`Unknown channel "${values.channel}".`);

  const status: LeadStatus | null = values.status.trim()
    ? matchOption(values.status, LEAD_STATUSES, LEAD_STATUS_LABELS)
    : "new";
  if (!status) errors.push(`Unknown status "${values.status}".`);

  const servicePitched: ServicePitched | null = values.servicePitched.trim()
    ? matchOption(values.servicePitched, SERVICES)
    : "AI Systems";
  if (!servicePitched) {
    errors.push(`Unknown service pitched "${values.servicePitched}".`);
  }

  if (errors.length > 0) return { errors };

  const parsed = leadInputSchema.safeParse({
    businessName: values.businessName,
    contactName: values.contactName,
    jobTitle: values.jobTitle,
    industry: values.industry,
    country: values.country,
    channel,
    source: values.source,
    profileUrl: values.profileUrl,
    email: values.email,
    phone: values.phone,
    observation: values.observation,
    servicePitched,
    status,
    notes: values.notes,
  });

  if (!parsed.success) {
    return {
      errors: Array.from(
        new Set(parsed.error.issues.map((issue) => issue.message)),
      ),
    };
  }

  return {
    errors: [],
    prepared: {
      payload: parsed.data,
      profileKey: normalizeProfileUrl(parsed.data.profileUrl),
      businessKey: normalizeBusinessName(parsed.data.businessName),
    },
  };
}

function ownerLabel(name: string | null, email: string | null) {
  return name?.trim() || email?.trim() || "another employee";
}

async function loadDuplicates(): Promise<DuplicateLookup> {
  const rows = await db
    .select({
      businessName: leads.businessName,
      profileUrl: leads.profileUrl,
      ownerName: users.fullName,
      ownerEmail: users.email,
    })
    .from(leads)
    .leftJoin(users, eq(leads.ownerId, users.id))
    .where(isNull(leads.deletedAt));

  const byProfile = new Map<string, string>();
  const byBusiness = new Map<string, string>();

  for (const row of rows) {
    const owner = ownerLabel(row.ownerName, row.ownerEmail);
    const profileKey = normalizeProfileUrl(row.profileUrl);
    const businessKey = normalizeBusinessName(row.businessName);
    if (profileKey && !byProfile.has(profileKey)) byProfile.set(profileKey, owner);
    if (businessKey && !byBusiness.has(businessKey)) {
      byBusiness.set(businessKey, owner);
    }
  }

  return { byProfile, byBusiness };
}

function findDuplicate(
  prepared: PreparedRow,
  lookup: DuplicateLookup,
  seen: SeenKeys,
): { owner: string; kind: "team" | "file" } | null {
  if (prepared.profileKey) {
    const teamOwner = lookup.byProfile.get(prepared.profileKey);
    if (teamOwner) return { owner: teamOwner, kind: "team" };
    const fileRow = seen.byProfile.get(prepared.profileKey);
    if (fileRow) return { owner: `row ${fileRow} in this file`, kind: "file" };
  }

  const teamOwner = lookup.byBusiness.get(prepared.businessKey);
  if (teamOwner) return { owner: teamOwner, kind: "team" };
  const fileRow = seen.byBusiness.get(prepared.businessKey);
  if (fileRow) return { owner: `row ${fileRow} in this file`, kind: "file" };

  return null;
}

function rememberKeys(prepared: PreparedRow, seen: SeenKeys, rowNumber: number) {
  if (prepared.profileKey && !seen.byProfile.has(prepared.profileKey)) {
    seen.byProfile.set(prepared.profileKey, rowNumber);
  }
  if (!seen.byBusiness.has(prepared.businessKey)) {
    seen.byBusiness.set(prepared.businessKey, rowNumber);
  }
}

export async function analyzeImportFile(
  formData: FormData,
): Promise<ImportSheetAnalysis> {
  const sheet = await readFormFile(formData);
  return {
    fileName: sheet.fileName,
    headers: sheet.headers,
    totalRows: sheet.rows.length,
    sampleRows: sheet.rows.slice(0, 3),
    suggestedMapping: suggestImportMapping(sheet.headers),
  };
}

export async function previewImportFile(
  formData: FormData,
): Promise<ImportPreview> {
  const sheet = await readFormFile(formData);
  const mapping = mappingFrom(formData, sheet.headers.length);
  const mapped = mapRows(sheet.headers, sheet.rows, mapping);
  const lookup = await loadDuplicates();
  const seen: SeenKeys = { byProfile: new Map(), byBusiness: new Map() };

  const rows: ImportPreviewRow[] = [];
  let validCount = 0;

  for (const row of mapped.slice(0, 20)) {
    const result = prepareRow(row.values);
    if (!("prepared" in result)) {
      rows.push({ ...row, errors: result.errors });
      continue;
    }

    const duplicate = findDuplicate(result.prepared, lookup, seen);
    rememberKeys(result.prepared, seen, row.rowNumber);

    if (duplicate) {
      rows.push({
        ...row,
        errors: [],
        duplicateOwner: duplicate.owner,
        duplicateKind: duplicate.kind,
      });
      continue;
    }

    validCount += 1;
    rows.push({ ...row, errors: [] });
  }

  return {
    fileName: sheet.fileName,
    totalRows: sheet.rows.length,
    rows,
    validCount,
  };
}

export async function importLeadsFromFile(
  formData: FormData,
  ownerId: string,
): Promise<ImportResult> {
  const sheet = await readFormFile(formData);
  const mapping = mappingFrom(formData, sheet.headers.length);
  const mapped = mapRows(sheet.headers, sheet.rows, mapping);
  const lookup = await loadDuplicates();
  const seen: SeenKeys = { byProfile: new Map(), byBusiness: new Map() };

  const pending: {
    rowNumber: number;
    prepared: PreparedRow;
    values: Record<ImportFieldKey, string>;
  }[] = [];
  const failedRows: ImportResult["failedRows"] = [];
  let skipped = 0;

  for (const row of mapped) {
    const result = prepareRow(row.values);
    if (!("prepared" in result)) {
      failedRows.push({
        rowNumber: row.rowNumber,
        values: row.values,
        error: result.errors.join(" "),
        kind: "failed",
      });
      continue;
    }

    const duplicate = findDuplicate(result.prepared, lookup, seen);
    rememberKeys(result.prepared, seen, row.rowNumber);
    if (duplicate) {
      skipped += 1;
      failedRows.push({
        rowNumber: row.rowNumber,
        values: row.values,
        error:
          duplicate.kind === "team"
            ? `Duplicate owned by ${duplicate.owner}.`
            : `Duplicate of ${duplicate.owner}.`,
        kind: "skipped",
      });
      continue;
    }

    pending.push({
      rowNumber: row.rowNumber,
      prepared: result.prepared,
      values: row.values,
    });
  }

  function toInsert(row: PreparedRow) {
    const data = row.payload;
    return {
      ownerId,
      contactName: data.contactName ?? "",
      businessName: data.businessName,
      jobTitle: data.jobTitle ?? null,
      industry: data.industry ?? null,
      country: data.country ?? null,
      channel: data.channel,
      source: data.source ?? null,
      profileUrl: normalizeProfileUrl(data.profileUrl),
      email: data.email ?? null,
      phone: data.phone ?? null,
      observation: data.observation ?? null,
      servicePitched: data.servicePitched,
      status: data.status ?? "new",
      notes: data.notes ?? null,
    };
  }

  let created = 0;
  for (let index = 0; index < pending.length; index += 100) {
    const chunk = pending.slice(index, index + 100);
    try {
      const inserted = await db
        .insert(leads)
        .values(chunk.map((row) => toInsert(row.prepared)))
        .returning({ id: leads.id });
      created += inserted.length;
    } catch {
      for (const row of chunk) {
        try {
          await db.insert(leads).values(toInsert(row.prepared));
          created += 1;
        } catch {
          failedRows.push({
            rowNumber: row.rowNumber,
            values: row.values,
            error: "The database rejected this row.",
            kind: "failed",
          });
        }
      }
    }
  }

  return {
    fileName: sheet.fileName,
    created,
    skipped,
    failed: failedRows.filter((row) => row.kind === "failed").length,
    failedRows,
  };
}
