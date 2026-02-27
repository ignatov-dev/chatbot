import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/backgrounds/GradientBackground";
import { GENTLE_SPRING } from "../springs";

const { fontFamily } = loadFont();

// Floating document snippets — represent messy knowledge base docs
// Laid out on 1920x1080 canvas with ~100px vertical / horizontal clearance
const DOCUMENTS = [
  { text: "API Documentation v2.3", x: 200, y: 70, rotate: -8, delay: 0 },
  { text: "Deposit & Withdrawal Guide", x: 780, y: 60, rotate: 5, delay: 3 },
  { text: "Payout Integration Docs", x: 1340, y: 80, rotate: 3, delay: 5 },
  { text: "Payment Intent Reference", x: 300, y: 350, rotate: 7, delay: 4 },
  { text: "Crypto Refund Procedures", x: 1050, y: 330, rotate: -4, delay: 7 },
  { text: "KYC Verification Policy", x: 200, y: 620, rotate: 12, delay: 6 },
  { text: "Loyalty Program Terms", x: 780, y: 640, rotate: -6, delay: 2 },
  { text: "Sandbox Testing Manual", x: 1320, y: 610, rotate: -10, delay: 8 },
];

// Questions that pop up in different spots — customer confusion
// Spaced across 1920x1080 canvas, no overlaps at 26px/30px padding size
const QUESTIONS = [
  { text: "How do I deposit USDT?", x: 250, y: 160, rotate: 5, delay: 30 },
  { text: "What are the withdrawal fees?", x: 850, y: 170, rotate: -7, delay: 38 },
  { text: "Can I cancel a deposit?", x: 1400, y: 190, rotate: -6, delay: 88 },
  { text: "Where is my payment?", x: 180, y: 450, rotate: 10, delay: 45 },
  { text: "How do I get my loyalty tier?", x: 750, y: 430, rotate: 7, delay: 82 },
  { text: "How to create a payment intent?", x: 1250, y: 440, rotate: -9, delay: 64 },
  { text: "How long does verification take?", x: 200, y: 730, rotate: -4, delay: 52 },
  { text: "What statuses can a payout have?", x: 780, y: 750, rotate: 6, delay: 58 },
  { text: "Is there a testnet?", x: 1350, y: 720, rotate: 8, delay: 70 },
  { text: "What's the API rate limit?", x: 700, y: 900, rotate: -5, delay: 76 },
];

// Each document disappears when a question appears (1:1 mapping for first 8)
// Documents exit frames — tied to question delays
const DOC_EXIT_FRAMES = QUESTIONS.slice(0, DOCUMENTS.length).map((q) => q.delay);

// Scene duration: 8 seconds (240 frames at 30fps)
// Timeline:
//   0-30:    Documents float in
//   30-88:   Questions pop up, documents fade out one by one
//   88-240:  Only questions remain, then scene fades to next

export const Scene00_ProblemStatement: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global fade-out at the end of the scene
  const fadeOut = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.ease),
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Audio src={staticFile("scene-1.mp3")} />
      <GradientBackground />

      <AbsoluteFill style={{ opacity: fadeOut }}>
        {/* Floating document cards — each fades out when a question appears */}
        {DOCUMENTS.map((doc, i) => {
          const progress = spring({
            frame,
            fps,
            config: GENTLE_SPRING,
            delay: doc.delay,
          });
          const enterOpacity = interpolate(progress, [0, 1], [0, 0.7]);
          // Fade out over 12 frames when corresponding question appears
          const exitStart = DOC_EXIT_FRAMES[i];
          const exitOpacity = interpolate(frame, [exitStart, exitStart + 12], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.ease),
          });
          const opacity = enterOpacity * exitOpacity;
          const translateY = interpolate(progress, [0, 1], [30, 0]);
          // Subtle floating drift
          const drift = Math.sin((frame + i * 40) * 0.03) * 4;
          // Slide down slightly on exit
          const exitDrift = interpolate(frame, [exitStart, exitStart + 12], [0, 15], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.ease),
          });

          if (opacity <= 0) return null;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: doc.x,
                top: doc.y,
                opacity,
                transform: `translateY(${translateY + drift + exitDrift}px) rotate(${doc.rotate}deg)`,
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: "20px 30px",
                  fontSize: 26,
                  color: "#6b7280",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 30 }}>📄</span>
                {doc.text}
              </div>
            </div>
          );
        })}

        {/* Questions popping up */}
        {QUESTIONS.map((q, i) => {
          const progress = spring({
            frame,
            fps,
            config: { damping: 14, stiffness: 200, mass: 0.6 },
            delay: q.delay,
          });
          const opacity = progress;
          const scale = interpolate(progress, [0, 1], [0.6, 1]);
          // Subtle pulse
          const pulse =
            frame > q.delay + 15
              ? 1 + Math.sin((frame - q.delay) * 0.08) * 0.02
              : 1;
          // Subtle floating drift
          const drift = Math.sin((frame + i * 50) * 0.03) * 4;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: q.x,
                top: q.y,
                opacity,
                transform: `translateY(${drift}px) scale(${scale * pulse}) rotate(${q.rotate}deg)`,
              }}
            >
              <div
                style={{
                  background: "#1f2937",
                  color: "#ffffff",
                  borderRadius: 14,
                  padding: "20px 30px",
                  fontSize: 26,
                  fontWeight: 500,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 30 }}>❓</span>
                {q.text}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
