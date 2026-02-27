import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../backgrounds/GradientBackground";

const { fontFamily } = loadFont();

interface TitleCardProps {
  variant: "opening" | "closing";
}

export const TitleCard: React.FC<TitleCardProps> = ({ variant }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (variant === "opening") {
    return <OpeningCard frame={frame} fps={fps} />;
  }

  return <ClosingCard frame={frame} fps={fps} />;
};

/* ------------------------------------------------------------------ */
/*  Opening variant                                                    */
/* ------------------------------------------------------------------ */

const OpeningCard: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  // Logo spring scale: 0.5 -> 1.0
  const logoSpring = spring({ frame, fps, config: { damping: 200 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);

  // Logo opacity: 0 -> 1 over first 20 frames
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title spring (delay 60)
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 60,
  });
  const titleOpacity = titleSpring;
  const titleTranslateY = interpolate(titleSpring, [0, 1], [20, 0]);

  // Subtitle spring (delay 75)
  const subtitleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 75,
  });
  const subtitleOpacity = subtitleSpring;
  const subtitleTranslateY = interpolate(subtitleSpring, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground />
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo */}
          <Img
            src={staticFile("XBO.svg")}
            style={{
              width: 120,
              height: 120,
              transform: `scale(${logoScale})`,
              opacity: logoOpacity,
            }}
          />

          {/* Title */}
          <div
            style={{
              marginTop: 20,
              fontSize: 48,
              fontWeight: 700,
              color: "#1f2937",
              opacity: titleOpacity,
              transform: `translateY(${titleTranslateY}px)`,
            }}
          >
            XBO AI Assistant
          </div>

          {/* Subtitle */}
          <div
            style={{
              marginTop: 12,
              fontSize: 20,
              color: "#6b7280",
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleTranslateY}px)`,
            }}
          >
            Intelligent customer support powered by RAG
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Closing variant                                                    */
/* ------------------------------------------------------------------ */

const ClosingCard: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  // Logo spring scale: 0.5 -> 1.0
  const logoSpring = spring({ frame, fps, config: { damping: 200 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);

  // Title spring (delay 30)
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 30,
  });
  const titleOpacity = titleSpring;
  const titleTranslateY = interpolate(titleSpring, [0, 1], [20, 0]);

  // Subtitle spring (delay 45)
  const subtitleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    delay: 45,
  });
  const subtitleOpacity = subtitleSpring;
  const subtitleTranslateY = interpolate(subtitleSpring, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #4f2dd0, #3518a0)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile("XBO.svg")}
          style={{
            width: 120,
            height: 120,
            transform: `scale(${logoScale})`,
          }}
        />

        {/* Title */}
        <div
          style={{
            marginTop: 20,
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
          }}
        >
          XBO AI Assistant
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 12,
            fontSize: 20,
            color: "rgba(255,255,255,0.8)",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleTranslateY}px)`,
          }}
        >
          Smarter support. Instant answers. Happy customers.
        </div>
      </div>
    </AbsoluteFill>
  );
};
