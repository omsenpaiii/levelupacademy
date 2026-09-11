export function resourceDetails(contentType: string, size: number) {
  const format =
    contentType === "application/pdf"
      ? "PDF"
      : contentType.includes("presentationml")
        ? "PowerPoint"
        : contentType.includes("wordprocessingml")
          ? "Word"
          : contentType.includes("spreadsheetml")
            ? "Excel"
            : "File";
  return `${format} · ${size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`}`;
}
export function lessonResources<
  T extends {
    assessmentId: string | null;
    lessonId: string | null;
    size: number;
  },
>(resources: T[], lessonId: string) {
  const available = resources.filter((r) => r.size > 0 && !r.assessmentId);
  return {
    unit: available.filter((r) => r.lessonId === lessonId),
    course: available.filter((r) => !r.lessonId),
  };
}

export function resourceFilename(title: string, contentType: string) {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/png": "png",
    "image/jpeg": "jpg",
  };
  const extension = extensions[contentType];
  return extension &&
    !title.toLowerCase().endsWith(`.${extension}`) &&
    !(extension === "jpg" && title.toLowerCase().endsWith(".jpeg"))
    ? `${title}.${extension}`
    : title;
}
