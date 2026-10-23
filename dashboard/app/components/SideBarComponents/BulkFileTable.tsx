"use client";

import { Button, Input, Select } from "@helpwave/hightide";
import { BulkFileEntry, AvailableModel } from "../../types/types";
import { LANGUAGE_OPTIONS } from "../../utils/languages";

type Props = {
  entries: BulkFileEntry[];
  models: AvailableModel[];
  onChange: (entries: BulkFileEntry[]) => void;
};

export default function BulkFileTable({ entries, models, onChange }: Props) {
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

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-4">
        <span className="text-sm font-medium md:col-span-4">Set all</span>
        <Select
          value={entries[0]?.model || null}
          onValueChange={(value) => updateAll({ model: value ?? "" })}
          placeholder="Model"
        >
          {models.map((item) => (
            <Select.Option
              key={item.model}
              value={item.model}
              label={`${item.model} (${item.workerCount})`}
            />
          ))}
        </Select>
        <Input
          type="number"
          value={String(entries[0]?.participants ?? 0)}
          onValueChange={(value) =>
            updateAll({ participants: Number(value) || 0 })
          }
          placeholder="Participants"
        />
        <Select
          value={entries[0]?.language ?? ""}
          onValueChange={(value) => updateAll({ language: value ?? "" })}
          placeholder="Language"
        >
          {LANGUAGE_OPTIONS.map((item) => (
            <Select.Option
              key={item.value || "auto"}
              value={item.value}
              label={item.name}
            />
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        {entries.map((entry, index) => (
          <div
            key={`${entry.file.name}-${index}`}
            className="grid grid-cols-1 gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-5"
          >
            <Input
              value={entry.name}
              onValueChange={(value) => updateAt(index, { name: value })}
              placeholder="Name"
            />
            <Select
              value={entry.model || null}
              onValueChange={(value) => updateAt(index, { model: value ?? "" })}
              placeholder="Model"
            >
              {models.map((item) => (
                <Select.Option
                  key={item.model}
                  value={item.model}
                  label={`${item.model} (${item.workerCount})`}
                />
              ))}
            </Select>
            <Input
              type="number"
              value={String(entry.participants)}
              onValueChange={(value) =>
                updateAt(index, { participants: Number(value) || 0 })
              }
              placeholder="Participants"
            />
            <Select
              value={entry.language}
              onValueChange={(value) =>
                updateAt(index, { language: value ?? "" })
              }
              placeholder="Language"
            >
              {LANGUAGE_OPTIONS.map((item) => (
                <Select.Option
                  key={item.value || "auto"}
                  value={item.value}
                  label={item.name}
                />
              ))}
            </Select>
            <Button
              color="negative"
              coloringStyle="text"
              onClick={() => removeAt(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
