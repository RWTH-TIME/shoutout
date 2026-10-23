export type LanguageOption = {
  value: string;
  name: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "", name: "Auto" },
  { value: "de", name: "Deutsch" },
  { value: "en", name: "English" },
];

export function languageLabel(code: string | null | undefined): string {
  const match = LANGUAGE_OPTIONS.find((item) => item.value === code);
  return match?.name ?? "Auto";
}
