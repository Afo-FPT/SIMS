function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isGeminiHighDemandError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err || "");
  const lower = message.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("service unavailable") ||
    lower.includes("high demand") ||
    lower.includes("overloaded")
  );
}

export async function withGeminiRetry<T>(
  task: () => Promise<T>,
  opts: { attempts?: number; initialDelayMs?: number } = {}
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const initialDelayMs = Math.max(100, opts.initialDelayMs ?? 700);

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      const shouldRetry = isGeminiHighDemandError(err) && i < attempts - 1;
      if (!shouldRetry) throw err;
      const waitMs = initialDelayMs * Math.pow(2, i);
      await sleep(waitMs);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini request failed");
}
