"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Upload, ArrowRight } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { mutate, type ActionResult } from "@/lib/actions";
export type FieldSpec = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  hint?: string;
};
export function ActionForm({
  action,
  fields = [],
  initial = {},
  label = "Save changes",
  children,
  onSuccessHref,
}: {
  action: string;
  fields?: FieldSpec[];
  initial?: Record<string, unknown>;
  label?: string;
  children?: ReactNode;
  onSuccessHref?: string;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: Record<string, unknown> = { ...initial };
        for (const f of fields) {
          data[f.name] =
            f.type === "checkbox"
              ? fd.get(f.name) === "on"
              : fd.get(f.name) || "";
          if ((f.name === "moduleId" || f.name === "dueAt") && !data[f.name])
            data[f.name] = null;
          if (f.type === "json") {
            try {
              data[f.name] = JSON.parse(String(data[f.name]));
            } catch {
              setResult({
                ok: false,
                message: `Check the format of ${f.label.toLowerCase()}.`,
              });
              return;
            }
          }
        }
        start(async () => {
          const r = await mutate(action, data);
          setResult(r);
          if (r.ok) {
            router.refresh();
            if (onSuccessHref) router.push(onSuccessHref);
            else if (action === "admin.course" && !initial.id && r.id)
              router.push(`/admin/courses/${r.id}`);
          }
        });
      }}
    >
      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label className="checkbox" key={f.name}>
            <input
              type="checkbox"
              name={f.name}
              defaultChecked={Boolean(initial[f.name])}
              required={f.required}
            />
            {f.label}
          </label>
        ) : (
          <label className="field" key={f.name}>
            <span>
              {f.label}
              {f.required ? " *" : ""}
            </span>
            {f.type === "textarea" || f.type === "json" ? (
              <textarea
                name={f.name}
                required={f.required}
                defaultValue={
                  f.type === "json"
                    ? JSON.stringify(initial[f.name] || [], null, 2)
                    : String(initial[f.name] || "")
                }
                placeholder={f.placeholder}
                rows={f.type === "json" ? 10 : 4}
              />
            ) : f.type === "select" ? (
              <select
                name={f.name}
                defaultValue={String(initial[f.name] ?? "")}
                required={f.required}
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type || "text"}
                name={f.name}
                required={f.required}
                defaultValue={String(initial[f.name] ?? "")}
                placeholder={f.placeholder}
              />
            )}{" "}
            {f.hint && <small>{f.hint}</small>}
          </label>
        ),
      )}
      {children}
      {result && (
        <div
          className={`notice ${result.ok ? "success" : "error"}`}
          role="status"
        >
          {result.message}
        </div>
      )}
      <div className="form-actions">
        <button className="button" disabled={pending} type="submit">
          {pending ? (
            <Loader2 size={15} className="spin" />
          ) : result?.ok ? (
            <Check size={15} />
          ) : null}
          {pending ? "Saving…" : label}
        </button>
      </div>
    </form>
  );
}
export function ActionButton({
  action,
  input,
  label,
  className = "button secondary small",
}: {
  action: string;
  input: Record<string, unknown>;
  label: string;
  className?: string;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <button
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await mutate(action, input);
            setResult(r);
            if (r.ok) router.refresh();
          })
        }
      >
        {pending ? "Saving…" : label}
      </button>
      {result && !result.ok && (
        <p
          role="alert"
          className="text-small"
          style={{ color: "#a13c2c", marginTop: 8 }}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
export function FileUpload({
  courseId,
  assessmentId,
  lessonId,
  kind,
  onUploaded,
  onBusy,
}: {
  courseId: string;
  assessmentId?: string;
  lessonId?: string;
  kind: "resource" | "submission";
  onUploaded?: (id: string) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <label className="field">
      <span>
        {kind === "resource"
          ? "Upload learning resource"
          : "Attach your assessment"}
      </span>
      <input
        type="file"
        accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          onBusy?.(true);
          onUploaded?.("");
          setMessage("Uploading your file…");
          try {
            const result = await upload(
              `${kind}/${crypto.randomUUID()}/${f.name}`,
              f,
              {
                access: "private",
                handleUploadUrl: "/api/uploads",
                clientPayload: JSON.stringify({
                  courseId,
                  assessmentId,
                  lessonId,
                  kind,
                }),
              },
            );
            const res = await fetch("/api/uploads/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: result.url,
                courseId,
                assessmentId,
                lessonId,
                kind,
                title: f.name,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw Error(data.error);
            setMessage(`${f.name} uploaded.`);
            onUploaded?.(data.id);
            if (kind === "resource") router.refresh();
          } catch (e) {
            setMessage(
              e instanceof Error
                ? e.message
                : "Upload failed. Please try again.",
            );
          } finally {
            setBusy(false);
            onBusy?.(false);
          }
        }}
      />
      <small>PDF, Word, Excel, PowerPoint, JPG or PNG. Maximum 20 MB.</small>
      {message && (
        <span className="text-small" role="status">
          <Upload size={13} style={{ display: "inline", marginRight: 7 }} />
          {message}
        </span>
      )}
    </label>
  );
}
export function AssessmentForm({
  assessment,
}: {
  assessment: {
    id: string;
    courseId: string;
    kind: string;
    questions: { id: string; prompt: string; options: string[] }[];
  };
}) {
  const [fileId, setFileId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const answers = Object.fromEntries(
          assessment.questions.map((q) => [q.id, Number(fd.get(q.id))]),
        );
        start(async () => {
          const r = await mutate("submit", {
            assessmentId: assessment.id,
            fileId,
            answer: String(fd.get("answer") || ""),
            answers,
          });
          setResult(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      {assessment.kind === "lln" ? (
        assessment.questions.map((q, i) => (
          <fieldset className="question" key={q.id}>
            <legend>
              {i + 1}. {q.prompt}
            </legend>
            {q.options.map((o, j) => (
              <label key={j}>
                <input type="radio" name={q.id} value={j} required />
                {o}
              </label>
            ))}
          </fieldset>
        ))
      ) : (
        <>
          <label className="field">
            <span>Your response</span>
            <textarea
              name="answer"
              placeholder="Write your response or add a note about your submission…"
              rows={5}
            />
          </label>
          <FileUpload
            courseId={assessment.courseId}
            assessmentId={assessment.id}
            kind="submission"
            onUploaded={setFileId}
            onBusy={setUploading}
          />
        </>
      )}
      <label className="checkbox">
        <input type="checkbox" required />I confirm this submission is my own
        work.
      </label>
      {result && (
        <div
          className={`notice ${result.ok ? "success" : "error"}`}
          role="status"
        >
          {result.message}
        </div>
      )}
      <button className="button" disabled={pending || uploading}>
        {uploading
          ? "Uploading attachment…"
          : pending
            ? "Submitting…"
            : "Submit assessment"}
        <ArrowRight size={15} />
      </button>
    </form>
  );
}
