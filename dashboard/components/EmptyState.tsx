interface EmptyStateProps {
  icon: string;
  title: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, action }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "3rem 1rem",
        color: "var(--color-text-tertiary)",
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: 8, opacity: 0.4 }}>
        {icon}
      </div>
      <div style={{ fontSize: "14px", marginBottom: 12 }}>{title}</div>
      {action}
    </div>
  );
}
