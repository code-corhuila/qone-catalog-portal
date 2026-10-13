import { apiClient } from "shell/apiClient";
import type { Page } from "../model/catalog";

// The one identity operation the catalog portal needs: ID-05, the professors an ADMIN assigns
// to a section. Through the shell's client, so the gateway routes it and the token travels.
export interface Professor {
  id: string;
  name: string;
  email: string;
}

export const identityApi = {
  listProfessors(signal?: AbortSignal): Promise<Page<Professor>> {
    return apiClient.get<Page<Professor>>("/api/v1/identity/users", { query: { role: "PROFESSOR", limit: 100 }, ...(signal ? { signal } : {}) });
  },
};
