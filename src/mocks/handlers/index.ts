import { http, HttpResponse } from "msw";
import { catalogHandlers } from "./catalog";
import { identityHandlers } from "./identity";
import type { Msw } from "../msw";

// Every handler of the catalog portal, built with the given msw primitives (ADR-009).
export function createHandlers(msw: Msw) {
  return [...catalogHandlers(msw), ...identityHandlers(msw)];
}

/** The handlers for this portal's own tests (Node server in src/mocks/server.ts). */
export const handlers = createHandlers({ http, HttpResponse });
