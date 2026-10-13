import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { catalogApi } from "../../api/catalogApi";
import { RequireRole } from "../../components/RequireRole";
import { useRequest, failureOf } from "../../hooks/useRequest";
import { useIdempotencyKey } from "../../model/idempotency";
import type { SubjectRequest } from "../../model/catalog";

type Field = "code" | "name" | "credits" | "semester";
type Errors = Partial<Record<Field, string>>;

const CODE_PATTERN = /^[A-Z0-9-]{3,10}$/;

function validate(values: SubjectRequest): Errors {
  const errors: Errors = {};
  if (!CODE_PATTERN.test(values.code)) errors.code = "Use the form ISW-604: capital letters, digits and hyphens, 3 to 10 characters.";
  if (values.name.trim().length < 2) errors.name = "Write the name of the subject (2 characters or more).";
  if (!Number.isInteger(values.credits) || values.credits < 1 || values.credits > 10) errors.credits = "Credits go from 1 to 10.";
  if (!Number.isInteger(values.semester) || values.semester < 1 || values.semester > 12) errors.semester = "The semester goes from 1 to 12.";
  return errors;
}

// HU-CAT-001: an ADMIN adds a subject to the pensum with its prerequisites (INV-SUB-001 unique
// code; INV-SUB-002 acyclic prerequisites, enforced by the service). Annex H form rules: label
// per field, error beside the field, button disabled while pending, one Idempotency-Key per
// intention reused on retry and renewed after success.
export function NewSubjectPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <NewSubjectForm />
    </RequireRole>
  );
}

function NewSubjectForm() {
  const id = useId();
  const navigate = useNavigate();
  const idempotency = useIdempotencyKey("subject");
  const subjects = useRequest((signal) => catalogApi.listSubjects({ limit: 100 }, signal), []);
  const [values, setValues] = useState<SubjectRequest>({ code: "", name: "", credits: 3, semester: 1, prerequisites: [] });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ message: string; traceId?: string } | undefined>();
  const [pending, setPending] = useState(false);

  const set = <K extends Field>(field: K, value: SubjectRequest[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError(undefined);
    if (Object.values(clientErrors).some(Boolean)) return;
    setPending(true);
    try {
      const created = await catalogApi.createSubject(values, idempotency.key);
      idempotency.reset();
      void navigate(`../${created.code}`);
    } catch (cause) {
      const failure = failureOf(cause instanceof Error ? cause : new Error(String(cause)));
      const details = (cause as { details?: Array<{ field: string; message: string }> }).details ?? [];
      if (failure.code === "VALIDATION_ERROR" && details.length > 0) {
        setErrors(Object.fromEntries(details.map((d) => [d.field, d.message])) as Errors);
      } else {
        const serverMessage = (cause as { serverMessage?: string }).serverMessage;
        setFormError({ message: serverMessage || (cause instanceof Error ? cause.message : "Unexpected error"), ...(failure.traceId ? { traceId: failure.traceId } : {}) });
      }
    } finally {
      setPending(false);
    }
  }

  const field = (name: Field, label: string, input: (props: { id: string; "aria-invalid"?: "true"; "aria-describedby"?: string }) => ReactNode) => {
    const fieldId = `${id}-${name}`;
    const errorId = `${fieldId}-error`;
    const error = errors[name];
    return (
      <p>
        <label htmlFor={fieldId}>{label}</label>{" "}
        {input({ id: fieldId, ...(error ? { "aria-invalid": "true" as const, "aria-describedby": errorId } : {}) })}
        {error ? <span id={errorId}> {error}</span> : null}
      </p>
    );
  };

  return (
    <section aria-labelledby={`${id}-title`}>
      <p>
        <Link to="..">Back to subjects</Link>
      </p>
      <h3 id={`${id}-title`}>New subject</h3>
      <form onSubmit={submit} noValidate>
        {field("code", "Code", (p) => <input {...p} value={values.code} onChange={(e) => set("code", e.target.value)} />)}
        {field("name", "Name", (p) => <input {...p} value={values.name} onChange={(e) => set("name", e.target.value)} />)}
        {field("credits", "Credits", (p) => <input {...p} type="number" value={values.credits} onChange={(e) => set("credits", Number(e.target.value))} />)}
        {field("semester", "Semester", (p) => <input {...p} type="number" value={values.semester} onChange={(e) => set("semester", Number(e.target.value))} />)}
        <p>
          <label htmlFor={`${id}-prerequisites`}>Prerequisites</label>{" "}
          <select
            id={`${id}-prerequisites`}
            multiple
            value={values.prerequisites}
            onChange={(e) => setValues((v) => ({ ...v, prerequisites: Array.from(e.target.selectedOptions, (o) => o.value) }))}
          >
            {subjects.status === "data" ? subjects.data.data.map((s) => <option key={s.id} value={s.code}>{s.code} {s.name}</option>) : null}
          </select>
          {subjects.status === "loading" ? <span role="status"> Loading subjects...</span> : null}
        </p>
        {formError ? (
          <div role="alert">
            <p>{formError.message}</p>
            {formError.traceId ? <p>Reference: {formError.traceId}</p> : null}
          </div>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create subject"}
        </button>
      </form>
    </section>
  );
}
