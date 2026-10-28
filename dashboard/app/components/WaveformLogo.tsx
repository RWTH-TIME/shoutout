import { AudioLines } from "lucide-react";

type WaveformLogoProps = {
  className?: string;
};

export default function WaveformLogo({ className }: WaveformLogoProps) {
  return (
    <AudioLines
      className={["waveform-logo shrink-0 text-primary", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    />
  );
}
