import ExcelJS from "exceljs";
import {
  ACTIVITY_TYPE_LABELS,
  CHANNEL_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  REPLY_TAG_LABELS,
  SERVICES,
  type ActivityType,
  type Channel,
  type LeadStatus,
  type ReplyTag,
  type ServicePitched,
} from "@/lib/constants";

const HEADER_COLOR = "FF0071E3";
const BORDER_COLOR = "FFD2D2D7";

const STATUS_STYLES: Record<string, { fill: string; font: string }> = {
  new: { fill: "FFF1F5F9", font: "FF334155" },
  contacted: { fill: "FFEFF6FF", font: "FF1D4ED8" },
  replied: { fill: "FFF0FDFA", font: "FF0F766E" },
  "call booked": { fill: "FFFFFBEB", font: "FF92400E" },
  "proposal sent": { fill: "FFECFEFF", font: "FF0E7490" },
  won: { fill: "FFF0FDF4", font: "FF15803D" },
  lost: { fill: "FFFFE4E6", font: "FF9F1239" },
  "no reply": { fill: "FFFFEDD5", font: "FF9A3412" },
};

export type LeadExportRow = {
  businessName: string;
  contactName: string;
  jobTitle: string | null;
  industry: string | null;
  country: string | null;
  channel: Channel;
  source: string | null;
  profileUrl: string | null;
  email: string | null;
  phone: string | null;
  servicePitched: ServicePitched;
  status: LeadStatus;
  nextFollowUpAt: Date | null;
  followUpStage: number;
  notes: string | null;
  createdAt: Date;
  ownerName?: string | null;
  ownerEmail?: string | null;
};

export type ActivityExportRow = {
  occurredAt: Date;
  businessName: string;
  contactName: string;
  employeeName: string;
  type: ActivityType;
  channel: Channel;
  replyTag: ReplyTag | null;
  replyText: string | null;
  note: string | null;
};

export type EmployeeSummaryExport = {
  days: string[];
  members: {
    name: string;
    email: string;
    counts: Record<string, number>;
  }[];
};

function styleColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
}

function styleHeader(worksheet: ExcelJS.Worksheet, columnCount: number) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.getRow(1).height = 24;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_COLOR },
    };
    cell.alignment = { vertical: "middle" };
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columnCount },
  };
}

function styleBody(worksheet: ExcelJS.Worksheet) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "hair", color: { argb: BORDER_COLOR } },
      };
      cell.alignment = { vertical: "top" };
    });
  });
}

function styleStatusColumn(worksheet: ExcelJS.Worksheet, columnIndex: number) {
  for (let row = 2; row <= worksheet.rowCount; row += 1) {
    const cell = worksheet.getCell(row, columnIndex);
    const key = String(cell.value ?? "").toLowerCase();
    const style = STATUS_STYLES[key];
    if (!style) continue;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: style.fill },
    };
    cell.font = { bold: true, color: { argb: style.font } };
  }
}

function setDateColumns(worksheet: ExcelJS.Worksheet, columns: string[]) {
  for (const key of columns) {
    worksheet.getColumn(key).numFmt = "yyyy-mm-dd hh:mm";
  }
}

