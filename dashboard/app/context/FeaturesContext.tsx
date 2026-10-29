"use client";

import { createContext, useContext } from "react";

type Features = {
  mailEnabled: boolean;
};

const FeaturesContext = createContext<Features>({ mailEnabled: false });

export function FeaturesProvider({
  mailEnabled,
  children,
}: Features & { children: React.ReactNode }) {
  return (
    <FeaturesContext.Provider value={{ mailEnabled }}>
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
