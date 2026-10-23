"use client";

import { useEffect } from "react";
import { Select } from "@helpwave/hightide";
import { AvailableModel } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";

type ModelSelectProps = {
  value: string;
  models: AvailableModel[];
  onChange: (value: string) => void;
  showLabel?: boolean;
};

export default function ModelSelect({
  value,
  models,
  onChange,
  showLabel = false,
}: ModelSelectProps) {
  const translation = useAppTranslation();
  const defaultModel = models[0]?.model ?? "";

  useEffect(() => {
    if (!value && defaultModel) {
      onChange(defaultModel);
    }
  }, [defaultModel, onChange, value]);

  return (
    <div className="flex flex-col gap-1">
      {showLabel ? (
        <div className="text-xs text-description">{translation("model")}</div>
      ) : null}
      <Select
        value={value || defaultModel || null}
        onValueChange={(next) => onChange(next ?? "")}
        placeholder={translation("model")}
      >
        {models.map((item) => (
          <Select.Option
            key={item.model}
            value={item.model}
            label={`${item.model} (${item.workerCount})`}
          />
        ))}
      </Select>
    </div>
  );
}
