import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty" style={{ minHeight: "100vh" }}>
      <h1>This page isn’t available.</h1>
      <p>The link may have changed, or you may not have access yet.</p>
      <Link className="button" href="/students">
        Back to your portal
      </Link>
    </main>
  );
}
