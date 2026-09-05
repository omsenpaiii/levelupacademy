"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { CourseCard, Empty } from "./ui";
export function Catalogue({
  courses,
  query = "",
}: {
  courses: {
    id: string;
    slug: string;
    title: string;
    category: string;
    summary: string;
    image: string;
    duration: string | null;
    code: string | null;
  }[];
  query?: string;
}) {
  const [q, setQ] = useState(query);
  const [category, setCategory] = useState("All courses");
  const categories = [
    "All courses",
    ...new Set(courses.map((c) => c.category)),
  ];
  const visible = courses.filter(
    (c) =>
      (category === "All courses" || category === c.category) &&
      `${c.title} ${c.code} ${c.category}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <label className="catalogue-search">
        <Search size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by course name or code"
          aria-label="Search course catalogue"
        />
      </label>
      <div className="filters" role="group" aria-label="Filter by subject">
        {categories.map((c) => (
          <button
            className={`filter-chip ${category === c ? "active" : ""}`}
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="results-label">
        {visible.length} {visible.length === 1 ? "course" : "courses"} to
        explore
      </p>
      {visible.length ? (
        <div className="course-grid">
          {visible.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <Empty
          title="Let’s try another search."
          copy="Search for a subject or choose another category to find your course."
        />
      )}
    </>
  );
}
