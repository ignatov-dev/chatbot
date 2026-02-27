import React from "react";

interface UserBubbleProps {
  content: string;
}

export const UserBubble: React.FC<UserBubbleProps> = ({ content }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "90%",
          padding: "10px 14px",
          borderRadius: "18px 18px 4px 18px",
          background: "#4f2dd0",
          color: "#ffffff",
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: "break-word",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          whiteSpace: "pre-wrap",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {content}
      </div>
    </div>
  );
};
