import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreAnswers,
  videoEmbed,
  validUpload,
  applicationSchema,
} from "../src/lib/validation";
test("LLN rejects incomplete or invalid answers and scores all questions", () => {
  const q = [
    { id: "one", prompt: "one", options: ["a", "b"], correct: 1 },
    { id: "two", prompt: "two", options: ["a", "b"], correct: 0 },
  ];
  assert.equal(scoreAnswers(q, { one: 1, two: 0 }), 100);
  assert.equal(scoreAnswers(q, { one: 0, two: 0 }), 50);
  assert.throws(() => scoreAnswers(q, { one: 1 }));
  assert.throws(() => scoreAnswers(q, { one: 9, two: 0 }));
  assert.throws(() => scoreAnswers([], {}));
});
test("video providers reject arbitrary URLs and javascript", () => {
  assert.equal(videoEmbed("javascript:alert(1)"), null);
  assert.equal(
    videoEmbed("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
    null,
  );
  assert.equal(
    videoEmbed("https://youtu.be/dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  assert.equal(
    videoEmbed("https://vimeo.com/1234"),
    "https://player.vimeo.com/video/1234",
  );
  assert.equal(videoEmbed("http://vimeo.com/1234"), null);
});
test("uploads require matching allowed MIME, extension and size", () => {
  assert.ok(validUpload("work.pdf", "application/pdf", 2000));
  assert.ok(!validUpload("work.html", "text/html", 2000));
  assert.ok(!validUpload("work.exe", "application/pdf", 2000));
  assert.ok(!validUpload("work.pdf", "application/pdf", 21 * 1024 * 1024));
  assert.ok(!validUpload("work.pdf", "application/pdf", 0));
});
test("applications require consent and meaningful goals", () => {
  assert.ok(
    applicationSchema.safeParse({
      courseId: "c",
      goals: "Develop professional English skills",
      consent: true,
    }).success,
  );
  assert.ok(
    !applicationSchema.safeParse({
      courseId: "c",
      goals: "Study",
      consent: false,
    }).success,
  );
});
