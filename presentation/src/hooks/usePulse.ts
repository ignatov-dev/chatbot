import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export function usePulse() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cycle = (frame % (fps * 2)) / (fps * 2);
  return interpolate(cycle, [0, 0.5, 1], [1, 0.4, 1]);
}
