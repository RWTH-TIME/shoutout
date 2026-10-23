"use client";

import { Button, CopyToClipboardWrapper } from "@helpwave/hightide";
import useAppTranslation from "../../hooks/useAppTranslation";

type CodeSnippetProps = {
  label: string;
  code: string;
};

export default function CodeSnippet({ label, code }: CodeSnippetProps) {
  const translation = useAppTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <CopyToClipboardWrapper textToCopy={code}>
          <Button coloringStyle="text" size="xs">
            {translation("copyToken")}
          </Button>
        </CopyToClipboardWrapper>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-divider bg-surface-variant p-3 text-xs leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
