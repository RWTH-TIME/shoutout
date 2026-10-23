"use client";

import { JobFile } from "../../types/types";

type Props = {
  files: JobFile[];
  activeFileId: string;
  onChange: (fileId: string) => void;
};

export default function FileTabs({ files, activeFileId, onChange }: Props) {
  if (files.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => {
        const active = file.id === activeFileId;
        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onChange(file.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              active
                ? "bg-primary/15 font-medium text-primary"
                : "bg-surface-hover text-on-surface hover:bg-primary/10"
            }`}
          >
            {file.originalName}
          </button>
        );
      })}
    </div>
  );
}
