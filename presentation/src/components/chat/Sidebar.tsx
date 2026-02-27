import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SidebarItem } from "./SidebarItem";

interface Conversation {
  id: string;
  title: string;
  time: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  userEmail?: string;
  /** Frame at which items start staggering in (5 frames apart). Omit to skip animation. */
  staggerFrom?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  userEmail,
  staggerFrom,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: 260,
        borderRight: "1px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Top area — conversation list */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: 8,
        }}
      >
        {conversations.map((conv, i) => {
          // Per-item entrance animation matching framer-motion: opacity 0→1, y -8→0
          let itemOpacity = 1;
          let itemTranslateY = 0;
          if (staggerFrom !== undefined) {
            const itemDelay = staggerFrom + i * 5;
            const progress = spring({
              frame,
              fps,
              config: { damping: 20, stiffness: 200 },
              delay: itemDelay,
            });
            itemOpacity = progress;
            itemTranslateY = interpolate(progress, [0, 1], [-8, 0]);
          }

          return (
            <div
              key={conv.id}
              style={{
                opacity: itemOpacity,
                transform: `translateY(${itemTranslateY}px)`,
              }}
            >
              <SidebarItem
                title={conv.title}
                time={conv.time}
                active={conv.id === activeId}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom area — user info */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #e5e7eb",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 70,
        }}
      >
        {userEmail && (
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {userEmail}
          </div>
        )}
        <button
          style={{
            background: "none",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            color: "#6b7280",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            flexShrink: 0,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};
