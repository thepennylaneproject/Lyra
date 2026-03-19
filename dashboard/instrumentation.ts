/**
 * Next.js instrumentation — runs once when the server starts.
 * Used to capture unhandled rejections (e.g. AggregateError ECONNREFUSED).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      const code = (reason as Error & { code?: string }).code;
      const errors = (reason as Error & { errors?: unknown[] }).errors;
      // #region agent log
      fetch("http://127.0.0.1:7282/ingest/b02da152-e83c-445f-a22d-32676413b958", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "102243" },
        body: JSON.stringify({
          sessionId: "102243",
          location: "instrumentation.ts:unhandledRejection",
          message: "unhandledRejection",
          data: {
            name: err.name,
            message: err.message,
            code,
            isAggregate: err.name === "AggregateError",
            errorsCount: Array.isArray(errors) ? errors.length : 0,
            stack: err.stack?.slice(0, 500),
          },
          timestamp: Date.now(),
          hypothesisId: "H3",
        }),
      }).catch(() => {});
      // #endregion
    });
  }
}
