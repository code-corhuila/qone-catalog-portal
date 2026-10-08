import { useState } from "react";
import { Link } from "react-router";
import { catalogApi } from "../api/catalogApi";
import { useRequest, failureOf } from "../hooks/useRequest";

const PAGE_SIZE = 10;
const SEMESTERS = [5, 6, 7];

// HU-CAT-003: the subjects of the pensum, paginated with the contract's page and limit, with a
// semester filter. Four states (Annex H); a change of page or filter replaces the request.
export function SubjectsPage() {
  const [page, setPage] = useState(1);
  const [semester, setSemester] = useState<number | undefined>(undefined);
  const state = useRequest((signal) => catalogApi.listSubjects({ page, limit: PAGE_SIZE, ...(semester ? { semester } : {}) }, signal), [page, semester]);

  return (
    <section aria-labelledby="subjects-title">
      <h3 id="subjects-title">Subjects</h3>
      <p>
        <label htmlFor="semester-filter">Semester</label>{" "}
        <select
          id="semester-filter"
          value={semester ?? ""}
          onChange={(e) => {
            setSemester(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </p>

      {state.status === "loading" ? <p role="status">Loading subjects...</p> : null}

      {state.status === "error" ? (
        <div role="alert">
          <p>{state.error.message}</p>
          {failureOf(state.error).traceId ? <p>Reference: {failureOf(state.error).traceId}</p> : null}
          <button type="button" onClick={state.retry}>
            Retry
          </button>
        </div>
      ) : null}

      {state.status === "data" && state.data.data.length === 0 ? <p>No subjects match this filter.</p> : null}

      {state.status === "data" && state.data.data.length > 0 ? (
        <>
          <p>
            {state.data.meta.total} subjects, page {state.data.meta.page} of {state.data.meta.totalPages}
          </p>
          <table aria-label="Subjects">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Name</th>
                <th scope="col">Credits</th>
                <th scope="col">Semester</th>
                <th scope="col">Prerequisites</th>
              </tr>
            </thead>
            <tbody>
              {state.data.data.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/${s.code}`}>{s.code}</Link>
                  </td>
                  <td>{s.name}</td>
                  <td>{s.credits}</td>
                  <td>{s.semester}</td>
                  <td>{s.prerequisites.length ? s.prerequisites.join(", ") : "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={state.data.meta.page <= 1}>
              Previous page
            </button>{" "}
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={state.data.meta.page >= state.data.meta.totalPages}>
              Next page
            </button>
          </p>
        </>
      ) : null}
    </section>
  );
}
