import React from "react";
import { AbsoluteFill } from "remotion";

export const AppShell: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div
      style={{
        width: 1240,
        height: 900,
        borderRadius: 16,
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        background: "#ffffff",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);