function addLeadsSheet(
  workbook: ExcelJS.Workbook,
  leads: LeadExportRow[],
  includeOwner: boolean,
) {
  const columns = [
    { header: "Business name", key: "businessName", width: 30 },
    { header: "Contact name", key: "contactName", width: 22 },
    { header: "Job title", key: "jobTitle", width: 22 },
    { header: "Industry", key: "industry", width: 20 },
    { header: "Country", key: "country", width: 16 },
    { header: "Channel", key: "channel", width: 14 },
    { header: "Source", key: "source", width: 18 },
    { header: "Profile URL", key: "profileUrl", width: 40 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Service pitched", key: "servicePitched", width: 20 },
    { header: "Status", key: "status", width: 16 },
    { header: "Next follow-up", key: "nextFollowUpAt", width: 20 },
    { header: "Follow-up stage", key: "followUpStage", width: 15 },
    { header: "Notes", key: "notes", width: 40 },
    { header: "Created at", key: "createdAt", width: 20 },
    ...(includeOwner
      ? [
          { header: "Owner", key: "ownerName", width: 24 },
          { header: "Owner email", key: "ownerEmail", width: 28 },
        ]
      : []),
  ];

  const worksheet = workbook.addWorksheet("Leads");
  worksheet.columns = columns;
  styleHeader(worksheet, columns.length);
  styleColumnWidths(
    worksheet,
    columns.map((column) => column.width),
  );

  for (const lead of leads) {
    worksheet.addRow({
      businessName: lead.businessName,
      contactName: lead.contactName,
      jobTitle: lead.jobTitle,
      industry: lead.industry,
      country: lead.country,
      channel: CHANNEL_LABELS[lead.channel],
      source: lead.source,
      profileUrl: lead.profileUrl,
      email: lead.email,
      phone: lead.phone,
      servicePitched: lead.servicePitched,
      status: LEAD_STATUS_LABELS[lead.status],
      nextFollowUpAt: lead.nextFollowUpAt,
      followUpStage: lead.followUpStage,
      notes: lead.notes,
      createdAt: lead.createdAt,
      ownerName: lead.ownerName ?? "",
      ownerEmail: lead.ownerEmail ?? "",
    });
  }

  setDateColumns(worksheet, ["nextFollowUpAt", "createdAt"]);
  styleStatusColumn(worksheet, 12);
  styleBody(worksheet);
}

function addActivitiesSheet(
  workbook: ExcelJS.Workbook,
  activities: ActivityExportRow[],
) {
  const columns = [
    { header: "Date", key: "occurredAt", width: 20 },
    { header: "Business", key: "businessName", width: 30 },
    { header: "Contact", key: "contactName", width: 22 },
    { header: "Employee", key: "employeeName", width: 24 },
    { header: "Activity", key: "type", width: 22 },
    { header: "Channel", key: "channel", width: 14 },
    { header: "Reply tag", key: "replyTag", width: 16 },
    { header: "Reply text", key: "replyText", width: 55 },
    { header: "Note", key: "note", width: 45 },
  ];

  const worksheet = workbook.addWorksheet("Activities");
  worksheet.columns = columns;
  styleHeader(worksheet, columns.length);
  styleColumnWidths(
    worksheet,
    columns.map((column) => column.width),
  );

  for (const activity of activities) {
    worksheet.addRow({
      occurredAt: activity.occurredAt,
      businessName: activity.businessName,
      contactName: activity.contactName,
      employeeName: activity.employeeName,
      type: ACTIVITY_TYPE_LABELS[activity.type],
      channel: CHANNEL_LABELS[activity.channel],
      replyTag: activity.replyTag ? REPLY_TAG_LABELS[activity.replyTag] : "",
      replyText: activity.replyText,
      note: activity.note,
    });
  }

  setDateColumns(worksheet, ["occurredAt"]);
  styleBody(worksheet);
}

function addRepliesSheet(
  workbook: ExcelJS.Workbook,
  replies: ActivityExportRow[],
) {
  const columns = [
    { header: "Replied at", key: "occurredAt", width: 20 },
    { header: "Business", key: "businessName", width: 30 },
    { header: "Contact", key: "contactName", width: 22 },
    { header: "Employee", key: "employeeName", width: 24 },
    { header: "Channel", key: "channel", width: 14 },
    { header: "Tag", key: "replyTag", width: 16 },
    { header: "Reply text", key: "replyText", width: 65 },
  ];

  const worksheet = workbook.addWorksheet("Replies");
  worksheet.columns = columns;
  styleHeader(worksheet, columns.length);
  styleColumnWidths(
    worksheet,
    columns.map((column) => column.width),
  );

  for (const reply of replies) {
    worksheet.addRow({
      occurredAt: reply.occurredAt,
      businessName: reply.businessName,
      contactName: reply.contactName,
      employeeName: reply.employeeName,
      channel: CHANNEL_LABELS[reply.channel],
      replyTag: reply.replyTag ? REPLY_TAG_LABELS[reply.replyTag] : "",
      replyText: reply.replyText,
    });
  }

  setDateColumns(worksheet, ["occurredAt"]);
  styleBody(worksheet);
}

function addEmployeeSummarySheet(
  workbook: ExcelJS.Workbook,
  summary: EmployeeSummaryExport,
) {
  const columns = [
    { header: "Employee", key: "name", width: 26 },
    { header: "Email", key: "email", width: 30 },
    ...summary.days.map((day, index) => ({
      header: day,
      key: `day_${index}`,
      width: 11,
    })),
    { header: "Total", key: "total", width: 11 },
  ];

  const worksheet = workbook.addWorksheet("Employee Summary");
  worksheet.columns = columns;
  styleHeader(worksheet, columns.length);
  styleColumnWidths(
    worksheet,
    columns.map((column) => column.width),
  );

  for (const member of summary.members) {
    const row: Record<string, string | number> = {
      name: member.name,
      email: member.email,
    };
    let total = 0;
    summary.days.forEach((day, index) => {
      const value = member.counts[day] ?? 0;
      total += value;
      row[`day_${index}`] = value;
    });
    row.total = total;
    worksheet.addRow(row);
  }

  worksheet.getColumn("total").font = { bold: true };
  styleBody(worksheet);
}

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AIVized Lead Tracker";
  workbook.created = new Date();
  return workbook;
}

