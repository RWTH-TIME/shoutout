"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  seekTo?: number | null;
  onTimeUpdate?: (seconds: number) => void;
};

export default function AudioPlayer({ src, seekTo, onTimeUpdate }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (seekTo == null || !ref.current) {
      return;
    }
    ref.current.currentTime = seekTo;
    void ref.current.play().catch(() => undefined);
  }, [seekTo]);

  return (
    <audio
      ref={ref}
      controls
      src={src}
      className="w-full"
      onTimeUpdate={(event) => {
        onTimeUpdate?.(event.currentTarget.currentTime);
      }}
    />
  );
}
