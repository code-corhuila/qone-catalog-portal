import { Link, useParams } from "react-router";
import { catalogApi } from "../api/catalogApi";
import { useRequest, failureOf } from "../hooks/useRequest";
import { CURRENT_TERM, formatSlots, seatsLevel, type Section } from "../model/catalog";

// HU-CAT-003: one subject with its prerequisites, and its sections of the term with professor,
// schedule and seats. The two requests have their own states so a failure of the sections
// does not hide the subject (Annex H).
export function SubjectPage() {
  const { code = "" } = useParams();
  const subject = useRequest((signal) => catalogApi.getSubject(code, signal), [code]);
  const sections = useRequest((signal) => catalogApi.listSections(code, { term: CURRENT_TERM, limit: 50 }, signal), [code]);

  return (
    <section aria-labelledby="subject-title">
      <p>
        <Link to="/">Back to subjects</Link>
      </p>

      {subject.status === "loading" ? <p role="status">Loading subject...</p> : null}
      {subject.status === "error" ? (
        <div role="alert">
          <p>{failureOf(subject.error).status === 404 ? "We could not find this subject." : subject.error.message}</p>
          {failureOf(subject.error).traceId ? <p>Reference: {failureOf(subject.error).traceId}</p> : null}
          <button type="button" onClick={subject.retry}>
            Retry
          </button>
        </div>
      ) : null}
      {subject.status === "data" ? (
        <>
          <h3 id="subject-title">
            {subject.data.code} {subject.data.name}
          </h3>
          <p>
            {subject.data.credits} credits, semester {subject.data.semester}
          </p>
          {subject.data.prerequisites.length === 0 ? (
            <p>No prerequisites.</p>
          ) : (
            <p>
              <span>Prerequisites:</span>{" "}
              {subject.data.prerequisites.map((p, i) => (
                <span key={p}>
                  {i > 0 ? ", " : ""}
                  <Link to={`/${p}`}>{p}</Link>
                </span>
              ))}
            </p>
          )}
        </>
      ) : null}

      {subject.status === "data" ? <SectionsTable code={code} state={sections} /> : null}
    </section>
  );
}

function SectionsTable({ code, state }: { code: string; state: ReturnType<typeof useRequest<{ data: Section[] }>> }) {
  if (state.status === "loading") return <p role="status">Loading sections...</p>;
  if (state.status === "error") {
    return (
      <div role="alert">
        <p>{state.error.message}</p>
        {failureOf(state.error).traceId ? <p>Reference: {failureOf(state.error).traceId}</p> : null}
        <button type="button" onClick={state.retry}>
          Retry
        </button>
      </div>
    );
  }
  if (state.data.data.length === 0) return <p>No sections open this term.</p>;
  return (
    <table aria-label={`Sections of ${code}`}>
      <thead>
        <tr>
          <th scope="col">Group</th>
          <th scope="col">Professor</th>
          <th scope="col">Schedule</th>
          <th scope="col">Seats</th>
        </tr>
      </thead>
      <tbody>
        {state.data.data.map((s) => (
          <tr key={s.id}>
            <td>Group {s.groupNumber}</td>
            <td>{s.professorName}</td>
            <td>{formatSlots(s.slots)}</td>
            <td>
              <SeatsChip section={s} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SeatsChip({ section }: { section: Pick<Section, "seatsAvailable" | "capacity"> }) {
  const level = seatsLevel(section);
  const label = level === "full" ? "Full" : `${section.seatsAvailable} seats`;
  return <span data-level={level}>{label}</span>;
}