async function toBuffer(workbook: ExcelJS.Workbook) {
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}

export async function buildEmployeeWorkbook(input: {
  leads: LeadExportRow[];
  activities: ActivityExportRow[];
}) {
  const workbook = createWorkbook();
  addLeadsSheet(workbook, input.leads, false);
  addActivitiesSheet(workbook, input.activities);
  return toBuffer(workbook);
}

export async function buildAdminWorkbook(input: {
  leads: LeadExportRow[];
  activities: ActivityExportRow[];
  replies: ActivityExportRow[];
  summary: EmployeeSummaryExport;
}) {
  const workbook = createWorkbook();
  addLeadsSheet(workbook, input.leads, true);
  addActivitiesSheet(workbook, input.activities);
  addRepliesSheet(workbook, input.replies);
  addEmployeeSummarySheet(workbook, input.summary);
  return toBuffer(workbook);
}

export async function buildImportTemplateWorkbook() {
  const workbook = createWorkbook();
  const columns = [
    { header: "Business Name", key: "businessName", width: 30 },
    { header: "Contact Name", key: "contactName", width: 22 },
    { header: "Job Title", key: "jobTitle", width: 22 },
    { header: "Industry", key: "industry", width: 20 },
    { header: "Country", key: "country", width: 16 },
    { header: "Channel", key: "channel", width: 14 },
    { header: "Source", key: "source", width: 18 },
    { header: "Profile URL", key: "profileUrl", width: 40 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Observation", key: "observation", width: 35 },
    { header: "Service Pitched", key: "servicePitched", width: 20 },
    { header: "Status", key: "status", width: 16 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  const worksheet = workbook.addWorksheet("Leads");
  worksheet.columns = columns;
  styleHeader(worksheet, columns.length);
  styleColumnWidths(
    worksheet,
    columns.map((column) => column.width),
  );

  const validations: [string, string][] = [
    ["F", ["linkedin", "whatsapp", "facebook", "other"].join(",")],
    ["L", SERVICES.join(",")],
    ["M", LEAD_STATUSES.join(",")],
  ];
  for (const [column, list] of validations) {
    for (let row = 2; row <= 501; row += 1) {
      worksheet.getCell(`${column}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${list}"`],
      };
    }
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.getColumn(1).width = 110;
  instructions.addRows([
    ["AIVized Lead Tracker import template"],
    ["Keep the header row unchanged. Business Name is required."],
    [
      "Channel accepts linkedin, whatsapp, facebook or other (blank defaults to linkedin).",
    ],
    [
      "Status accepts new, contacted, replied, call_booked, proposal_sent, won, lost or no_reply (blank defaults to new).",
    ],
    ["Service Pitched can be selected from the dropdown in column L."],
    [
      "Duplicate profile URLs or business names are skipped across the whole team and shown in the import summary.",
    ],
    ["Rows with validation errors are not imported and can be downloaded as a CSV."],
  ]);
  instructions.getCell("A1").font = {
    bold: true,
    size: 14,
    color: { argb: HEADER_COLOR },
  };

  return toBuffer(workbook);
}
