"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Select } from "@helpwave/hightide";
import { Info } from "lucide-react";
import { AvailableModel } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";
import {
  isEnglishOnlyModel,
  modelInfoKey,
  sortModels,
} from "../../utils/models";

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
  const orderedModels = useMemo(() => sortModels(models), [models]);
  const defaultModel = orderedModels[0]?.model ?? "";
  const selectedModel = value || defaultModel;
  const [infoOpen, setInfoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value && defaultModel) {
      onChange(defaultModel);
    }
  }, [defaultModel, onChange, value]);

  useEffect(() => {
    if (!infoOpen) {
      return;
    }
    function closeOnOutsidePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setInfoOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
    };
  }, [infoOpen]);

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        {showLabel ? (
          <div className="text-xs text-description">{translation("model")}</div>
        ) : null}
        <IconButton
          type="button"
          size="xs"
          color="neutral"
          coloringStyle="text"
          aria-label={translation("modelInfoLabel")}
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((open) => !open)}
        >
          <Info size={14} />
        </IconButton>
      </div>
      {infoOpen ? (
        <div
          role="note"
          className="rounded-lg border border-divider bg-surface p-3 text-sm shadow-lg"
        >
          <div className="font-medium">
            {selectedModel || translation("model")}
          </div>
          <p className="mt-1 text-description">
            {translation(modelInfoKey(selectedModel))}
          </p>
          {isEnglishOnlyModel(selectedModel) ? (
            <p className="mt-1 text-description">
              {translation("modelInfoEnglishOnly")}
            </p>
          ) : null}
        </div>
      ) : null}
      <Select
        value={value || defaultModel || null}
        onValueChange={(next) => onChange(next ?? "")}
        placeholder={translation("model")}
      >
        {orderedModels.map((item) => (
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
