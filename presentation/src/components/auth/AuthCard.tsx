import React from "react";
import { Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GoogleButton } from "./GoogleButton";

const { fontFamily } = loadFont();

interface AuthCardProps {
  email?: string;
  password?: string;
  showCursor?: boolean;
  buttonText?: string;
  buttonActive?: boolean;
  buttonScale?: number;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  email = "",
  password = "",
  showCursor = false,
  buttonText = "Sign In",
  buttonActive = false,
  buttonScale = 1,
}) => {
  const dots = password ? "\u2022".repeat(password.length) : "";

  return (
    <div
      style={{
        width: 360,
        padding: 32,
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        fontFamily,
        boxSizing: "border-box",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Img
          src={staticFile("XBO.svg")}
          style={{ width: 48, height: 48 }}
        />
      </div>

      {/* Heading */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            color: "#111827",
            margin: 0,
            fontWeight: 600,
          }}
        >
          Welcome back
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            margin: "4px 0 0",
          }}
        >
          Sign in to continue
        </p>
      </div>

      {/* Email field */}
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            marginBottom: 4,
          }}
        >
          Email
        </label>
        <div
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            color: "#111827",
            boxSizing: "border-box",
            minHeight: 37,
            display: "flex",
            alignItems: "center",
          }}
        >
          {email}
          {showCursor && (
            <span
              style={{
                display: "inline-block",
                width: 1,
                height: 16,
                background: "#111827",
                marginLeft: 1,
              }}
            />
          )}
        </div>
      </div>

      {/* Password field */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            marginBottom: 4,
          }}
        >
          Password
        </label>
        <div
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            fontSize: 14,
            color: "#111827",
            boxSizing: "border-box",
            minHeight: 37,
            display: "flex",
            alignItems: "center",
          }}
        >
          {dots}
        </div>
      </div>

      {/* Submit button */}
      <button
        style={{
          width: "100%",
          padding: 10,
          background: buttonActive ? "#3d22a3" : "#4f2dd0",
          color: "#ffffff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily,
          transform: `scale(${buttonScale})`,
        }}
      >
        {buttonText}
      </button>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          margin: "16px 0",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 1,
            background: "#e5e7eb",
          }}
        />
        <span
          style={{
            fontSize: 12,
            color: "#9ca3af",
            padding: "0 12px",
          }}
        >
          or
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "#e5e7eb",
          }}
        />
      </div>

      {/* Google button */}
      <GoogleButton />

      {/* Toggle text */}
      <p
        style={{
          fontSize: 13,
          color: "#6b7280",
          textAlign: "center",
          marginTop: 16,
          marginBottom: 0,
        }}
      >
        Don't have an account?{" "}
        <span
          style={{
            color: "#4f2dd0",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign Up
        </span>
      </p>

      {/* Fine print */}
      <p
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textAlign: "center",
          marginTop: 16,
          marginBottom: 0,
          lineHeight: 1.4,
        }}
      >
        By continuing, you agree to our{" "}
        <span
          style={{
            color: "#6b7280",
            textDecoration: "underline",
          }}
        >
          Privacy Policy
        </span>{" "}
        and{" "}
        <span
          style={{
            color: "#6b7280",
            textDecoration: "underline",
          }}
        >
          Terms of Service
        </span>
      </p>

      {/* Guide Tour */}
      <p
        style={{
          fontSize: 13,
          color: "#4f2dd0",
          textAlign: "center",
          marginTop: 12,
          marginBottom: 0,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Guide Tour
      </p>
    </div>
  );
};
