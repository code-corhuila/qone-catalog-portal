import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { catalogApi } from "../../api/catalogApi";
import { identityApi } from "../../api/identityApi";
import { RequireRole } from "../../components/RequireRole";
import { useRequest, failureOf } from "../../hooks/useRequest";
import { CURRENT_TERM } from "../../model/catalog";
import { useIdempotencyKey } from "../../model/idempotency";
import { DAYS, validateSlots, type Slot } from "../../model/schedule";

type Field = "subjectCode" | "groupNumber" | "professorId" | "capacity";
type Errors = Partial<Record<Field, string>> & { slots?: Record<number, string>; blocks?: string };

interface Values {
  subjectCode: string;
  groupNumber: number;
  professorId: string;
  capacity: number;
  slots: Slot[];
}

const emptySlot = (): Slot => ({ day: "MON", start: "08:00", end: "10:00" });

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.subjectCode) errors.subjectCode = "Choose the subject.";
  if (!Number.isInteger(values.groupNumber) || values.groupNumber < 1 || values.groupNumber > 99) errors.groupNumber = "The group number goes from 1 to 99.";
  if (!values.professorId) errors.professorId = "Choose the professor.";
  if (!Number.isInteger(values.capacity) || values.capacity < 1 || values.capacity > 500) errors.capacity = "Capacity goes from 1 to 500.";
  for (const e of validateSlots(values.slots)) {
    if (e.index < 0) errors.blocks = e.message;
    else errors.slots = { ...errors.slots, [e.index]: e.message };
  }
  return errors;
}

// HU-CAT-002: an ADMIN opens a section of a subject for the current term with professor,
// capacity and schedule. The professor comes from identity (ID-05) and is sent as a snapshot;
// the schedule is checked for overlaps before the API repeats the check (INV-SEC-002).
export function NewSectionPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <NewSectionForm />
    </RequireRole>
  );
}

