import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, isQuestion } from "./route.ts";

const known = {
  name: "Sam",
  conditions: "Cerebral palsy",
  medications: "Baclofen 10 mg twice a day.",
  allergies: "Penicillin (hives)",
  communication: [],
  communicationNotes: "",
  supporter: "My mom, Dana",
};
const unknown = { ...known, allergies: "", medications: "" };

test("answers from known facts", () => {
  assert.deepEqual(classify("Any allergies?", known), { route: "answer", answer: "Allergies: Penicillin (hives)." });
  assert.deepEqual(classify("so, what meds are you on", known), {
    route: "answer",
    answer: "Medicines: Baclofen 10 mg twice a day.",
  });
  assert.equal(classify("Who helps you make decisions?", known).route, "answer");
});

test("asks the patient when Barry doesn't know", () => {
  assert.deepEqual(classify("Any allergies?", unknown), { route: "ask", kind: "yesno" });
  assert.deepEqual(classify("How bad is your pain from 0 to 10", known), { route: "ask", kind: "scale" });
  assert.deepEqual(classify("Has your heart rate been high", known), { route: "ask", kind: "yesno" });
  assert.deepEqual(classify("How have you been sleeping?", known), { route: "ask", kind: "open" });
});

test("never answers a decision", () => {
  assert.deepEqual(classify("Would you like to try a new medicine?", known), { route: "decide" });
  assert.deepEqual(classify("I'd like to examine you, is that okay", known), { route: "decide" });
  assert.deepEqual(classify("Do you want to stop the baclofen?", known), { route: "decide" });
});

test("spots questions without punctuation", () => {
  assert.ok(isQuestion("um so do you have any allergies"));
  assert.ok(isQuestion("You've been feeling better?"));
  assert.ok(!isQuestion("Let me take a look at your chart"));
});
