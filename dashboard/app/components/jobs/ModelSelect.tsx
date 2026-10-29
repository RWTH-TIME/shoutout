"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, IconButton, Select } from "@helpwave/hightide";
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!value && defaultModel) {
      onChange(defaultModel);
    }
  }, [defaultModel, onChange, value]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        {showLabel ? (
          <div className="text-xs text-description">{translation("model")}</div>
        ) : null}
        <IconButton
          type="button"
          size="xs"
          color="neutral"
          coloringStyle="text"
          tooltip={translation("modelInfoLabel")}
          aria-label={translation("modelInfoLabel")}
          onClick={() => setDetailsOpen(true)}
        >
          <Info size={14} />
        </IconButton>
      </div>
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

      <Dialog
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        titleElement={translation("modelInfoDialogTitle")}
        description={translation("modelInfoDialogDescription")}
        isModal
        position="center"
        className="w-full max-w-xl"
      >
        <div className="flex flex-col gap-2">
          <div className="max-h-[50vh] overflow-auto rounded-xl border border-divider">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-divider text-left text-description">
                  <th className="px-3 py-2 font-medium">
                    {translation("model")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {translation("modelInfoTableDetails")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {translation("modelInfoTableWorkers")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderedModels.map((item) => (
                  <tr
                    key={item.model}
                    className="border-b border-divider last:border-b-0"
                  >
                    <td className="px-3 py-2 align-top font-medium">
                      {item.model}
                      {isEnglishOnlyModel(item.model) ? (
                        <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                          {translation("modelEnglishOnlyShort")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top text-description">
                      {translation(modelInfoKey(item.model))}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums">
                      {item.workerCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-description">
            {translation("modelInfoWorkersHint")}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
