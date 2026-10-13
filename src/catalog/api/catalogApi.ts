import { apiClient, type RequestOptions } from "shell/apiClient";
import type { Page, Section, SectionRequest, Subject, SubjectRequest } from "../model/catalog";

// Typed calls of qone-catalog-api over the shell's client (Annex H: `src/catalog/api/` uses
// `shell/apiClient`, never fetch). Paths are relative; the shell knows the gateway.
const BASE = "/api/v1/catalog";

// A type alias, not an interface: only aliases are assignable to the client's query record.
export type PageQuery = { page?: number; limit?: number };

export const catalogApi = {
  /** CA-02 */
  listSubjects(query: PageQuery & { semester?: number } = {}, signal?: AbortSignal): Promise<Page<Subject>> {
    return apiClient.get<Page<Subject>>(`${BASE}/subjects`, withSignal({ query }, signal));
  },
  /** CA-04 */
  getSubject(code: string, signal?: AbortSignal): Promise<Subject> {
    return apiClient.get<Subject>(`${BASE}/subjects/${encodeURIComponent(code)}`, withSignal({}, signal));
  },
  /** CA-05 */
  listSections(code: string, query: PageQuery & { term?: string } = {}, signal?: AbortSignal): Promise<Page<Section>> {
    return apiClient.get<Page<Section>>(`${BASE}/subjects/${encodeURIComponent(code)}/sections`, withSignal({ query }, signal));
  },
  /** CA-07, PROFESSOR */
  mySections(query: PageQuery & { term?: string } = {}, signal?: AbortSignal): Promise<Page<Section>> {
    return apiClient.get<Page<Section>>(`${BASE}/sections/mine`, withSignal({ query }, signal));
  },
  /** CA-06, ADMIN */
  listAllSections(query: PageQuery & { term?: string; professorId?: string } = {}, signal?: AbortSignal): Promise<Page<Section>> {
    return apiClient.get<Page<Section>>(`${BASE}/sections`, withSignal({ query }, signal));
  },
  /** CA-08 */
  getSection(id: string, signal?: AbortSignal): Promise<Section> {
    return apiClient.get<Section>(`${BASE}/sections/${encodeURIComponent(id)}`, withSignal({}, signal));
  },
  /** CA-03, ADMIN. One Idempotency-Key per intention, reused on retry (norm 5.4.2). */
  createSubject(body: SubjectRequest, idempotencyKey: string): Promise<Subject> {
    return apiClient.post<Subject>(`${BASE}/subjects`, body, { idempotencyKey });
  },
  /** CA-09, ADMIN */
  createSection(body: SectionRequest, idempotencyKey: string): Promise<Section> {
    return apiClient.post<Section>(`${BASE}/sections`, body, { idempotencyKey });
  },
};

function withSignal(options: RequestOptions, signal: AbortSignal | undefined): RequestOptions {
  return signal ? { ...options, signal } : options;
}
