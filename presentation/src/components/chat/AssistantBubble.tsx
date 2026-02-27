import React from "react";
import { Img, staticFile } from "remotion";
import { XBOAvatar } from "./XBOAvatar";

interface AssistantBubbleProps {
  content: string;
}

function renderVideoPlayer(keyOffset: number): React.ReactNode {
  return (
    <div
      key={keyOffset}
      style={{
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
        background: "#000",
        margin: "8px 0",
        position: "relative",
        aspectRatio: "16 / 9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Poster image */}
      <Img
        src={staticFile("video-poster.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* Play button */}
      <div
        style={{
          position: "relative",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderLeft: "16px solid #4f2dd0",
            marginLeft: 3,
          }}
        />
      </div>
    </div>
  );
}

function parseMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Video tag detection
    if (line.includes("<video") && line.includes("src=")) {
      elements.push(renderVideoPlayer(elements.length));
      i++;
      continue;
    }

    // Table detection: line contains | and next line is a separator or current is data row
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, elements.length));
      continue;
    }

    // Heading ##
    if (line.startsWith("## ")) {
      elements.push(
        <div
          key={elements.length}
          style={{ fontWeight: 700, fontSize: 14, margin: "10px 0 4px" }}
        >
          {applyInlineFormatting(line.slice(3))}
        </div>
      );
      i++;
      continue;
    }

    // Heading ###
    if (line.startsWith("### ")) {
      elements.push(
        <div
          key={elements.length}
          style={{ fontWeight: 700, fontSize: 14, margin: "10px 0 4px" }}
        >
          {applyInlineFormatting(line.slice(4))}
        </div>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(
          <li key={items.length}>{applyInlineFormatting(lines[i].slice(2))}</li>
        );
        i++;
      }
      elements.push(
        <ul
          key={elements.length}
          style={{ paddingLeft: 20, margin: "4px 0 8px", listStyleType: "disc" }}
        >
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, "");
        items.push(
          <li key={items.length}>{applyInlineFormatting(text)}</li>
        );
        i++;
      }
      elements.push(
        <ol
          key={elements.length}
          style={{ paddingLeft: 20, margin: "4px 0 8px" }}
        >
          {items}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <div
          key={elements.length}
          style={{
            borderLeft: "3px solid #d1d5db",
            paddingLeft: 10,
            color: "#6b7280",
            margin: "6px 0",
          }}
        >
          {quoteLines.map((ql, idx) => (
            <div key={idx}>{applyInlineFormatting(ql)}</div>
          ))}
        </div>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={elements.length} style={{ margin: "0 0 8px" }}>
        {applyInlineFormatting(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function applyInlineFormatting(text: string): React.ReactNode {
  // Split by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} style={{ fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderTable(tableLines: string[], keyOffset: number): React.ReactNode {
  const parseRow = (line: string): string[] => {
    return line
      .split("|")
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      .map((cell) => cell.trim());
  };

  // Filter out separator rows (e.g. |---|---|)
  const dataLines = tableLines.filter(
    (line) => !/^\|[\s\-:|]+\|$/.test(line.trim())
  );

  if (dataLines.length === 0) return null;

  const headerCells = parseRow(dataLines[0]);
  const bodyRows = dataLines.slice(1).map(parseRow);

  return (
    <table
      key={keyOffset}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid #e5e7eb",
        fontSize: 13,
        margin: "6px 0",
      }}
    >
      <thead>
        <tr>
          {headerCells.map((cell, idx) => (
            <th
              key={idx}
              style={{
                background: "#f3f4f6",
                padding: "6px 10px",
                border: "1px solid #e5e7eb",
                textAlign: "left",
                fontWeight: 600,
              }}
            >
              {applyInlineFormatting(cell)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyRows.map((row, rIdx) => (
          <tr key={rIdx}>
            {row.map((cell, cIdx) => (
              <td
                key={cIdx}
                style={{
                  padding: "6px 10px",
                  border: "1px solid #e5e7eb",
                }}
              >
                {applyInlineFormatting(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const AssistantBubble: React.FC<AssistantBubbleProps> = ({ content }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        marginBottom: 12,
        gap: 8,
      }}
    >
      <div style={{ alignSelf: "flex-end" }}>
        <XBOAvatar size={32} />
      </div>
      <div
        style={{
          maxWidth: "90%",
          padding: "10px 14px",
          borderRadius: "18px 18px 18px 4px",
          background: "#ffffff",
          color: "#111827",
          fontSize: 14,
          lineHeight: 1.6,
          wordBreak: "break-word",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {parseMarkdown(content)}
      </div>
    </div>
  );
};
