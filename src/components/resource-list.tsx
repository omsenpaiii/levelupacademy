import { Download, FileText, Presentation } from "lucide-react";
import { resourceDetails } from "@/lib/resources";
export function ResourceList({
  resources,
}: {
  resources: { id: string; title: string; contentType: string; size: number }[];
}) {
  const order = (title: string) => {
    const types = [
      "Learner guide",
      "Class presentation",
      "Self-study guide",
      "Class activity book",
    ];
    const rank = types.findIndex((type) => title.includes(type));
    return rank < 0 ? types.length : rank;
  };
  const sorted = [...resources].sort(
    (a, b) => order(a.title) - order(b.title) || a.title.localeCompare(b.title),
  );
  return (
    <div className="unit-resource-grid">
      {sorted.map((r) => (
        <a
          className="unit-resource-card"
          key={r.id}
          href={`/api/files/${r.id}`}
        >
          <span className="resource-file-icon">
            {r.contentType.includes("presentation") ? (
              <Presentation size={22} />
            ) : (
              <FileText size={22} />
            )}
          </span>
          <span className="resource-file-copy">
            <strong>{r.title}</strong>
            <small>{resourceDetails(r.contentType, r.size)}</small>
          </span>
          <Download size={17} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
