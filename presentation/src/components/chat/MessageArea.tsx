import React from "react";

interface MessageAreaProps {
  children: React.ReactNode;
  showEmpty?: boolean;
  themeLabel?: string;
}

export const MessageArea: React.FC<MessageAreaProps> = ({
  children,
  showEmpty = false,
  themeLabel = "",
}) => {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        background: "#f9fafb",
        overflow: "hidden",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {showEmpty && !hasChildren ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>{"💬"}</div>
          <div style={{ fontSize: 14, color: "#9ca3af" }}>
            Ask me anything about {themeLabel}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};
