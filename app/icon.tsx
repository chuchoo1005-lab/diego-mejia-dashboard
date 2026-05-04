import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          gap: 12,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            color: "#0A0A0A",
            fontWeight: 900,
            fontSize: 200,
            letterSpacing: "-4px",
            padding: "8px 44px",
            lineHeight: 1,
            fontFamily: "serif",
          }}
        >
          DM
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 32,
            letterSpacing: "10px",
            fontWeight: 300,
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
