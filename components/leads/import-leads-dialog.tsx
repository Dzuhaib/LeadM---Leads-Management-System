"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  analyzeImport,
  confirmImport,
  previewImport,
} from "@/actions/import";
import {
  IMPORT_FIELDS,
  type ImportFieldKey,
  type ImportMapping,
  type ImportPreview,
  type ImportResult,
  type ImportSheetAnalysis,
} from "@/lib/import-fields";

function buildFailedCsv(result: ImportResult) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const headers = [...IMPORT_FIELDS.map((field) => field.label), "Error"];
  const lines = [
    headers,
    ...result.failedRows.map((row) => [
      ...IMPORT_FIELDS.map((field) => row.values[field.key] ?? ""),
      row.error,
    ]),
  ];
  return lines.map((line) => line.map(escape).join(",")).join("\n");
}

export function ImportLeadsDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [analysis, setAnalysis] = React.useState<ImportSheetAnalysis | null>(
    null,
  );
  const [mapping, setMapping] = React.useState<ImportMapping>({});
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setFile(null);
    setAnalysis(null);
    setMapping({});
    setPreview(null);
    setResult(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setAnalysis(null);
    setMapping({});
    setPreview(null);
    setResult(null);
  }

  function analyze() {
    if (!file) {
      toast.error("Choose an .xlsx or .csv file first.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const response = await analyzeImport(formData);
      if (!response.ok || !response.data) {
        toast.error(response.ok ? "Could not read the file." : response.error);
        return;
      }
      setAnalysis(response.data);
      setMapping(response.data.suggestedMapping);
      setPreview(null);
      setResult(null);
    });
  }

  function updateMapping(key: ImportFieldKey, value: string) {
    setMapping((current) => {
      const next = { ...current };
      if (value === "") delete next[key];
      else next[key] = Number(value);
      return next;
    });
    setPreview(null);
    setResult(null);
  }

  function runPreview() {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("mapping", JSON.stringify(mapping));

    startTransition(async () => {
      const response = await previewImport(formData);
      if (!response.ok || !response.data) {
        toast.error(response.ok ? "Could not preview the file." : response.error);
        return;
      }
      setPreview(response.data);
      setResult(null);
    });
  }

  function runImport() {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("mapping", JSON.stringify(mapping));

    startTransition(async () => {
      const response = await confirmImport(formData);
      if (!response.ok || !response.data) {
        toast.error(response.ok ? "Import failed." : response.error);
        return;
      }
      setResult(response.data);
      toast.success(
        `Imported ${response.data.created} lead${
          response.data.created === 1 ? "" : "s"
        }.`,
      );
      router.refresh();
    });
  }

  function downloadFailed() {
    if (!result) return;
    const csv = buildFailedCsv(result);
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${result.fileName.replace(/\.[^.]+$/, "")}-problem-rows.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file, map its columns, preview the first 20
            rows, then import. Duplicate profile URLs and business names are
            skipped across the whole team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">1. Choose a file</p>
              <p className="text-xs text-muted-foreground">
                .xlsx or .csv, up to 5 MB and 1,000 rows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="ghost">
                <a href="/api/import-template" download>
                  <Download className="h-4 w-4" />
                  Download template
                </a>
              </Button>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                aria-label="Import file"
                className="max-w-[15rem] text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
              />
              <Button
                type="button"
                size="sm"
                onClick={analyze}
                disabled={!file || pending}
              >
                Continue
              </Button>
            </div>
          </div>

          {analysis ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">2. Map columns</p>
                  <p className="text-xs text-muted-foreground">
                    {analysis.fileName} · {analysis.totalRows} data row
                    {analysis.totalRows === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={runPreview}
                  disabled={mapping.businessName === undefined || pending}
                >
                  Preview first 20
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label
                      htmlFor={`import-map-${field.key}`}
                      className="text-xs"
                    >
                      {field.label}
                      {field.required ? (
                        <span className="text-destructive"> *</span>
                      ) : null}
                    </Label>
                    <Select
                      id={`import-map-${field.key}`}
                      value={
                        mapping[field.key] === undefined
                          ? ""
                          : String(mapping[field.key])
                      }
                      onChange={(event) =>
                        updateMapping(field.key, event.target.value)
                      }
                    >
                      <option value="">Do not import</option>
                      {analysis.headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={index}>
                          {header}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>

              {analysis.sampleRows.length > 0 ? (
                <div className="overflow-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/60">
                      <tr>
                        {analysis.headers.map((header, index) => (
                          <th
                            key={`${header}-${index}`}
                            className="whitespace-nowrap px-2 py-1.5 font-semibold"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.sampleRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-border">
                          {analysis.headers.map((_, columnIndex) => (
                            <td
                              key={columnIndex}
                              className="max-w-[14rem] truncate px-2 py-1.5 text-muted-foreground"
                            >
                              {row[columnIndex] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">3. Preview</p>
                  <p className="text-xs text-muted-foreground">
                    First {preview.rows.length} of {preview.totalRows} rows ·{" "}
                    {preview.validCount} valid in preview
                  </p>
                </div>
                <Button type="button" size="sm" onClick={runImport} disabled={pending}>
                  Import all {preview.totalRows} rows
                </Button>
              </div>

              <div className="max-h-80 overflow-auto rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-secondary">
                    <tr>
                      <th className="px-2 py-2">Row</th>
                      <th className="px-2 py-2">Business</th>
                      <th className="px-2 py-2">Contact</th>
                      <th className="px-2 py-2">Channel</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => {
                      const problem =
                        row.errors.length > 0 || Boolean(row.duplicateOwner);
                      return (
                        <tr
                          key={row.rowNumber}
                          className={
                            problem
                              ? "border-t border-border bg-destructive/5"
                              : "border-t border-border"
                          }
                        >
                          <td className="px-2 py-1.5 tabular-nums">
                            {row.rowNumber}
                          </td>
                          <td className="max-w-[14rem] truncate px-2 py-1.5">
                            {row.values.businessName || "—"}
                          </td>
                          <td className="max-w-[12rem] truncate px-2 py-1.5 text-muted-foreground">
                            {row.values.contactName || "—"}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {row.values.channel || "linkedin"}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {row.values.status || "new"}
                          </td>
                          <td className="px-2 py-1.5">
                            {row.errors.length > 0 ? (
                              <span className="text-destructive">
                                {row.errors.join(" ")}
                              </span>
                            ) : row.duplicateOwner ? (
                              <span className="text-amber-700 dark:text-amber-400">
                                {row.duplicateKind === "file"
                                  ? `Duplicate of ${row.duplicateOwner}`
                                  : `Duplicate owned by ${row.duplicateOwner}`}
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold">Import complete</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-950/40">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {result.created}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Created
                  </p>
                </div>
                <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-950/40">
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Skipped
                  </p>
                </div>
                <div className="rounded-md bg-rose-50 p-2 dark:bg-rose-950/40">
                  <p className="text-xl font-bold text-rose-700 dark:text-rose-300">
                    {result.failed}
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    Failed
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.failedRows.length > 0 ? (
                  <Button type="button" size="sm" variant="outline" onClick={downloadFailed}>
                    <Download className="h-4 w-4" />
                    Download problem rows
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" onClick={reset}>
                  Import another file
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
