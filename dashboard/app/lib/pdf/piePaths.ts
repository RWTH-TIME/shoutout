export type PieSlice = {
  color: string;
  d: string;
};

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function buildPieSlices(
  percentages: number[],
  colors: string[],
  center = 50,
  radius = 45
): PieSlice[] {
  const total = percentages.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return [];
  }

  if (percentages.length === 1) {
    return [
      {
        color: colors[0] ?? "#3b82f6",
        d: describeArc(center, center, radius, 0, 359.999),
      },
    ];
  }

  const slices: PieSlice[] = [];
  let cursor = 0;
  percentages.forEach((percentage, index) => {
    if (percentage <= 0) {
      return;
    }
    const sweep = (percentage / total) * 360;
    const next = cursor + sweep;
    slices.push({
      color: colors[index % colors.length] ?? colors[0],
      d: describeArc(center, center, radius, cursor, Math.min(next, 359.999)),
    });
    cursor = next;
  });
  return slices;
}
