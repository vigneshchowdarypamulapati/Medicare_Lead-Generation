/**
 * Reads and parses a JSON request body, returning the parsed object or null when
 * the body is not valid JSON or is not a plain object (e.g. `null`, `"str"`, `[]`).
 * Route handlers should treat a null return as a 400 Bad Request.
 */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}
