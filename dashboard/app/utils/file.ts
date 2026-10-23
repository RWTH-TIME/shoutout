export function fileBaseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "");
}

export function splitFileName(name: string): { stem: string; extension: string } {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) {
    return { stem: name, extension: "" };
  }
  return {
    stem: name.slice(0, lastDot),
    extension: name.slice(lastDot),
  };
}

export function uniqueOriginalNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const trimmed = name.trim() || "file";
    if (!used.has(trimmed)) {
      used.add(trimmed);
      return trimmed;
    }
    const { stem, extension } = splitFileName(trimmed);
    let suffix = 2;
    let candidate = `${stem}-${suffix}${extension}`;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${stem}-${suffix}${extension}`;
    }
    used.add(candidate);
    return candidate;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function putPresignedObject(
  url: string,
  file: Blob
): Promise<Response> {
  return fetch(url, {
    method: "PUT",
    body: await file.arrayBuffer(),
  });
}
