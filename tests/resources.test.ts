import test from "node:test";
import assert from "node:assert/strict";
import {
  lessonResources,
  resourceDetails,
  resourceFilename,
} from "../src/lib/resources";
import { validUpload } from "../src/lib/validation";
test("unit resource lists exclude other units, assessments and unfinished uploads", () => {
  const files = [
    { id: "unit", lessonId: "one", assessmentId: null, size: 20 },
    { id: "other", lessonId: "two", assessmentId: null, size: 20 },
    { id: "assessment", lessonId: "one", assessmentId: "a", size: 20 },
    { id: "pending", lessonId: "one", assessmentId: null, size: 0 },
    { id: "shared", lessonId: null, assessmentId: null, size: 20 },
  ];
  const result = lessonResources(files, "one");
  assert.deepEqual(
    result.unit.map((f) => f.id),
    ["unit"],
  );
  assert.deepEqual(
    result.course.map((f) => f.id),
    ["shared"],
  );
});
test("PowerPoint uploads require the actual allowed extension and MIME type", () => {
  const type =
    "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  assert.ok(validUpload("slides.pptx", type, 1024));
  assert.ok(!validUpload("slides.pptm", type, 1024));
  assert.ok(!validUpload("slides.pptx", "application/pdf", 1024));
  assert.equal(resourceDetails(type, 1048576), "PowerPoint · 1.0 MB");
});

test("friendly resource titles download with the correct file extension", () => {
  assert.equal(
    resourceFilename("Unit · Learner guide", "application/pdf"),
    "Unit · Learner guide.pdf",
  );
  assert.equal(resourceFilename("work.pdf", "application/pdf"), "work.pdf");
});
