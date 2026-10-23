"use client";

import { FileAudio } from "lucide-react";
import { JobFile } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";

type Props = {
  files: JobFile[];
  activeFileId: string;
  onChange: (fileId: string) => void;
};

export default function FileTabs({ files, activeFileId, onChange }: Props) {
  const translation = useAppTranslation();

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileAudio size={16} className="text-primary" aria-hidden />
          {translation("files")}
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {files.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-description">
          {translation("filesDescription")}
        </p>
      </div>

      {files.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => {
            const active = file.id === activeFileId;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onChange(file.id)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? "border-primary bg-primary/15 font-medium text-primary"
                    : "border-divider text-on-surface hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {file.originalName}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm font-medium text-on-surface">
          {files[0]?.originalName}
        </div>
      )}
    </div>
  );
}
