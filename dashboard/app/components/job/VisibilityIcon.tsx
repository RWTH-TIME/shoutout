"use client";

import { Globe, Lock, Users } from "lucide-react";
import { Visibility } from "../../types/types";
import useAppTranslation from "../../hooks/useAppTranslation";

type Props = {
  visibility?: Visibility;
  size?: number;
  className?: string;
};

export default function VisibilityIcon({
  visibility = "PRIVATE",
  size = 14,
  className = "text-description",
}: Props) {
  const translation = useAppTranslation();
  if (visibility === "PUBLIC") {
    return (
      <Globe
        size={size}
        className={className}
        aria-label={translation("visibilityPublic")}
      />
    );
  }
  if (visibility === "AUTHENTICATED") {
    return (
      <Users
        size={size}
        className={className}
        aria-label={translation("visibilityAuthenticated")}
      />
    );
  }
  return (
    <Lock
      size={size}
      className={className}
      aria-label={translation("visibilityPrivate")}
    />
  );
}
