"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { updateName, updatePassword } from "@/lib/actions/account";
import { exportUserData, importUserData, type ImportResult } from "@/lib/actions/settings";

const inputClass =
  "rounded-md border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent";
const primaryButtonClass =
  "shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60";

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

function ChangeNameForm({ name }: { name: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateName, null);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="name" className="text-sm font-medium text-text-muted">
        Name
      </label>
      <div className="flex gap-2">
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={name}
          className={`flex-1 ${inputClass}`}
        />
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-text-muted">Name updated.</p>}
    </form>
  );
}

function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(updatePassword, null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium text-text-muted">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-text-muted">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-text-muted">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-text-muted">Password changed.</p>}
      <button type="submit" disabled={isPending} className={primaryButtonClass}>
        {isPending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
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
        <h2 className="text-sm font-semibold text-text-muted">Profile</h2>
        <div className="mt-2 flex flex-col gap-5 rounded-md border border-border bg-surface p-4">
          <ChangeNameForm name={name} />
          <div className="h-px bg-border" />
          <ChangePasswordForm />
          <p className="text-xs text-text-muted">
            Your email ({email}) is tied to access for this app and can&apos;t be changed here.
          </p>
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
