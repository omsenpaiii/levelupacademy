import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
export function Heading({
  title,
  copy,
  action,
}: {
  title: string;
  copy?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  copy,
  href,
  label,
  icon: Icon = BookOpen,
}: {
  title: string;
  copy: string;
  href?: string;
  label?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={30} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {href && (
        <Link className="button" href={href}>
          {label || "Explore courses"}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function CourseCard({
  course,
  compact = false,
}: {
  course: {
    slug: string;
    title: string;
    category: string;
    image: string;
    duration: string | null;
    summary?: string;
  };
  compact?: boolean;
}) {
  return (
    <Link
      className={`course-card ${compact ? "compact" : ""}`}
      href={`/students/catalogue/${course.slug}`}
    >
      <div className="course-photo">
        <img src={course.image} alt="" loading="lazy" />
      </div>
      <div className="course-card-body">
        <span className="category">{course.category}</span>
        <h3>{course.title}</h3>
        {!compact && <p>{course.summary}</p>}
        <div className="course-card-foot">
          {!compact && <span>{course.duration}</span>}
          <ArrowUpRight size={20} />
        </div>
      </div>
    </Link>
  );
}
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Course progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function DateLabel({ date }: { date: Date | string | null }) {
  return (
    <>
      {date
        ? new Intl.DateTimeFormat("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Australia/Melbourne",
          }).format(new Date(date))
        : "No due date"}
    </>
  );
}
