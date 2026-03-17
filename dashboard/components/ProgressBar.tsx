interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
}

export function ProgressBar({
  value,
  max,
  color = "#378ADD",
}: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <div
        style={{
          flex: 1,
          height: 6,
          background: "var(--color-background-secondary)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "12px",
          color: "var(--color-text-secondary)",
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
