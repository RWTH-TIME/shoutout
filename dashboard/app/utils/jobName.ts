export type JobNameConflict = "taken" | null;

export function jobNameConflict(
  name: string,
  existingNames: ReadonlySet<string>
): JobNameConflict {
  if (!name.trim()) {
    return null;
  }
  if (existingNames.has(name)) {
    return "taken";
  }
  return null;
}

export function nextUniqueJobName(
  preferred: string,
  taken: ReadonlySet<string>
): string {
  const base = preferred.trim() || "job";
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
