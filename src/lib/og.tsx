import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

// Satori has no oklch(): hex approximations of the dark-theme viz tokens.
const C = {
  bg: "#11131a",
  card: "#181b24",
  border: "#262a36",
  text: "#f3f4f7",
  muted: "#9aa0ae",
  brand: "#8b8cf7",
  bar: "#4b5263",
  compare: "#f2b94b",
  swap: "#f0656a",
  sorted: "#3fbf9c",
};

const BARS = [0.42, 0.68, 0.3, 0.88, 0.55, 0.76, 0.24, 0.62, 0.36, 0.82, 0.48, 0.94];
const BAR_COLORS: Record<number, string> = { 3: C.compare, 4: C.compare, 6: C.swap, 10: C.sorted, 11: C.sorted };

/** Shared 1200×630 card: brand mark, eyebrow, title, chips, and a decorative bar chart. */
export function ogImage({ eyebrow, title, chips }: { eyebrow: string; title: string; chips: string[] }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: C.bg, color: C.text, padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 36 }}>
              {[0.55, 0.8, 0.4, 1].map((h, i) => (
                <div key={i} style={{ width: 8, height: 36 * h, borderRadius: 2, background: [C.bar, C.compare, C.brand, C.sorted][i] }} />
              ))}
            </div>
            <span>
              algo<span style={{ color: C.brand }}>·</span>visual
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: C.muted }}>{eyebrow}</div>
            <div style={{ fontSize: title.length > 22 ? 64 : 80, fontWeight: 700, lineHeight: 1.05, maxWidth: 640 }}>{title}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    fontSize: 24,
                    padding: "8px 16px",
                    borderRadius: 12,
                    border: `2px solid ${C.border}`,
                    background: C.card,
                    color: C.text,
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, width: 400, height: "100%", paddingTop: 80 }}>
          {BARS.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 6, background: BAR_COLORS[i] ?? C.bar }} />
          ))}
        </div>
      </div>
    ),
    ogSize,
  );
}
