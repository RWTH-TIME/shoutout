"use client";

import { Button, Input } from "@helpwave/hightide";
import { Trash2 } from "lucide-react";
import { AvailableModel, BulkFileEntry } from "../../types/types";
import { formatFileSize } from "../../utils/file";
import { uniqueJobNamesFromBase } from "../../utils/jobName";
import useAppTranslation from "../../hooks/useAppTranslation";
import LanguageToggle from "../jobs/LanguageToggle";
import ModelSelect from "../jobs/ModelSelect";
import ParticipantsInput from "../jobs/ParticipantsInput";

type Props = {
  entries: BulkFileEntry[];
  models: AvailableModel[];
  onChange: (entries: BulkFileEntry[]) => void;
  existingNames?: ReadonlySet<string>;
  baseJobName: string;
  onBaseJobNameChange: (value: string) => void;
};

export default function BulkFileTable({
  entries,
  models,
  onChange,
  existingNames = new Set(),
  baseJobName,
  onBaseJobNameChange,
}: Props) {
  const translation = useAppTranslation();

  function updateAll(patch: Partial<BulkFileEntry>) {
    onChange(entries.map((entry) => ({ ...entry, ...patch })));
  }

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

  function applyBaseName(base: string) {
    onBaseJobNameChange(base);
    const names = uniqueJobNamesFromBase(base, entries.length, existingNames);
    onChange(
      entries.map((entry, index) => ({
        ...entry,
        name: names[index] ?? entry.name,
      }))
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-xl border border-divider bg-primary/5 p-3">
        <div className="text-xs font-medium text-primary">
          {translation("jobName")}
        </div>
        <Input
          value={baseJobName}
          onValueChange={applyBaseName}
          placeholder={translation("jobName")}
        />
        <p className="text-xs text-description">
          {translation("jobNameBulkHint")}
        </p>
      </div>

      <div className="max-h-[50vh] overflow-auto rounded-xl border border-divider">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-divider text-left text-description">
              <th className="px-3 py-2 font-medium">{translation("file")}</th>
              <th className="px-3 py-2 font-medium">{translation("jobName")}</th>
              <th className="px-3 py-2 font-medium">{translation("model")}</th>
              <th className="px-3 py-2 font-medium">
                {translation("language")}
              </th>
              <th className="px-3 py-2 font-medium">
                {translation("participants")}
              </th>
              <th className="px-3 py-2 font-medium" />
            </tr>
            <tr className="border-b border-divider bg-primary/5">
              <td className="px-3 py-2 font-medium text-primary" colSpan={2}>
                {translation("applyToAll")}
              </td>
              <td className="px-3 py-2">
                <ModelSelect
                  value={entries[0]?.model ?? ""}
                  models={models}
                  onChange={(model) => updateAll({ model })}
                />
              </td>
              <td className="px-3 py-2">
                <LanguageToggle
                  value={entries[0]?.language ?? ""}
                  onChange={(language) => updateAll({ language })}
                  size="xs"
                />
              </td>
              <td className="px-3 py-2">
                <ParticipantsInput
                  value={entries[0]?.participants ?? 0}
                  onChange={(participants) => updateAll({ participants })}
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
                <td className="max-w-[160px] px-3 py-2">
                  <div className="truncate font-medium">{entry.file.name}</div>
                  <div className="text-xs text-description">
                    {formatFileSize(entry.file.size)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium">{entry.name}</span>
                </td>
                <td className="px-3 py-2">
                  <ModelSelect
                    value={entry.model}
                    models={models}
                    onChange={(model) => updateAt(index, { model })}
                  />
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
