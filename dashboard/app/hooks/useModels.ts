"use client";

import useSWR from "swr";
import { AvailableModel } from "../types/types";

async function fetcher(url: string): Promise<AvailableModel[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load models");
  }
  const data = await response.json();
  return data.models as AvailableModel[];
}

export default function useModels() {
  const { data, error, isLoading } = useSWR<AvailableModel[]>(
    "/api/models",
    fetcher,
    { refreshInterval: 10_000 }
  );

  return {
    models: data ?? [],
    error,
    isLoading,
  };
}
