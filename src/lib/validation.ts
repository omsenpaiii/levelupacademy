import { z } from "zod";
export const applicationSchema = z.object({
  courseId: z.string().min(1),
  goals: z
    .string()
    .trim()
    .min(10, "Tell us a little more about your goals.")
    .max(3000),
  experience: z.string().trim().max(3000).default(""),
  preferredStart: z.string().max(100).default(""),
  support: z.string().max(3000).default(""),
  consent: z.literal(true),
});
export function scoreAnswers(
  questions: { id: string; options: string[]; correct: number }[],
  answers: Record<string, number>,
) {
  if (!questions.length) throw new Error("This test is not ready.");
  let score = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (!Number.isInteger(a) || a < 0 || a >= q.options.length)
      throw new Error("Answer every question before submitting.");
    if (a === q.correct) score++;
  }
  return Math.round((score / questions.length) * 100);
}
export function videoEmbed(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (["www.youtube.com", "youtube.com", "youtu.be"].includes(u.hostname)) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v") || u.pathname.split("/").pop();
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    }
    if (
      ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(u.hostname)
    ) {
      const id = u.pathname.split("/").pop();
      return id && /^\d+$/.test(id)
        ? `https://player.vimeo.com/video/${id}`
        : null;
    }
    if (u.hostname === "drive.google.com") {
      const id = u.pathname.match(/\/d\/([\w-]+)/)?.[1];
      return id ? `https://drive.google.com/file/d/${id}/preview` : null;
    }
    return null;
  } catch {
    return null;
  }
}
export const uploadTypes: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};
export const maxUpload = 20 * 1024 * 1024;
export function validUpload(name: string, type: string, size: number) {
  return (
    size > 0 &&
    size <= maxUpload &&
    !!uploadTypes[type]?.includes(name.split(".").pop()?.toLowerCase() || "")
  );
}
