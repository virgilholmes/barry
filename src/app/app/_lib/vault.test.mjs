import { test } from "node:test";
import assert from "node:assert/strict";
import { secretProblem } from "./vault.ts";

test("PINs: numbers only, 6 or more, not obvious", () => {
  assert.equal(secretProblem("pin", "482915"), null);
  assert.equal(secretProblem("pin", "4829153"), null);
  assert.match(secretProblem("pin", "48291"), /at least 6/);
  assert.match(secretProblem("pin", "48a915"), /only have numbers/);
  for (const weak of ["111111", "121212", "123123", "123456", "987654", "890123", "654321", "159753"]) {
    assert.match(secretProblem("pin", weak) ?? "", /too easy/, weak);
  }
});

test("passwords: 15 or more characters, not one chunk repeated", () => {
  assert.equal(secretProblem("password", "blue river lamp toast"), null);
  assert.match(secretProblem("password", "short words"), /at least 15/);
  assert.match(secretProblem("password", "passwordpassword"), /too easy/);
  assert.match(secretProblem("password", "aaaaaaaaaaaaaaaa"), /too easy/);
  assert.match(secretProblem("password", "abababababababab"), /too easy/);
});
