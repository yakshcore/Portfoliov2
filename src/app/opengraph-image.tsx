import { ImageResponse } from "next/og";
import { identity } from "@/data/portfolio";

export const alt = `${identity.name} - ${identity.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// on-brand "blueprint card" social preview - generated at build, no asset files
export default function Image() {
  const cyan = "#43c9ff";
  const dim = "#9fb2c8";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        backgroundColor: "#060a16",
        backgroundImage:
          "linear-gradient(135deg, #060a16 0%, #0a1424 60%, #0b1830 100%)",
        color: "#eaf2ff",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* inset blueprint frame */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 28,
          right: 28,
          bottom: 28,
          border: "1px solid rgba(67,201,255,0.25)",
        }}
      />

      {/* top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 20,
          letterSpacing: 3,
          color: cyan,
        }}
      >
        <div style={{ display: "flex" }}>
          DRAWING NO. YB-2026 · MASTER SCHEMATIC
        </div>
        <div style={{ display: "flex", color: dim }}>
          {identity.callsign} · UPLINK ACTIVE
        </div>
      </div>

      {/* identity */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          YAKSH BAMBHROLIYA
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 40,
            fontWeight: 600,
            color: cyan,
          }}
        >
          {identity.role}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 27,
            color: dim,
          }}
        >
          MERN · AI/LLM · Cloud-Native - production systems, shipped end-to-end.
        </div>
      </div>

      {/* bottom row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          letterSpacing: 1,
          color: dim,
        }}
      >
        <div style={{ display: "flex" }}>{identity.location.toUpperCase()}</div>
        <div style={{ display: "flex", color: cyan }}>
          github.com/yakshcore · linkedin.com/in/yaksh-bambhroliya
        </div>
      </div>
    </div>,
    { ...size },
  );
}
