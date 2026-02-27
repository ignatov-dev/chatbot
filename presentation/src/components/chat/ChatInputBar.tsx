import React from "react";

interface ChatInputBarProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value = "",
  placeholder = "Type your message...",
  disabled = false,
}) => {
  const hasValue = value.length > 0;

  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        gap: 10,
        alignItems: "center",
        minHeight: 70,
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Input area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
        }}
      >
        <div
          style={{
            width: "100%",
            border: "1px solid #d1d5db",
            borderRadius: 12,
            padding: "10px 14px",
            paddingRight: 70,
            fontSize: 14,
            color: hasValue ? "#111827" : "#9ca3af",
            background: disabled ? "#f9fafb" : "#ffffff",
            boxSizing: "border-box",
            minHeight: 40,
            display: "flex",
            alignItems: "center",
          }}
        >
          {hasValue ? value : placeholder}
        </div>

        {/* Character counter */}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          {value.length}/100
        </div>
      </div>

      {/* Send button */}
      <button
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: hasValue ? "#4f2dd0" : "#d1d5db",
          color: "#ffffff",
          border: "none",
          cursor: hasValue ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
};
