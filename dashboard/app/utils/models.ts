import type { AppTranslationEntries } from "../i18n/translations";

const MODEL_FAMILIES = [
  "turbo",
  "large",
  "medium",
  "small",
  "base",
  "tiny",
] as const;

type ModelFamily = (typeof MODEL_FAMILIES)[number] | "other";

type ModelInfoKey = Extract<
  keyof AppTranslationEntries,
  | "modelInfoTurbo"
  | "modelInfoLarge"
  | "modelInfoMedium"
  | "modelInfoSmall"
  | "modelInfoBase"
  | "modelInfoTiny"
  | "modelInfoOther"
>;

const MODEL_INFO_KEYS: Record<ModelFamily, ModelInfoKey> = {
  turbo: "modelInfoTurbo",
  large: "modelInfoLarge",
  medium: "modelInfoMedium",
  small: "modelInfoSmall",
  base: "modelInfoBase",
  tiny: "modelInfoTiny",
  other: "modelInfoOther",
};

function modelFamily(model: string): ModelFamily {
  const name = model.toLowerCase();
  for (const family of MODEL_FAMILIES) {
    if (name.includes(family)) {
      return family;
    }
  }
  return "other";
}

function familyIndex(model: string): number {
  const family = modelFamily(model);
  if (family === "other") {
    return MODEL_FAMILIES.length;
  }
  return MODEL_FAMILIES.indexOf(family);
}

function versionRank(model: string): number {
  const match = model.toLowerCase().match(/-v(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function isEnglishOnlyModel(model: string): boolean {
  return model.toLowerCase().endsWith(".en");
}

export function modelInfoKey(model: string): ModelInfoKey {
  return MODEL_INFO_KEYS[modelFamily(model)];
}

export function compareModelNames(left: string, right: string): number {
  const familyDelta = familyIndex(left) - familyIndex(right);
  if (familyDelta !== 0) {
    return familyDelta;
  }
  const versionDelta = versionRank(right) - versionRank(left);
  if (versionDelta !== 0) {
    return versionDelta;
  }
  const englishDelta =
    Number(isEnglishOnlyModel(left)) - Number(isEnglishOnlyModel(right));
  if (englishDelta !== 0) {
    return englishDelta;
  }
  return left.localeCompare(right);
}

export function sortModels<T extends { model: string }>(models: T[]): T[] {
  return [...models].sort((left, right) =>
    compareModelNames(left.model, right.model)
  );
}
