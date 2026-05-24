// Tiny in-memory session — resets on reload (per spec: no real auth)
let session: { role: "tenant" | "manager"; name: string; unit?: string } | null = null;

export function setSession(s: typeof session) {
  session = s;
}
export function getSession() {
  return session;
}
