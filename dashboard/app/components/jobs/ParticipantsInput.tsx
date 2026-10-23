"use client";

import { Input } from "@helpwave/hightide";
import useAppTranslation from "../../hooks/useAppTranslation";

type ParticipantsInputProps = {
  value: number;
  onChange: (value: number) => void;
  showLabel?: boolean;
};

export default function ParticipantsInput({
  value,
  onChange,
  showLabel = false,
}: ParticipantsInputProps) {
  const translation = useAppTranslation();

  return (
    <div className="flex flex-col gap-1">
      {showLabel ? (
        <div className="text-xs text-description">
          {translation("participants")}
        </div>
      ) : null}
      <Input
        type="number"
        min={0}
        value={value > 0 ? String(value) : ""}
        onValueChange={(next) => {
          if (next === "") {
            onChange(0);
            return;
          }
          onChange(Math.max(0, Number(next) || 0));
        }}
        placeholder={translation("participantsPlaceholder")}
      />
    </div>
  );
}
