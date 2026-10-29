"use client";

import { useRef, useState } from "react";
import { Button } from "@helpwave/hightide";
import { Upload } from "lucide-react";
import useAppTranslation from "../../hooks/useAppTranslation";

type AudioDropzoneProps = {
  onFilesAdded: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  compact?: boolean;
};

function filterAudioFiles(files: FileList | File[]): File[] {
  return Array.from(files).filter(
    (file) =>
      file.type.startsWith("audio/") ||
      /\.(mp3|wav|m4a|flac|ogg|aac|webm)$/i.test(file.name)
  );
}

export default function AudioDropzone({
  onFilesAdded,
  accept = "audio/*",
  multiple = true,
  compact = false,
}: AudioDropzoneProps) {
  const translation = useAppTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const files = filterAudioFiles(fileList);
    if (files.length > 0) {
      onFilesAdded(files);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm transition ${
          dragging
            ? "border-primary bg-primary/10 text-primary"
            : "border-divider text-description hover:border-primary/50 hover:bg-surface-hover"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <Upload size={16} className="shrink-0 text-primary" />
        <span>{translation("addMoreFiles")}</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
        dragging
          ? "border-primary bg-primary/10"
          : "border-divider bg-surface hover:border-primary/50 hover:bg-surface-hover"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <Upload size={32} className="text-primary" />
      <div>
        <div className="font-medium">{translation("dropAudioHere")}</div>
        <div className="mt-1 text-sm text-description">
          {translation("dropAudioHint")}
        </div>
      </div>
      <Button
        color="primary"
        coloringStyle="tonal"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {translation("browseFiles")}
      </Button>
    </div>
  );
}
