import { catalogHandlers } from "./catalog";

// The MSW handlers of qone-catalog-api (CA-01..CA-12), added with the screens that use them.
// Fixtures are the seed of qone-catalog-db (06-data) and are validated against the contract.
export const handlers = [...catalogHandlers];
