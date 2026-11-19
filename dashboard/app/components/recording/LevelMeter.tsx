"use client";

import { useEffect, useRef } from "react";

type LevelMeterProps = {
  analyser: AnalyserNode | null;
  label: string;
  className?: string;
};

export default function LevelMeter({
  analyser,
  label,
  className = "",
}: LevelMeterProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || !barRef.current) {
      if (barRef.current) {
        barRef.current.style.width = "0%";
      }
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let index = 0; index < data.length; index += 1) {
        sum += data[index] ?? 0;
      }
      const average = data.length > 0 ? sum / data.length / 255 : 0;
      if (barRef.current) {
        barRef.current.style.width = `${Math.min(100, Math.round(average * 140))}%`;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [analyser]);

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${className}`}>
      <div className="truncate text-[10px] uppercase tracking-wide text-description">
        {label}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-divider">
        <div
          ref={barRef}
          className="h-full rounded-full bg-primary transition-[width] duration-75"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}
