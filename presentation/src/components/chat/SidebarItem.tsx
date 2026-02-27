import React from "react";

interface SidebarItemProps {
  title: string;
  time: string;
  active?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  title,
  time,
  active = false,
}) => {
  return (
    <div
      style={{
        width: "100%",
        padding: "10px 12px",
        marginBottom: 2,
        borderRadius: 8,
        background: active ? "#f3f0ff" : "transparent",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: "#111827",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginTop: 2,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {time}
      </div>
    </div>
  );
};
