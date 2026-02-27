import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/backgrounds/GradientBackground";
import { AuthCard } from "../components/auth/AuthCard";
import { AppShell } from "../components/backgrounds/AppShell";
import { Sidebar } from "../components/chat/Sidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ThemeTabs } from "../components/chat/ThemeTabs";
import { MessageArea } from "../components/chat/MessageArea";
import { ChatInputBar } from "../components/chat/ChatInputBar";
import { SMOOTH_SPRING } from "../springs";
import { MOCK_EMAIL, MOCK_PASSWORD_DOTS, CONVERSATIONS, THEMES } from "../data/mockData";

const { fontFamily } = loadFont();

export const Scene03_LoginTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Auth exit: frames 0-12 (400ms)
  const authExitProgress = spring({
    frame,
    fps,
    config: SMOOTH_SPRING,
    durationInFrames: 12,
  });
  const authScale = interpolate(authExitProgress, [0, 1], [1, 0.92]);
  const authOpacity = interpolate(authExitProgress, [0, 1], [1, 0]);

  // Chat enter: starts at frame 15
  const chatEnterProgress = spring({
    frame,
    fps,
    config: SMOOTH_SPRING,
    delay: 15,
  });
  const chatTranslateY = interpolate(chatEnterProgress, [0, 1], [24, 0]);
  const chatScale = interpolate(chatEnterProgress, [0, 1], [0.96, 1]);
  const chatOpacity = chatEnterProgress;

  // Sidebar items stagger: start at frame 40
  const sidebarItemsVisible = Math.max(
    0,
    Math.min(CONVERSATIONS.length, Math.floor((frame - 40) / 4)),
  );

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground />

      {/* Auth card exiting */}
      {frame < 20 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: authOpacity,
            transform: `scale(${authScale})`,
          }}
        >
          <AuthCard
            email={MOCK_EMAIL}
            password={MOCK_PASSWORD_DOTS}
            buttonText="Sign In"
          />
        </AbsoluteFill>
      )}

      {/* Chat shell entering */}
      {frame >= 12 && (
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
            <Sidebar
              conversations={CONVERSATIONS.slice(0, sidebarItemsVisible)}
              userEmail={MOCK_EMAIL}
            />
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
              <MessageArea showEmpty themeLabel={THEMES[0]}>
                {null}
              </MessageArea>
              <ChatInputBar placeholder={THEMES[0]} />
            </div>
          </AppShell>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
