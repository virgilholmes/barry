import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("./listen.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup() {
  const instances = [];
  let checks = 0;
  class Recognition {
    constructor() { instances.push(this); }
    start() {}
    stop() { this.onend?.(); }
    abort() { this.onend?.(); }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === "./speech") return { getRecognition: () => Recognition };
      if (name === "@smithy/eventstream-codec") return { EventStreamCodec: class {} };
      if (name === "@smithy/util-utf8") return {};
      throw new Error(name);
    },
    window: { AudioWorkletNode: class {} },
    navigator: { language: "en-US", mediaDevices: { getUserMedia() {} } },
    fetch: async () => { checks++; return { ok: true, json: async () => ({ enabled: false }) }; },
  });
  return { start: exports.startListening, instances, checks: () => checks };
}

function handlers(errors = [], finals = []) {
  return { onPartial() {}, onFinal: (text) => finals.push(text), onError: (message) => errors.push(message) };
}

test("network failures are reported and do not restart recognition silently", async () => {
  const app = setup();
  const errors = [];
  const listener = await app.start("room", handlers(errors));
  app.instances[0].onerror({ error: "network" });
  assert.match(errors[0], /couldn't connect/);
  assert.equal(app.instances.length, 1);
  await listener.stop();
});

test("silence restarts recognition, while deliberate stop does not", async () => {
  const app = setup();
  const errors = [];
  const listener = await app.start("room", handlers(errors));
  app.instances[0].onerror({ error: "no-speech" });
  app.instances[0].onend();
  assert.equal(app.instances.length, 2);
  assert.equal(errors.length, 0);
  await listener.stop();
  assert.equal(app.instances.length, 2);
});

test("a new session rechecks Transcribe availability", async () => {
  const app = setup();
  (await app.start("room", handlers())).abort();
  (await app.start("room", handlers())).abort();
  assert.equal(app.checks(), 2);
});

test("final speech is delivered before stopping", async () => {
  const app = setup();
  const finals = [];
  const listener = await app.start("room", handlers([], finals));
  const result = Object.assign([{ transcript: "Hello doctor" }], { isFinal: true });
  app.instances[0].onresult({ results: [result] });
  await listener.stop();
  assert.deepEqual(finals, ["Hello doctor"]);
});
