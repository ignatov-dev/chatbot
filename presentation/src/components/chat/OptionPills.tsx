import React from "react";

interface OptionPillsProps {
  options: string[];
  highlightIndex?: number;
}

export const OptionPills: React.FC<OptionPillsProps> = ({
  options,
  highlightIndex,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {options.map((option, index) => {
        const isHighlighted = index === highlightIndex;
        return (
          <div
            key={index}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 18,
              background: isHighlighted ? "#4f2dd0" : "#f3f4f6",
              color: isHighlighted ? "#ffffff" : "#111827",
              border: isHighlighted
                ? "1px solid #4f2dd0"
                : "1px solid #e5e7eb",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {option}
          </div>
        );
      })}
    </div>
  );
};
