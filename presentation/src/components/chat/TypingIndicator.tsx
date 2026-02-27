import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { XBOAvatar } from "./XBOAvatar";

export const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dots = [0, 1, 2];
  const offsets = [0, 6, 12];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: 12,
        gap: 8,
      }}
    >
      <div style={{ alignSelf: "flex-end" }}>
        <XBOAvatar size={32} />
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderRadius: "18px 18px 18px 4px",
          background: "#ffffff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        {dots.map((dot) => {
          const loopFrame = (frame + offsets[dot]) % 36;
          const springValue = spring({
            frame: loopFrame,
            fps,
            config: {
              damping: 8,
              stiffness: 300,
              mass: 0.3,
            },
          });
          const translateY = interpolate(springValue, [0, 1], [0, -6]);

          return (
            <div
              key={dot}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#9ca3af",
                transform: `translateY(${translateY}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
