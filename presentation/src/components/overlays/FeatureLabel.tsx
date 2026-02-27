import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

interface FeatureLabelProps {
  text: string;
  x: number;
  y: number;
  delay?: number;
}

export const FeatureLabel: React.FC<FeatureLabelProps> = ({
  text,
  x,
  y,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const anim = spring({
    frame,
    fps,
    config: { damping: 30, stiffness: 120 },
    delay,
  });

  const opacity = anim;
  const translateY = interpolate(anim, [0, 1], [15, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: "rgba(79, 45, 208, 0.9)",
        borderRadius: 8,
        padding: "8px 16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        opacity,
        transform: `translateY(${translateY}px)`,
        fontFamily,
        fontSize: 14,
        fontWeight: 600,
        color: "white",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};
