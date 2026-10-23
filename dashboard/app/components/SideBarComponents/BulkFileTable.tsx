"use client";

import { Button } from "@helpwave/hightide";
import { Trash2 } from "lucide-react";
import { AvailableModel, BulkFileEntry } from "../../types/types";
import { formatFileSize } from "../../utils/file";
import useAppTranslation from "../../hooks/useAppTranslation";
import LanguageToggle from "../jobs/LanguageToggle";
import ParticipantsInput from "../jobs/ParticipantsInput";

type Props = {
  entries: BulkFileEntry[];
  models: AvailableModel[];
  onChange: (entries: BulkFileEntry[]) => void;
  sharedLanguage: string;
  sharedParticipants: number;
  onSharedLanguageChange: (language: string) => void;
  onSharedParticipantsChange: (participants: number) => void;
};

export default function BulkFileTable({
  entries,
  onChange,
  sharedLanguage,
  sharedParticipants,
  onSharedLanguageChange,
  onSharedParticipantsChange,
}: Props) {
  const translation = useAppTranslation();

  function updateAt(index: number, patch: Partial<BulkFileEntry>) {
    onChange(
      entries.map((entry, current) =>
        current === index ? { ...entry, ...patch } : entry
      )
    );
  }

  function removeAt(index: number) {
    onChange(entries.filter((_, current) => current !== index));
  }

  function applyLanguage(language: string) {
    onSharedLanguageChange(language);
    onChange(entries.map((entry) => ({ ...entry, language })));
  }

  function applyParticipants(participants: number) {
    onSharedParticipantsChange(participants);
    onChange(entries.map((entry) => ({ ...entry, participants })));
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[50vh] overflow-auto rounded-xl border border-divider">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-divider text-left text-description">
              <th className="px-3 py-2 font-medium">{translation("file")}</th>
              <th className="px-3 py-2 font-medium">
                {translation("language")}
              </th>
              <th className="px-3 py-2 font-medium">
                {translation("participants")}
              </th>
              <th className="px-3 py-2 font-medium" />
            </tr>
            <tr className="border-b border-divider bg-primary/5">
              <td className="px-3 py-2 font-medium text-primary">
                {translation("applyToAll")}
              </td>
              <td className="px-3 py-2">
                <LanguageToggle
                  value={sharedLanguage}
                  onChange={applyLanguage}
                  size="xs"
                />
              </td>
              <td className="px-3 py-2">
                <ParticipantsInput
                  value={sharedParticipants}
                  onChange={applyParticipants}
                />
              </td>
              <td className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.file.name}-${index}`}
                className="border-b border-divider last:border-b-0"
              >
                <td className="max-w-[220px] px-3 py-2">
                  <div className="truncate font-medium">{entry.file.name}</div>
                  <div className="text-xs text-description">
                    {formatFileSize(entry.file.size)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <LanguageToggle
                    value={entry.language}
                    onChange={(language) => updateAt(index, { language })}
                    size="xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <ParticipantsInput
                    value={entry.participants}
                    onChange={(participants) =>
                      updateAt(index, { participants })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Button
                    color="negative"
                    coloringStyle="text"
                    size="sm"
                    onClick={() => removeAt(index)}
                    aria-label={translation("remove")}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
