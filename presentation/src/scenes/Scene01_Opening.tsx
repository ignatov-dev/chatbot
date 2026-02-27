import React from "react";
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/backgrounds/GradientBackground";
import { SMOOTH_SPRING } from "../springs";

const { fontFamily } = loadFont();

export const Scene01_Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation: scale 0.5→1, opacity 0→1
  const logoProgress = spring({ frame, fps, config: SMOOTH_SPRING });
  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Title: "XBO AI Assistant" — appears at frame 25
  const titleProgress = spring({ frame, fps, config: SMOOTH_SPRING, delay: 25 });
  const titleOpacity = titleProgress;
  const titleTranslateY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Subtitle — appears at frame 40
  const subtitleProgress = spring({ frame, fps, config: SMOOTH_SPRING, delay: 40 });
  const subtitleOpacity = subtitleProgress;
  const subtitleTranslateY = interpolate(subtitleProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Audio src={staticFile("scene-2.mp3")} />
      <GradientBackground />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo */}
        <Img
          src={staticFile("XBO.svg")}
          style={{
            width: 160,
            height: 160,
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        />

        {/* Title */}
        <div
          style={{
            marginTop: 28,
            fontSize: 64,
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
            marginTop: 16,
            fontSize: 28,
            color: "#6b7280",
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleTranslateY}px)`,
          }}
        >
          Intelligent customer support powered by RAG
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
