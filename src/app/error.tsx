"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h2>Let’s try that again.</h2>
      <p>We couldn’t load this page. Your saved work is safe.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
