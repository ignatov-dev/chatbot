import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/backgrounds/GradientBackground";
import { AuthCard } from "../components/auth/AuthCard";
import { SMOOTH_SPRING } from "../springs";
import { useTypewriter } from "../hooks/useTypewriter";
import { MOCK_EMAIL, MOCK_PASSWORD_DOTS } from "../data/mockData";

const { fontFamily } = loadFont();

// Timeline:
//   0-25:    Card springs up (scale 1.5)
//   28-40:   Zoom into email+password area (1→1.8)
//   44-70:   Email typewriter (slow, 0.5 chars/frame)
//   75-89:   Password dots (0.6 chars/frame)
//   94-110:  Zoom out (1.8→1)
//   116-122: Button press
//   Total: 130 frames ≈ 4.3s

export const Scene02_AuthFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card entrance: springs up from below (frame 0-25)
  const cardProgress = spring({ frame, fps, config: SMOOTH_SPRING });
  const cardTranslateY = interpolate(cardProgress, [0, 1], [40, 0]);
  const cardOpacity = cardProgress;

  // ---- ZOOM CAMERA ----
  // Card centered at (960,540) with 1.5x scale.
  // Zoom into the form fields area (midpoint between email and password).
  // Email canvas Y ≈ 447, Password canvas Y ≈ 551, midpoint ≈ 499.
  // For zoom 1.8 to center midpoint at screen 540:
  //   540 = oy + (499 - oy) * 1.8 → oy ≈ 448
  const zoomScale = 1.8;
  const originX = 960;
  const fieldsOriginY = 448;

  const zoomInStart = 28;
  const zoomInEnd = 40;
  const zoomOutStart = 94;
  const zoomOutEnd = 110;

  const zoomFactor = (() => {
    if (frame < zoomInStart) return 1;
    if (frame < zoomInEnd) {
      return interpolate(frame, [zoomInStart, zoomInEnd], [1, zoomScale], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    if (frame < zoomOutStart) return zoomScale;
    if (frame < zoomOutEnd) {
      return interpolate(frame, [zoomOutStart, zoomOutEnd], [zoomScale, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      });
    }
    return 1;
  })();

  const currentOrigin = (() => {
    if (frame < zoomInStart) return "center center";
    if (frame < zoomOutEnd) return `${originX}px ${fieldsOriginY}px`;
    return "center center";
  })();

  // Email typewriter: starts at frame 44, slow (0.5 chars/frame = 2 frames per char)
  const emailText = useTypewriter(MOCK_EMAIL, 44, 0.5);
  // "demo@xbo.com" = 13 chars / 0.5 = 26 frames → done ~70

  // Password dots: starts at frame 75
  const passwordText = useTypewriter(MOCK_PASSWORD_DOTS, 75, 0.6);
  // "••••••••" = 8 chars / 0.6 ≈ 14 frames → done ~89

  // Button "click" at frame 116 (after zoom out completes)
  const isButtonPressed = frame >= 116 && frame <= 122;

  // Show cursor while typing email
  const showCursor = frame >= 42 && frame < 72;

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Sequence from={15} layout="none">
        <Audio src={staticFile("scene-3.mp3")} />
      </Sequence>
      <GradientBackground />

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${zoomFactor})`,
          transformOrigin: currentOrigin,
        }}
      >
        <div
          style={{
            opacity: cardOpacity,
            transform: `translateY(${cardTranslateY}px) scale(1.5)`,
          }}
        >
          <AuthCard
            email={emailText}
            password={passwordText}
            showCursor={showCursor}
            buttonText="Sign In"
            buttonActive={isButtonPressed}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
