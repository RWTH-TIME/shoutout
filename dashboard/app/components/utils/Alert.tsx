"use client";

import { Chip } from "@helpwave/hightide";
import useAlert from "../../hooks/useAlert";

export default function AlertPopup() {
  const { text, type } = useAlert();

  if (!text) {
    return null;
  }

  const color =
    type === "error"
      ? "negative"
      : type === "success"
        ? "positive"
        : "primary";

  return (
    <div className="fixed right-4 top-4 z-50">
      <Chip color={color} coloringStyle="solid" size="md">
        {text}
      </Chip>
    </div>
  );
}