function NewSectionForm() {
  const id = useId();
  const navigate = useNavigate();
  const idempotency = useIdempotencyKey("section");
  const subjects = useRequest((signal) => catalogApi.listSubjects({ limit: 100 }, signal), []);
  const professors = useRequest((signal) => identityApi.listProfessors(signal), []);
  const [values, setValues] = useState<Values>({ subjectCode: "", groupNumber: 1, professorId: "", capacity: 30, slots: [emptySlot()] });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | undefined>();
  const [pending, setPending] = useState(false);

  const set = <K extends Field>(field: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const setSlot = (index: number, patch: Partial<Slot>) => {
    setValues((v) => ({ ...v, slots: v.slots.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
    setErrors(({ slots: _slots, blocks: _blocks, ...rest }) => rest);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError(undefined);
    if (Object.values(clientErrors).some(Boolean)) return;
    const professor = professors.status === "data" ? professors.data.data.find((p) => p.id === values.professorId) : undefined;
    if (!professor) return;
    setPending(true);
    try {
      await catalogApi.createSection(
        { subjectCode: values.subjectCode, term: CURRENT_TERM, groupNumber: values.groupNumber, professorId: professor.id, professorName: professor.name, capacity: values.capacity, slots: values.slots },
        idempotency.key,
      );
      idempotency.reset();
      void navigate(`/${values.subjectCode}`);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      const details = (cause as { details?: Array<{ field: string; message: string }> }).details ?? [];
      if (failureOf(error).code === "VALIDATION_ERROR" && details.length > 0) {
        setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])) as Errors);
      } else {
        const serverMessage = (cause as { serverMessage?: string }).serverMessage;
        setFormError({ message: serverMessage || error.message, ...(failureOf(error).traceId ? { traceId: failureOf(error).traceId } : {}) });
      }
    } finally {
      setPending(false);
    }
  }

  const describe = (key: string, error: string | undefined) => (error ? { "aria-invalid": "true" as const, "aria-describedby": `${id}-${key}-error` } : {});
  const errorText = (key: string, error: string | undefined) => (error ? <span id={`${id}-${key}-error`}> {error}</span> : null);

  return (
    <section aria-labelledby={`${id}-title`}>
      <p>
        <Link to="/">Back to subjects</Link>
      </p>
      <h3 id={`${id}-title`}>Open a section</h3>
      <p>Term {CURRENT_TERM}</p>
      <form onSubmit={submit} noValidate>
        <p>
          <label htmlFor={`${id}-subject`}>Subject</label>{" "}
          <select id={`${id}-subject`} value={values.subjectCode} onChange={(e) => set("subjectCode", e.target.value)} {...describe("subject", errors.subjectCode)}>
            <option value="">Choose a subject</option>
            {subjects.status === "data" ? subjects.data.data.map((s) => <option key={s.id} value={s.code}>{s.code} {s.name}</option>) : null}
          </select>
          {errorText("subject", errors.subjectCode)}
        </p>
        <p>
          <label htmlFor={`${id}-group`}>Group number</label>{" "}
          <input id={`${id}-group`} type="number" value={values.groupNumber} onChange={(e) => set("groupNumber", Number(e.target.value))} {...describe("group", errors.groupNumber)} />
          {errorText("group", errors.groupNumber)}
        </p>
        <p>
          <label htmlFor={`${id}-professor`}>Professor</label>{" "}
          <select id={`${id}-professor`} value={values.professorId} onChange={(e) => set("professorId", e.target.value)} {...describe("professor", errors.professorId)}>
            <option value="">Choose a professor</option>
            {professors.status === "data" ? professors.data.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>) : null}
          </select>
          {errorText("professor", errors.professorId)}
          {professors.status === "loading" ? <span role="status"> Loading professors...</span> : null}
        </p>
        {professors.status === "error" ? (
          <div role="alert">
            <p>Professors could not be loaded: {professors.error.message}</p>
            {failureOf(professors.error).traceId ? <p>Reference: {failureOf(professors.error).traceId}</p> : null}
            <button type="button" onClick={professors.retry}>Retry</button>
          </div>
        ) : null}
        <p>
          <label htmlFor={`${id}-capacity`}>Capacity</label>{" "}
          <input id={`${id}-capacity`} type="number" value={values.capacity} onChange={(e) => set("capacity", Number(e.target.value))} {...describe("capacity", errors.capacity)} />
          {errorText("capacity", errors.capacity)}
        </p>

        <fieldset>
          <legend>Schedule</legend>
          {values.slots.map((slot, i) => (
            <p key={i}>
              <label htmlFor={`${id}-day-${i}`}>Day of block {i + 1}</label>{" "}
              <select id={`${id}-day-${i}`} value={slot.day} onChange={(e) => setSlot(i, { day: e.target.value as Slot["day"] })}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>{" "}
              <label htmlFor={`${id}-start-${i}`}>Start of block {i + 1}</label>{" "}
              <input id={`${id}-start-${i}`} value={slot.start} onChange={(e) => setSlot(i, { start: e.target.value })} {...describe(`slot-${i}`, errors.slots?.[i])} />{" "}
              <label htmlFor={`${id}-end-${i}`}>End of block {i + 1}</label>{" "}
              <input id={`${id}-end-${i}`} value={slot.end} onChange={(e) => setSlot(i, { end: e.target.value })} />
              {values.slots.length > 1 ? (
                <button type="button" onClick={() => setValues((v) => ({ ...v, slots: v.slots.filter((_, j) => j !== i) }))}>
                  Remove block {i + 1}
                </button>
              ) : null}
              {errorText(`slot-${i}`, errors.slots?.[i])}
            </p>
          ))}
          {errors.blocks ? <p role="alert">{errors.blocks}</p> : null}
          <button type="button" onClick={() => setValues((v) => ({ ...v, slots: [...v.slots, emptySlot()] }))}>
            Add block
          </button>
        </fieldset>

        {formError ? (
          <div role="alert">
            <p>{formError.message}</p>
            {formError.traceId ? <p>Reference: {formError.traceId}</p> : null}
          </div>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? "Opening..." : "Open section"}
        </button>
      </form>
    </section>
  );
}
