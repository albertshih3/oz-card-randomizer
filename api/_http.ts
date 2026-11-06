import type { VercelRequest, VercelResponse } from "@vercel/node";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Returns the request's JSON object body, or responds with a 4xx and returns
 * null. Rejects oversized and non-JSON requests, and anything that is not a
 * plain object (arrays, strings, null). Reading req.body can itself throw on
 * malformed JSON, so that stays inside this guard.
 */
export function readJsonObject(
  req: VercelRequest,
  res: VercelResponse,
): Record<string, unknown> | null {
  if (Number(req.headers["content-length"] ?? 0) > MAX_BODY_BYTES) {
    res.status(413).json({ error: "Request is too large." });
    return null;
  }

  const contentType = String(req.headers["content-type"] ?? "");
  if (!contentType.toLowerCase().startsWith("application/json")) {
    res.status(415).json({ error: "Content-Type must be application/json." });
    return null;
  }

  let body: unknown;
  try {
    body = req.body;
  } catch {
    res.status(400).json({ error: "Invalid JSON." });
    return null;
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ error: "Invalid request body." });
    return null;
  }
  return body as Record<string, unknown>;
}

/** The client address as set by Vercel's edge, which clients cannot spoof. */
export function clientAddress(req: VercelRequest): string {
  const header =
    req.headers["x-vercel-forwarded-for"] ?? req.headers["x-real-ip"] ?? "";
  const value = Array.isArray(header) ? header[0] : header;
  return value.split(",")[0].trim() || "unknown";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}
