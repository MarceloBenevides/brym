import "server-only";

import { headers } from "next/headers";

/** Origem absoluta do request atual (para montar URLs de redirect/e-mail). */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  return (
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`
  );
}
