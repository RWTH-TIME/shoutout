"use client";

import { CopyToClipboardWrapper } from "@helpwave/hightide";

type CodeSnippetProps = {
  label: string;
  code: string;
};

export default function CodeSnippet({ label, code }: CodeSnippetProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <CopyToClipboardWrapper
          alignment="bottom"
          containerClassName="bg-primary text-white px-2 py-1 rounded-lg"
          textToCopy={code}
        >
          Click to copy me
        </CopyToClipboardWrapper>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-divider bg-surface-variant p-3 text-xs leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
