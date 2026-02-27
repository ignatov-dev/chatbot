import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  Sequence,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/backgrounds/GradientBackground";
import { AuthCard } from "../components/auth/AuthCard";
import { AppShell } from "../components/backgrounds/AppShell";
import { Sidebar } from "../components/chat/Sidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { ThemeTabs } from "../components/chat/ThemeTabs";
import { ChatInputBar } from "../components/chat/ChatInputBar";
import { UserBubble } from "../components/chat/UserBubble";
import { AssistantBubble } from "../components/chat/AssistantBubble";
import { TypingIndicator } from "../components/chat/TypingIndicator";
import {
  CONVERSATIONS,
  THEMES,
  MOCK_EMAIL,
  MOCK_PASSWORD_DOTS,
  CHAT_FLOW_BASIC,
  CHAT_FLOW_MARKDOWN,
  CHAT_FLOW_VIDEO,
} from "../data/mockData";
import { useTypewriter } from "../hooks/useTypewriter";

const { fontFamily } = loadFont();

// Combined scene: auth→chat transition + full chat demo.
// Timeline:
//   0-12:    Auth card exits
//   12-26:   Chat shell enters
//   28-46:   Zoom in to sidebar (2.2x)
//   48-72:   Hold on sidebar — items stagger in
//   72-96:   Pan from sidebar → input bar (scale 2.2→1.8)
//   96-~180: Hold on input bar — user types first message
//   ~175-192: Zoom out (1.8→1)
//   ~190-280: Receive first response
//   340-470:  Send second message + markdown response
//   550-700:  Send third message + video response
// Total: ~900 frames = 30 seconds

