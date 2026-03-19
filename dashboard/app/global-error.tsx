"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "2rem", fontFamily: "ui-monospace, monospace" }}>
        <h1 style={{ fontSize: "16px" }}>Lyra dashboard error</h1>
        <p style={{ fontSize: "13px", opacity: 0.8 }}>{error.message}</p>
        <button type="button" onClick={() => reset()} style={{ marginTop: "1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
