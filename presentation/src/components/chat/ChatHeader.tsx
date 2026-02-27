import React from "react";
import { XBOAvatar } from "./XBOAvatar";

interface ChatHeaderProps {
  themeLabel: string;
  showNewChatButton?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  themeLabel,
  showNewChatButton = false,
}) => {
  return (
    <div
      style={{
        padding: "16px 20px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <XBOAvatar size={32} />

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {themeLabel} Assistant
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 2,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>Online</span>
        </div>
      </div>

      {showNewChatButton && (
        <button
          style={{
            width: 36,
            height: 36,
            background: "#f3f4f6",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}
    </div>
  );
};
