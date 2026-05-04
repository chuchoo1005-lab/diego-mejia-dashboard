import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0A0A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            color: "#0A0A0A",
            fontWeight: 900,
            fontSize: 76,
            letterSpacing: "-2px",
            padding: "4px 18px",
            lineHeight: 1,
            fontFamily: "serif",
          }}
        >
          DM
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            letterSpacing: "4px",
            fontFamily: "sans-serif",
          }}
        >
          DENTAL
        </div>
      </div>
    ),
    { ...size }
  );
}
