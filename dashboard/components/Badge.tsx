import { getSeverityColors } from "@/lib/constants";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  small?: boolean;
}

export function Badge({ children, color = "gray", small = false }: BadgeProps) {
  const colors = getSeverityColors(color);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: small ? "1px 6px" : "2px 8px",
        borderRadius: "var(--border-radius-md)",
        background: colors.bg,
        color: colors.text,
        fontSize: small ? "11px" : "12px",
        fontWeight: 500,
        border: `0.5px solid ${colors.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
