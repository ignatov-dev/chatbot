import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/backgrounds/GradientBackground";
import { AppShell } from "../components/backgrounds/AppShell";
import { Sidebar } from "../components/chat/Sidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ThemeTabs } from "../components/chat/ThemeTabs";
import { ChatInputBar } from "../components/chat/ChatInputBar";
import { SMOOTH_SPRING } from "../springs";
import { CONVERSATIONS, THEMES } from "../data/mockData";

const { fontFamily } = loadFont();

export const Scene10_Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Chat exit: frames 0-15
  const chatExitProgress = spring({
    frame,
    fps,
    config: SMOOTH_SPRING,
    durationInFrames: 15,
  });
  const chatOpacity = interpolate(chatExitProgress, [0, 1], [1, 0]);
  const chatTranslateY = interpolate(chatExitProgress, [0, 1], [0, 24]);
  const chatScale = interpolate(chatExitProgress, [0, 1], [1, 0.96]);

  // Closing card: appears at frame 15
  const closingProgress = spring({
    frame,
    fps,
    config: SMOOTH_SPRING,
    delay: 15,
  });

  // Logo
  const logoScale = interpolate(closingProgress, [0, 1], [0.5, 1]);
  const logoOpacity = closingProgress;

  // Title at frame 25
  const titleProgress = spring({ frame, fps, config: SMOOTH_SPRING, delay: 25 });
  const titleOpacity = titleProgress;
  const titleTranslateY = interpolate(titleProgress, [0, 1], [20, 0]);

  // Subtitle at frame 35
  const subtitleProgress = spring({ frame, fps, config: SMOOTH_SPRING, delay: 35 });
  const subtitleOpacity = subtitleProgress;
  const subtitleTranslateY = interpolate(subtitleProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Audio src={staticFile("scene-5.mp3")} />
      {/* Chat shell exiting */}
      {frame < 30 && (
        <>
          <GradientBackground />
          <AbsoluteFill
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: chatOpacity,
              transform: `translateY(${chatTranslateY}px) scale(${chatScale})`,
            }}
          >
            <AppShell>
              <Sidebar conversations={CONVERSATIONS} userEmail="demo@xbo.com" />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  background: "#ffffff",
                  overflow: "hidden",
                }}
              >
                <div style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
                  <ChatHeader themeLabel={THEMES[0]} />
                  <ThemeTabs activeIndex={0} themes={THEMES} />
                </div>
                <div style={{ flex: 1, background: "#f9fafb" }} />
                <ChatInputBar placeholder={THEMES[0]} />
              </div>
            </AppShell>
          </AbsoluteFill>
        </>
      )}

      {/* Closing title card — matches opening light gradient */}
      {frame >= 10 && (
        <AbsoluteFill
          style={{
            opacity: interpolate(frame, [10, 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <GradientBackground />
          <AbsoluteFill
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={staticFile("XBO.svg")}
              style={{
                width: 120,
                height: 120,
                opacity: logoOpacity,
                transform: `scale(${logoScale})`,
              }}
            />

            <div
              style={{
                marginTop: 24,
                fontSize: 48,
                fontWeight: 700,
                color: "#1f2937",
                opacity: titleOpacity,
                transform: `translateY(${titleTranslateY}px)`,
              }}
            >
              XBO AI Assistant
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 20,
                color: "#6b7280",
                opacity: subtitleOpacity,
                transform: `translateY(${subtitleTranslateY}px)`,
              }}
            >
              Smarter support. Instant answers. Happy customers.
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
