import React from "react";

interface ThemeTabsProps {
  activeIndex: number;
  themes: string[];
}

export const ThemeTabs: React.FC<ThemeTabsProps> = ({
  activeIndex,
  themes,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "0 16px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {themes.map((theme, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={theme}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#4f2dd0" : "#6b7280",
              borderBottom: isActive
                ? "2px solid #4f2dd0"
                : "2px solid transparent",
              background: "transparent",
              border: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: isActive ? "#4f2dd0" : "transparent",
              borderRadius: 0,
              marginBottom: -1,
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {theme}
          </button>
        );
      })}
    </div>
  );
};
