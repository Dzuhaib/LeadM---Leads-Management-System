import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  parseImportMapping,
  suggestImportMapping,
} from "@/lib/import-fields";
import {
  buildAdminWorkbook,
  buildEmployeeWorkbook,
  buildImportTemplateWorkbook,
  type ActivityExportRow,
  type LeadExportRow,
} from "@/lib/excel-export";

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}

function fillColor(cell: ExcelJS.Cell) {
  const fill = cell.fill;
  if (!fill || !("fgColor" in fill)) return undefined;
  return fill.fgColor?.argb;
}

const lead: LeadExportRow = {
  businessName: "Acme",
  contactName: "Jane",
  jobTitle: "Founder",
  industry: "SaaS",
  country: "US",
  channel: "linkedin",
  source: "Referral",
  profileUrl: "linkedin.com/in/jane",
  email: "jane@example.com",
  phone: null,
  servicePitched: "AI Systems",
  status: "contacted",
  nextFollowUpAt: new Date("2026-11-07T10:00:00.000Z"),
  followUpStage: 0,
  notes: "Warm lead",
  createdAt: new Date("2026-11-01T10:00:00.000Z"),
  ownerName: "Employee",
  ownerEmail: "employee@example.com",
};

const activity: ActivityExportRow = {
  occurredAt: new Date("2026-11-01T10:00:00.000Z"),
  businessName: "Acme",
  contactName: "Jane",
  employeeName: "Employee",
  type: "dm_sent",
  channel: "linkedin",
  replyTag: null,
  replyText: null,
  note: null,
};

describe("import mapping", () => {
  it("suggests columns from common headers", () => {
    const mapping = suggestImportMapping([
      "Company Name",
      "Contact Name",
      "LinkedIn URL",
      "Status",
      "Service",
    ]);
    expect(mapping.businessName).toBe(0);
    expect(mapping.contactName).toBe(1);
    expect(mapping.profileUrl).toBe(2);
    expect(mapping.status).toBe(3);
    expect(mapping.servicePitched).toBe(4);
  });

  it("ignores invalid mapping indexes", () => {
    expect(
      parseImportMapping(
        JSON.stringify({ businessName: 0, contactName: 99, status: -1 }),
        3,
      ),
    ).toEqual({ businessName: 0 });
  });
});

describe("Excel exports", () => {
  it("builds the employee workbook with styled leads and activities", async () => {
    const buffer = await buildEmployeeWorkbook({
      leads: [lead],
      activities: [activity],
    });
    const workbook = await loadWorkbook(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Leads",
      "Activities",
    ]);

    const sheet = workbook.getWorksheet("Leads")!;
    expect(sheet.rowCount).toBe(2);
    expect(sheet.views[0]?.state).toBe("frozen");
    expect(fillColor(sheet.getCell("A1"))).toBe("FF7C3AED");
    expect(sheet.getCell("L2").value).toBe("Contacted");
    expect(fillColor(sheet.getCell("L2"))).toBe("FFEDE9FE");
    expect(sheet.getColumn(16).numFmt).toBe("yyyy-mm-dd hh:mm");
  });

  it("builds the admin workbook with all four sheets", async () => {
    const buffer = await buildAdminWorkbook({
      leads: [lead],
      activities: [activity],
      replies: [],
      summary: {
        days: ["2026-11-01", "2026-11-02"],
        members: [
          {
            name: "Employee",
            email: "employee@example.com",
            counts: { "2026-11-01": 2, "2026-11-02": 3 },
          },
        ],
      },
    });
    const workbook = await loadWorkbook(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Leads",
      "Activities",
      "Replies",
      "Employee Summary",
    ]);
    const summary = workbook.getWorksheet("Employee Summary")!;
    expect(summary.getCell("C2").value).toBe(2);
    expect(summary.getCell("D2").value).toBe(3);
    expect(summary.getCell("E2").value).toBe(5);
  });

  it("builds the import template with dropdown validation", async () => {
    const buffer = await buildImportTemplateWorkbook();
    const workbook = await loadWorkbook(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Leads",
      "Instructions",
    ]);
    const sheet = workbook.getWorksheet("Leads")!;
    expect(sheet.getCell("A1").value).toBe("Business Name");
    expect(sheet.getCell("F1").value).toBe("Channel");
    expect(sheet.getCell("F2").dataValidation.type).toBe("list");
  });
});
