// Run the actual service with isolated database/storage/mail adapters.
// No external mail or production database is accessed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import console from "node:console";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

/* global structuredClone */
const dirname = path.dirname(fileURLToPath(import.meta.url));

function fixture(options = {}) {
  let row = {
    id: 1,
    publicId: "public",
    owner: "owner",
    workerId: "worker",
    status: "RUNNING",
    claimedAt: new Date(1),
    attempts: 0,
    files: [{ id: "file", jobId: 1 }],
    resultToken: null,
  };
  let notifications = 0,
    writes = 0,
    tokens = 0;
  let transactionTail = Promise.resolve();
  const matches = (where) =>
    Object.entries(where).every(([key, value]) =>
      value instanceof Date ? +row[key] === +value : row[key] === value,
    );
  const db = {
    job: {
      findUnique: async () => structuredClone(row),
      updateMany: async ({ where, data }) => {
        options.beforeUpdate?.(row);
        if (!matches(where)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    jobFile: {
      update: async ({ where }) => {
        assert.equal(where.jobId, 1);
        assert.equal(where.id, "file");
        if (options.failFileWrite) throw new Error("file write failed");
        writes++;
      },
    },
    $transaction: (callback) => {
      const result = transactionTail.then(async () => {
        const snapshot = structuredClone(row);
        const previousWrites = writes;
        try {
          return await callback(db);
        } catch (error) {
          row = snapshot;
          writes = previousWrites;
          throw error;
        }
      });
      transactionTail = result.catch(() => {});
      return result;
    },
  };
  const statuses = Object.fromEntries(
    ["RUNNING", "FINISHED", "FAILED", "PENDING", "CANCELLED"].map((s) => [
      s,
      s,
    ]),
  );
  const mocks = {
    "@prisma/client": { Status: statuses, Prisma: {}, Visibility: {} },
    "../lib/prisma": { prisma: db },
    "../lib/storage": {
      jobResultZipKey: () => "zip",
      jobFileTextKey: () => "txt",
      jobFileJsonKey: () => "json",
    },
    "./models": {},
    "../lib/auth": { generateResultToken: () => `token-${++tokens}` },
    "../lib/notify": {
      notifyJobEvent: async () => {
        notifications++;
      },
    },
    "../lib/config": { default: { WORKER_MAX_ATTEMPTS: 3 } },
    "./userSettingsService": { getUserSettings: async () => ({}) },
    "../utils/file": {},
  };
  const source = fs.readFileSync(
    path.join(dirname, "../app/services/jobService.ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, `Unexpected dependency ${name}`);
      return mocks[name];
    },
    Date,
    console,
  });
  return {
    service: exports,
    state: () => ({ row, notifications, writes }),
    set: (data) => Object.assign(row, data),
  };
}

test("50 simultaneous completions send one email and preserve the first token", async () => {
  const f = fixture();
  await Promise.all(
    Array.from({ length: 50 }, () =>
      f.service.completeJob(1, "worker", [
        { id: "file", durationSeconds: 5882 },
      ]),
    ),
  );
  const { row, notifications, writes } = f.state();
  assert.equal(row.status, "FINISHED");
  assert.equal(notifications, 1);
  assert.equal(writes, 1);
  const token = row.resultToken;
  await f.service.completeJob(1, "worker", [{ id: "file" }]);
  assert.equal(f.state().row.resultToken, token);
  assert.equal(f.state().notifications, 1);
});

test("a delayed failure cannot requeue a completed job", async () => {
  const f = fixture();
  await f.service.completeJob(1, "worker");
  await f.service.failJob(1, "worker", "completion response timed out");
  assert.equal(f.state().row.status, "FINISHED");
  assert.equal(f.state().row.attempts, 0);
  assert.equal(f.state().notifications, 1);
});

test("completion rejects another job's file and another worker", async () => {
  const f = fixture();
  await assert.rejects(
    f.service.completeJob(1, "worker", [{ id: "foreign" }]),
    /belong/,
  );
  await assert.rejects(f.service.completeJob(1, "other"), /not found/);
  assert.equal(f.state().row.status, "RUNNING");
  assert.equal(f.state().notifications, 0);
});

test("concurrent terminal failures send only one failure notification", async () => {
  const f = fixture();
  f.set({ attempts: 2 });
  await Promise.all(
    Array.from({ length: 50 }, () => f.service.failJob(1, "worker", "failed")),
  );
  assert.equal(f.state().row.status, "FAILED");
  assert.equal(f.state().row.attempts, 3);
  assert.equal(f.state().notifications, 1);
});

test("completion cannot revive cancelled work", async () => {
  const f = fixture();
  f.set({ status: "CANCELLED" });
  await assert.rejects(f.service.completeJob(1, "worker"), /not running/);
  assert.equal(f.state().notifications, 0);
});

for (const change of [
  { status: "CANCELLED" },
  { workerId: "replacement", claimedAt: new Date(2) },
  { claimedAt: new Date(2) },
]) {
  test(`completion loses a race with ${JSON.stringify(change)}`, async () => {
    const f = fixture({ beforeUpdate: (row) => Object.assign(row, change) });
    await f.service.completeJob(1, "worker", [{ id: "file" }]);
    assert.equal(f.state().notifications, 0);
    assert.equal(f.state().writes, 0);
    assert.equal(f.state().row.resultToken, null);
    for (const [key, value] of Object.entries(change)) {
      assert.deepEqual(f.state().row[key], value);
    }
  });
}

test("a failed result transaction can be retried without premature notification", async () => {
  const options = { failFileWrite: true };
  const f = fixture(options);
  await assert.rejects(
    f.service.completeJob(1, "worker", [{ id: "file" }]), /file write failed/,
  );
  assert.equal(f.state().row.status, "RUNNING");
  assert.equal(f.state().row.resultToken, null);
  assert.equal(f.state().notifications, 0);
  options.failFileWrite = false;
  await f.service.completeJob(1, "worker", [{ id: "file" }]);
  assert.equal(f.state().row.status, "FINISHED");
  assert.equal(f.state().notifications, 1);
});

test("concurrent retryable failures increment attempts only once", async () => {
  const f = fixture();
  await Promise.all(Array.from({ length: 50 }, () =>
    f.service.failJob(1, "worker", "temporary failure"),
  ));
  assert.equal(f.state().row.status, "PENDING");
  assert.equal(f.state().row.attempts, 1);
  assert.equal(f.state().row.workerId, null);
  assert.equal(f.state().notifications, 0);
});
