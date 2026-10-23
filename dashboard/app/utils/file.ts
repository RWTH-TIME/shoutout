export function fileBaseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "");
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
