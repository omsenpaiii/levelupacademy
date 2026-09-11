"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, FileUpload, type FieldSpec } from "./forms";
const yes = (name: string, label: string): FieldSpec => ({
  name,
  label,
  type: "checkbox",
});
export function CourseEditor({ course }: { course: Record<string, unknown> }) {
  return (
    <ActionForm
      action="admin.course"
      initial={course}
      fields={[
        { name: "title", label: "Course title", required: true },
        { name: "slug", label: "URL slug", required: true },
        { name: "code", label: "Course code" },
        { name: "category", label: "Category", required: true },
        {
          name: "summary",
          label: "Short description",
          type: "textarea",
          required: true,
        },
        {
          name: "description",
          label: "Course overview",
          type: "textarea",
          required: true,
        },
        { name: "duration", label: "Duration" },
        { name: "delivery", label: "Delivery mode" },
        { name: "requirements", label: "Entry requirements", type: "textarea" },
        {
          name: "sourceUrl",
          label: "Official course URL",
          type: "url",
          required: true,
        },
        {
          name: "image",
          label: "Course image path",
          hint: "Use an imported image from /images/.",
        },
        yes("published", "Show in student catalogue"),
        yes("archived", "Archive this course"),
      ]}
    />
  );
}
export function LessonEditor({
  courseId,
  modules,
  lesson,
}: {
  courseId: string;
  modules: { id: string; title: string }[];
  lesson?: Record<string, unknown>;
}) {
  return (
    <ActionForm
      action="admin.lesson"
      initial={{
        courseId,
        title: "",
        body: "",
        videoUrl: "",
        position: 0,
        moduleId: null,
        published: false,
        ...lesson,
      }}
      fields={[
        { name: "title", label: "Lesson title", required: true },
        {
          name: "moduleId",
          label: "Module",
          type: "select",
          options: [
            { value: "", label: "Ungrouped lessons" },
            ...modules.map((m) => ({ value: m.id, label: m.title })),
          ],
        },
        { name: "position", label: "Order", type: "number" },
        { name: "body", label: "Lesson content", type: "textarea" },
        {
          name: "videoUrl",
          label: "Video link",
          type: "url",
          hint: "YouTube, Vimeo or Google Drive. Use a share link with viewing permissions configured.",
        },
        yes("published", "Publish this lesson"),
      ]}
      label={lesson ? "Save lesson" : "Add lesson"}
    />
  );
}
export function AssessmentEditor({
  courseId,
  assessment,
}: {
  courseId: string;
  assessment?: Record<string, unknown>;
}) {
  const [questions, setQuestions] = useState<
    { id: string; prompt: string; options: string[]; correct: number }[]
  >(
    (assessment?.questions as {
      id: string;
      prompt: string;
      options: string[];
      correct: number;
    }[]) || [],
  );
  return (
    <ActionForm
      action="admin.assessment"
      initial={{
        courseId,
        title: "",
        instructions: "",
        kind: "assignment",
        passPercent: 60,
        published: false,
        dueAt: null,
        ...assessment,
        questions,
      }}
      fields={[
        { name: "title", label: "Assessment title", required: true },
        {
          name: "kind",
          label: "Activity type",
          type: "select",
          options: [
            { value: "assignment", label: "Assignment — trainer reviewed" },
            { value: "lln", label: "LLN — scored questions" },
          ],
        },
        {
          name: "instructions",
          label: "Student instructions",
          type: "textarea",
          required: true,
        },
        { name: "dueAt", label: "Due date", type: "date" },
        {
          name: "passPercent",
          label: "LLN passing percentage",
          type: "number",
        },
        yes("published", "Publish approved assessment"),
      ]}
      label={assessment ? "Save assessment" : "Add assessment"}
    >
      <details
        className="question-builder"
        open={assessment?.kind === "lln" || undefined}
      >
        <summary>
          LLN question builder{" "}
          <span className="muted">· {questions.length} questions</span>
        </summary>
        <p className="text-small muted">
          For scored LLN activities. Add the approved questions and select one
          correct answer for each. Assignments do not need these questions.
        </p>
        {questions.map((q, i) => (
          <fieldset className="question" key={q.id}>
            <legend>Question {i + 1}</legend>
            <label className="field">
              <span>Question text</span>
              <textarea
                value={q.prompt}
                onChange={(e) =>
                  setQuestions(
                    questions.map((item, n) =>
                      n === i ? { ...item, prompt: e.target.value } : item,
                    ),
                  )
                }
                rows={3}
              />
            </label>
            <div className="form-stack">
              {q.options.map((option, j) => (
                <div className="answer-editor" key={j}>
                  <label className="correct-answer">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correct === j}
                      onChange={() =>
                        setQuestions(
                          questions.map((item, n) =>
                            n === i ? { ...item, correct: j } : item,
                          ),
                        )
                      }
                    />
                    <span className="sr-only">
                      Correct answer: option {j + 1} for question {i + 1}
                    </span>
                  </label>
                  <input
                    aria-label={`Option ${j + 1} for question ${i + 1}`}
                    value={option}
                    placeholder={`Answer option ${j + 1}`}
                    onChange={(e) =>
                      setQuestions(
                        questions.map((item, n) =>
                          n === i
                            ? {
                                ...item,
                                options: item.options.map((o, k) =>
                                  k === j ? e.target.value : o,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    disabled={q.options.length <= 2}
                    aria-label={`Remove option ${j + 1} from question ${i + 1}`}
                    onClick={() =>
                      setQuestions(
                        questions.map((item, n) =>
                          n === i
                            ? {
                                ...item,
                                options: item.options.filter((_, k) => k !== j),
                                correct:
                                  item.correct === j
                                    ? 0
                                    : item.correct > j
                                      ? item.correct - 1
                                      : item.correct,
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary small"
                disabled={q.options.length >= 6}
                onClick={() =>
                  setQuestions(
                    questions.map((item, n) =>
                      n === i
                        ? { ...item, options: [...item.options, ""] }
                        : item,
                    ),
                  )
                }
              >
                <Plus size={14} />
                Add answer option
              </button>
              <button
                type="button"
                className="button ghost small"
                onClick={() =>
                  setQuestions(questions.filter((_, n) => n !== i))
                }
              >
                Remove question
              </button>
            </div>
            <small className="muted">
              The selected radio button marks the correct answer.
            </small>
          </fieldset>
        ))}
        <button
          type="button"
          className="button secondary small"
          onClick={() =>
            setQuestions([
              ...questions,
              {
                id: crypto.randomUUID(),
                prompt: "",
                options: ["", ""],
                correct: 0,
              },
            ])
          }
        >
          <Plus size={14} />
          Add question
        </button>
      </details>
    </ActionForm>
  );
}
export function ResourceUpload({
  courseId,
  assessmentId,
  lessonId,
}: {
  courseId: string;
  assessmentId?: string;
  lessonId?: string;
}) {
  return (
    <FileUpload
      courseId={courseId}
      assessmentId={assessmentId}
      lessonId={lessonId}
      kind="resource"
    />
  );
}
