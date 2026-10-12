import type { Msw } from "../msw";
import { identityFixtures } from "../fixtures/identity";

// The one identity operation this portal uses: ID-05, the paginated users an ADMIN filters by
// role to pick a professor. Called through the shell's client, so the gateway routes it.
export function identityHandlers({ http, HttpResponse }: Msw) {
const envelope = (status: number, error: string, message: string) =>
  HttpResponse.json({ error, message, traceId: crypto.randomUUID() }, { status });

return [
  http.get("*/api/v1/identity/users", ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
    const role = auth.slice(7).split(".")[1];
    if (role !== "ADMIN") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "20");
    return HttpResponse.json(identityFixtures.page(url.searchParams.get("role"), page, limit));
  }),
];
}
