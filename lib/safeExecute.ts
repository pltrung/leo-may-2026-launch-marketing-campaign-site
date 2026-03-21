/**
 * Safe execution wrapper: catches errors and logs without crashing the app.
 * Use for analytics, tracking, non-critical UI logic.
 */
export function safeExecute<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (e) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error("[safeExecute] Error:", e);
    }
    return fallback;
  }
}

/**
 * Async-safe execution wrapper.
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.error("[safeExecuteAsync] Error:", e);
    }
    return fallback;
  }
}
