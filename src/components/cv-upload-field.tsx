"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ApiError, uploadCvFile } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";

export function CvUploadField({
  cvUrl,
  onUploaded,
}: {
  cvUrl: string | null;
  onUploaded: (url: string, fileName: string) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setError(t("register.cvMustBePdf"));
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadCvFile(file);
      setFileName(file.name);
      onUploaded(url, file.name);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("register.cvUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{t("register.cvLabel")}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2.5 rounded-xl border border-dashed border-glass-border bg-glass-fill px-4 py-3.5 text-left transition-colors hover:bg-glass-fill-strong disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin text-sub-2" />
            <span className="text-[13px] text-sub">{t("register.cvUploading")}</span>
          </>
        ) : cvUrl && fileName ? (
          <>
            <CheckCircle2 className="size-4 shrink-0 text-avail" />
            <span className="truncate text-[13px] font-semibold text-ink">{fileName}</span>
            <span className="ml-auto shrink-0 text-[11.5px] font-semibold text-brand">{t("register.cvReplace")}</span>
          </>
        ) : (
          <>
            <Upload className="size-4 shrink-0 text-sub-2" />
            <span className="text-[13px] text-sub">{t("register.cvUploadPrompt")}</span>
          </>
        )}
      </button>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <p className="flex items-center gap-1 text-[11.5px] text-sub-2">
        <FileText className="size-3" /> {t("register.cvHint")}
      </p>
    </div>
  );
}
