interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div
      style={{
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        padding: "12px 16px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "var(--color-text-tertiary)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 500,
          color: accent ?? "var(--color-text-primary)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-text-tertiary)",
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