export const ContinuousChatDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---- AUTH EXIT (frames 0-12, 0.4s ease-in — matches real app) ----
  const authExitDuration = 12;
  const authScale = interpolate(frame, [0, authExitDuration], [1, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.ease),
  });
  const authOpacity = interpolate(frame, [0, authExitDuration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.ease),
  });

  // ---- CHAT ENTER (frames 12-26, 0.45s cubic-bezier(0.16,1,0.3,1) — matches real app) ----
  const chatEnterStart = 12;
  const chatEnterDuration = 14;
  const chatEnterEasing = Easing.bezier(0.16, 1, 0.3, 1);
  const chatTranslateY = interpolate(frame, [chatEnterStart, chatEnterStart + chatEnterDuration], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: chatEnterEasing,
  });
  const chatScale = interpolate(frame, [chatEnterStart, chatEnterStart + chatEnterDuration], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: chatEnterEasing,
  });
  const chatOpacity = interpolate(frame, [chatEnterStart, chatEnterStart + chatEnterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: chatEnterEasing,
  });

  // ---- CONTINUOUS ZOOM: sidebar → pan → input bar → zoom out ----
  // One smooth camera move: zoom into sidebar, pan down to input, zoom out after send
  const typingStart01 = 100;
  const sendFrame01 = typingStart01 + Math.ceil(CHAT_FLOW_BASIC.userMessage.length / 0.5) + 10;

  const zoomInStart = 28;
  const zoomInEnd = 46;        // zoom in complete
  const sidebarHoldEnd = 72;   // hold on sidebar while items stagger
  const panEnd = 96;           // pan from sidebar to input bar
  const inputHoldEnd = sendFrame01 - 5;  // hold on input while typing
  const zoomOutEnd = sendFrame01 + 12;   // zoom out after send

  // Scale: sidebar=2.2, input=1.8, smoothly interpolated during pan
  const sidebarScale = 2.2;
  const inputScale = 1.8;

  // Origin points — sidebar positioned in top-left corner with 50px padding from viewport edges.
  // CSS transform formula: screenPos = origin + (canvasPos - origin) * scale
  // AppShell 1240x900 centered → top-left at (340,90).
  // For AppShell top-left (340,90) to appear at screen (50,50) with scale 2.2:
  //   50 = originX + (340 - originX) * 2.2  →  originX = (748 - 50) / 1.2 ≈ 582
  //   50 = originY + (90 - originY) * 2.2   →  originY = (198 - 50) / 1.2 = 123
  const sidebarOriginX = 582;
  const sidebarOriginY = 123;
  const inputOriginX = 1090;    // chat area center (340+260+490)
  const inputOriginY = 940;     // bottom of AppShell (input bar)

  const zoomFactor = (() => {
    if (frame < zoomInStart) return 1;
    // Zoom in
    if (frame < zoomInEnd) {
      return interpolate(frame, [zoomInStart, zoomInEnd], [1, sidebarScale], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
    }
    // Hold on sidebar
    if (frame < sidebarHoldEnd) return sidebarScale;
    // Pan: interpolate scale from sidebar to input
    if (frame < panEnd) {
      return interpolate(frame, [sidebarHoldEnd, panEnd], [sidebarScale, inputScale], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      });
    }
    // Hold on input bar
    if (frame < inputHoldEnd) return inputScale;
    // Zoom out
    if (frame < zoomOutEnd) {
      return interpolate(frame, [inputHoldEnd, zoomOutEnd], [inputScale, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      });
    }
    return 1;
  })();

  // Smoothly pan transform-origin from sidebar to input bar during the pan phase
  const currentTransformOrigin = (() => {
    if (frame < zoomInStart) return "center center";
    if (frame < sidebarHoldEnd) return `${sidebarOriginX}px ${sidebarOriginY}px`;
    if (frame < panEnd) {
      const x = interpolate(frame, [sidebarHoldEnd, panEnd], [sidebarOriginX, inputOriginX], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      });
      const y = interpolate(frame, [sidebarHoldEnd, panEnd], [sidebarOriginY, inputOriginY], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      });
      return `${x}px ${y}px`;
    }
    if (frame < zoomOutEnd) return `${inputOriginX}px ${inputOriginY}px`;
    return "center center";
  })();

  // Sidebar items stagger in at frame 48 (during zoom hold) — handled by Sidebar component

  // ---- MESSAGE 1: Basic response ----
  const inputText01 = useTypewriter(CHAT_FLOW_BASIC.userMessage, typingStart01, 0.5);

  // Message entrance animation helper — matches framer-motion: opacity 0→1, y 12→0, scale 0.96→1
  const msgSpringConfig = { damping: 20, stiffness: 200 };
  const msgEntrance = (delayFrame: number) => {
    const p = spring({ frame, fps, config: msgSpringConfig, delay: delayFrame });
    return {
      opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px) scale(${interpolate(p, [0, 1], [0.96, 1])})`,
    };
  };

  const showUserBubble01 = frame >= sendFrame01;
  const userBubble01Style = msgEntrance(sendFrame01);

  const typingStart01Indicator = sendFrame01 + 5;
  const typingEnd01 = typingStart01Indicator + 70;
  const showTyping01 = frame >= typingStart01Indicator && frame < typingEnd01;

  const showAssistant01 = frame >= typingEnd01;
  const assistant01Style = msgEntrance(typingEnd01);

  // ---- MESSAGE 2: Markdown response ----
  const typingStart02 = typingEnd01 + 40;
  const inputText02 = useTypewriter(CHAT_FLOW_MARKDOWN.userMessage, typingStart02, 0.8);
  const sendFrame02 = typingStart02 + Math.ceil(CHAT_FLOW_MARKDOWN.userMessage.length / 0.8) + 8;

  const showUserBubble02 = frame >= sendFrame02;
  const userBubble02Style = msgEntrance(sendFrame02);
  const typingStart02Indicator = sendFrame02 + 5;
  const typingEnd02 = typingStart02Indicator + 50;
  const showTyping02 = frame >= typingStart02Indicator && frame < typingEnd02;
  const showAssistant02 = frame >= typingEnd02;
  const assistant02Style = msgEntrance(typingEnd02);

  // ---- MESSAGE 3: Video response ----
  const typingStart03 = typingEnd02 + 40;
  const inputText03 = useTypewriter(CHAT_FLOW_VIDEO.userMessage, typingStart03, 0.8);
  const sendFrame03 = typingStart03 + Math.ceil(CHAT_FLOW_VIDEO.userMessage.length / 0.8) + 8;

  const showUserBubble03 = frame >= sendFrame03;
  const userBubble03Style = msgEntrance(sendFrame03);
  const typingStart03Indicator = sendFrame03 + 5;
  const typingEnd03 = typingStart03Indicator + 50;
  const showTyping03 = frame >= typingStart03Indicator && frame < typingEnd03;
  const showAssistant03 = frame >= typingEnd03;
  const assistant03Style = msgEntrance(typingEnd03);

  // Input bar value
  let currentInputValue = "";
  if (frame >= typingStart01 && frame < sendFrame01) {
    currentInputValue = inputText01;
  } else if (frame >= typingStart02 && frame < sendFrame02) {
    currentInputValue = inputText02;
  } else if (frame >= typingStart03 && frame < sendFrame03) {
    currentInputValue = inputText03;
  }

  // Scroll offset — scrolls on new user messages and bot responses
  // Uses ease-out curve over 20 frames for each step
  const scrollDuration = 20;
  const easeOutScroll = (trigger: number, from: number, to: number) =>
    interpolate(frame, [trigger, trigger + scrollDuration], [from, to], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const scrollOffset = (() => {
    if (frame < typingEnd01) return 0;
    if (frame < sendFrame02) return easeOutScroll(typingEnd01, 0, 120);
    if (frame < typingEnd02) return easeOutScroll(sendFrame02, 120, 280);
    if (frame < sendFrame03) return easeOutScroll(typingEnd02, 280, 420);
    if (frame < typingEnd03) return easeOutScroll(sendFrame03, 420, 560);
    return easeOutScroll(typingEnd03, 560, 900);
  })();

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Audio src={staticFile("scene-4.mp3")} />
      <GradientBackground />

      {/* Auth card exiting */}
      {frame < 20 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: authOpacity,
            transform: `scale(${authScale * 1.5})`,
          }}
        >
          <AuthCard
            email={MOCK_EMAIL}
            password={MOCK_PASSWORD_DOTS}
            buttonText="Sign In"
          />
        </AbsoluteFill>
      )}

      {/* Chat shell entering + full chat demo */}
      {frame >= 12 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: chatOpacity,
            transform: `translateY(${chatTranslateY}px) scale(${chatScale * zoomFactor})`,
            transformOrigin: currentTransformOrigin,
          }}
        >
          <AppShell>
            <Sidebar
              conversations={CONVERSATIONS}
              activeId={frame >= sendFrame01 ? CONVERSATIONS[0]?.id : undefined}
              userEmail="demo@xbo.com"
              staggerFrom={48}
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
              {/* Header + Tabs */}
              <div style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
                <ChatHeader
                  themeLabel={THEMES[0]}
                  showNewChatButton={frame >= sendFrame01}
                />
                <ThemeTabs activeIndex={0} themes={THEMES} />
              </div>

              {/* Message area */}
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  background: "#f9fafb",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    padding: "20px 16px",
                    display: "flex",
                    flexDirection: "column",
                    transform: `translateY(-${scrollOffset}px)`,
                  }}
                >
                  {/* Empty state before first message */}
                  {!showUserBubble01 && (
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#9ca3af",
                        fontSize: 14,
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 40 }}>💬</div>
                      <div>Ask me anything about {THEMES[0]}</div>
                    </div>
                  )}

                  {/* Message 1 */}
                  {showUserBubble01 && (
                    <div style={userBubble01Style}>
                      <UserBubble content={CHAT_FLOW_BASIC.userMessage} />
                    </div>
                  )}
                  {showTyping01 && (
                    <Sequence from={0} layout="none">
                      <TypingIndicator />
                    </Sequence>
                  )}
                  {showAssistant01 && (
                    <div style={assistant01Style}>
                      <AssistantBubble content={CHAT_FLOW_BASIC.assistantMessage} />
                    </div>
                  )}

                  {/* Message 2 */}
                  {showUserBubble02 && (
                    <div style={userBubble02Style}>
                      <UserBubble content={CHAT_FLOW_MARKDOWN.userMessage} />
                    </div>
                  )}
                  {showTyping02 && (
                    <Sequence from={0} layout="none">
                      <TypingIndicator />
                    </Sequence>
                  )}
                  {showAssistant02 && (
                    <div style={assistant02Style}>
                      <AssistantBubble content={CHAT_FLOW_MARKDOWN.assistantMessage} />
                    </div>
                  )}

                  {/* Message 3 — video response */}
                  {showUserBubble03 && (
                    <div style={userBubble03Style}>
                      <UserBubble content={CHAT_FLOW_VIDEO.userMessage} />
                    </div>
                  )}
                  {showTyping03 && (
                    <Sequence from={0} layout="none">
                      <TypingIndicator />
                    </Sequence>
                  )}
                  {showAssistant03 && (
                    <div style={assistant03Style}>
                      <AssistantBubble content={CHAT_FLOW_VIDEO.assistantMessage} />
                    </div>
                  )}
                </div>
              </div>

              {/* Input bar */}
              <ChatInputBar
                value={currentInputValue}
                placeholder={THEMES[0]}
              />
            </div>
          </AppShell>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
