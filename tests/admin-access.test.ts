import { test } from "node:test";
import assert from "node:assert/strict";
import { isApprovedAdmin } from "../src/lib/admin-access";
test("admin eligibility requires a verified exact email match", () => {
  const list = " owner@example.com,SECOND@example.com ";
  assert.equal(isApprovedAdmin("Owner@example.com", true, list), true);
  assert.equal(isApprovedAdmin("second@example.com", true, list), true);
  assert.equal(isApprovedAdmin("owner@example.com", false, list), false);
  assert.equal(
    isApprovedAdmin("owner@example.com.evil.test", true, list),
    false,
  );
  assert.equal(isApprovedAdmin("outsider@example.com", true, list), false);
  assert.equal(isApprovedAdmin("owner@example.com", true), false);
  assert.equal(isApprovedAdmin("", true, ","), false);
});
