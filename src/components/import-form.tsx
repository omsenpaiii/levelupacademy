"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    rows: {
      email: string;
      courseSlug: string;
      status: string;
      error?: string;
    }[];
    message?: string;
    valid?: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function run(commit: boolean) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("commit", String(commit));
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error);
      setResult(data);
      if (commit) {
        setFile(null);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-stack">
      <label className="field">
        <span>Excel workbook</span>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResult(null);
          }}
        />
        <small>
          Maximum 5 MB and 500 rows. Columns: email, courseSlug, status (active
          or revoked).
        </small>
      </label>
      <button
        className="button secondary"
        disabled={!file || busy}
        onClick={() => run(false)}
      >
        {busy ? "Checking…" : "Preview import"}
      </button>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <>
          <div
            className={`notice ${result.valid ? "success" : "error"}`}
            role="status"
          >
            {result.message ||
              `${result.rows.length} rows checked. ${result.valid ? "Ready to import." : "Correct the errors and upload again."}`}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.email}</td>
                    <td>{r.courseSlug}</td>
                    <td>{r.error || r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.valid && file && (
            <button
              className="button"
              disabled={busy}
              onClick={() => run(true)}
            >
              Import {result.rows.length} enrolments
            </button>
          )}
        </>
      )}
    </div>
  );
}
