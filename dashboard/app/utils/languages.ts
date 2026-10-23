export type LanguageOption = {
  value: string;
  nameKey: "languageAuto" | "languageDe" | "languageEn";
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "", nameKey: "languageAuto" },
  { value: "de", nameKey: "languageDe" },
  { value: "en", nameKey: "languageEn" },
];

export function languageLabel(
  code: string | null | undefined,
  translate: (key: LanguageOption["nameKey"]) => string
): string {
  const match = LANGUAGE_OPTIONS.find((item) => item.value === code);
  return translate(match?.nameKey ?? "languageAuto");
}
