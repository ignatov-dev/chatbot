import React from "react";
import { AbsoluteFill } from "remotion";

export const GradientBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(circle at center, #f0e2f2, #a0c8fa)",
    }}
  />
);
