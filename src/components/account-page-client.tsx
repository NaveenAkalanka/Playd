"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { exportUserData, importUserData, type ImportResult } from "@/lib/actions/settings";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function summarize(result: ImportResult): string {
  const total =
    result.moviesAdded +
    result.tvAdded +
    result.gamesAdded +
    result.moviesWishlistAdded +
    result.tvWishlistAdded +
    result.gamesWishlistAdded;

  if (total === 0) return "Nothing new to import — everything in that file is already here.";
  return `Imported ${total} title${total === 1 ? "" : "s"} (movies +${result.moviesAdded}, TV +${result.tvAdded}, games +${result.gamesAdded}, wishlist +${result.moviesWishlistAdded + result.tvWishlistAdded + result.gamesWishlistAdded}).`;
}

export function AccountPageClient({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportUserData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `playd-export-${date}.json`);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportMessage(null);
    setImportError(null);
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importUserData(parsed);
      setImportMessage(summarize(result));
      router.refresh();
    } catch {
      setImportError("Couldn't import that file. Make sure it's a Playd export.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="text-2xl font-bold">Account</h1>

      <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <User className="size-5 text-text-muted" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="truncate text-sm text-text-muted">{email}</p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-text-muted">Data</h2>
        <div className="mt-2 flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Export data</p>
              <p className="text-sm text-text-muted">
                Download everything you&apos;ve logged as a JSON file.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-border disabled:opacity-60"
            >
              <Download className="size-4" />
              {isExporting ? "Exporting…" : "Export"}
            </button>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Import data</p>
              <p className="text-sm text-text-muted">
                Restore from a previously exported JSON file.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-border disabled:opacity-60"
            >
              <Upload className="size-4" />
              {isImporting ? "Importing…" : "Import"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>

          {importMessage && (
            <p className="text-sm text-text-muted">{importMessage}</p>
          )}
          {importError && <p className="text-sm text-destructive">{importError}</p>}
        </div>
      </div>

      <div className="mt-6">
        <SignOutButton className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2">
          <span>Sign out</span>
        </SignOutButton>
      </div>
    </div>
  );
}
