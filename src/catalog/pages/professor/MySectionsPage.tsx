import { Link } from "react-router";
import { catalogApi } from "../../api/catalogApi";
import { RequireRole } from "../../components/RequireRole";
import { useRequest, failureOf } from "../../hooks/useRequest";
import { CURRENT_TERM, formatSlots } from "../../model/catalog";

// HU-WEB-002: the sections assigned to the signed-in professor this term (CA-07), with
// schedule and occupancy. The roster is the enrollment portal's (EN-10); this page links to it
// through the shell's route for that portal.
export function MySectionsPage() {
  return (
    <RequireRole roles={["PROFESSOR"]}>
      <MySections />
    </RequireRole>
  );
}

function MySections() {
  const state = useRequest((signal) => catalogApi.mySections({ term: CURRENT_TERM, limit: 50 }, signal), []);

  return (
    <section aria-labelledby="my-sections-title">
      <h3 id="my-sections-title">My sections</h3>
      <p>Term {CURRENT_TERM}</p>

      {state.status === "loading" ? <p role="status">Loading your sections...</p> : null}

      {state.status === "error" ? (
        <div role="alert">
          <p>{state.error.message}</p>
          {failureOf(state.error).traceId ? <p>Reference: {failureOf(state.error).traceId}</p> : null}
          <button type="button" onClick={state.retry}>
            Retry
          </button>
        </div>
      ) : null}

      {state.status === "data" && state.data.data.length === 0 ? <p>You have no sections assigned this term.</p> : null}

      {state.status === "data" && state.data.data.length > 0 ? (
        <table aria-label="My sections">
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Group</th>
              <th scope="col">Schedule</th>
              <th scope="col">Occupancy</th>
              <th scope="col">Students</th>
            </tr>
          </thead>
          <tbody>
            {state.data.data.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link to={`../${s.subjectCode}`}>{s.subjectCode}</Link> {s.subjectName}
                </td>
                <td>Group {s.groupNumber}</td>
                <td>{formatSlots(s.slots)}</td>
                <td>
                  {s.capacity - s.seatsAvailable} of {s.capacity} seats taken
                </td>
                <td>
                  <a href={`/enrollment/sections/${s.id}/roster`}>Roster</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
