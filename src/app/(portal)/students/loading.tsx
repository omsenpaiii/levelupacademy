export default function Loading() {
  return (
    <div aria-label="Loading your workspace" role="status">
      <div className="skeleton" style={{ height: 45, width: "60%" }} />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
