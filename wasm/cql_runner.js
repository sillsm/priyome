// cql_runner.js
//
// Public API:
//   - ensureWarmPool(opts?) -> Promise<void>
//   - runCqlWasm(cqlBytes, pgnBytes, argvString, opts?) -> job
//
// IMPORTANT BEHAVIOR (to avoid warm->run instability):
//   - Warm workers NEVER run queries. They only import/initialize the wasm runtime,
//     confirm readiness, then exit.
//   - Query runs ALWAYS happen in a fresh one-shot worker.
//   - "Warm pool of 2" is implemented as 2 warm-tokens, maintained by spawning warmers.
//
// This gives you fast startup without reusing a warmed runtime for actual execution.

let _totalWorkers = 2;   // displayed "pool size" (warm tokens)
let _busyWorkers = 0;    // number of active RUN workers (not warmers)

// --------------------
// Warm token pool
// --------------------

let _warmTokens = 0;                 // 0..2
let _warmEnsuringPromise = null;     // ensureWarmPool in-flight
let _warmTopupPromise = null;        // top-up in-flight

/**
 * Ensure we have 2 warm tokens (i.e., we recently compiled/initialized twice).
 * Warmers exit after readiness confirmation.
 *
 * @param {Object} [opts]
 * @param {string} [opts.cqlJsUrl] default "./wasm/cql.js"
 * @param {string} [opts.baseUrl]  default "./"
 * @param {(line:string)=>void} [opts.onLog]
 */
export async function ensureWarmPool(opts = {}) {
  if (_warmTokens >= 2) return;
  if (_warmEnsuringPromise) return _warmEnsuringPromise;

  const cqlJsUrl = opts.cqlJsUrl ?? new URL("./wasm/cql.js", window.location.href).href;
  const baseUrl  = opts.baseUrl  ?? new URL("./", window.location.href).href;

  _warmEnsuringPromise = (async () => {
    await topUpWarmTokens({ baseUrl, cqlJsUrl, onLog: opts.onLog }, /*forceAwait*/ true);
  })().finally(() => {
    _warmEnsuringPromise = null;
  });

  return _warmEnsuringPromise;
}

function maybeTopUpWarmTokensSoon(opts = {}) {
  // Fire-and-forget top-up; don't spam parallel warmers.
  topUpWarmTokens(opts, /*forceAwait*/ false).catch(() => {});
}

async function topUpWarmTokens({ baseUrl, cqlJsUrl, onLog } = {}, forceAwait) {
  if (_warmTokens >= 2) return;
  if (_warmTopupPromise) return forceAwait ? _warmTopupPromise : undefined;

  _warmTopupPromise = (async () => {
    while (_warmTokens < 2) {
      await runWarmOnce({ baseUrl, cqlJsUrl, onLog });
      _warmTokens++;
      if (typeof onLog === "function") onLog(`[warm] token ${_warmTokens}/2 ready`);
    }
  })().finally(() => {
    _warmTopupPromise = null;
  });

  return forceAwait ? _warmTopupPromise : undefined;
}

function runWarmOnce({ baseUrl, cqlJsUrl, onLog } = {}) {
  return new Promise((resolve, reject) => {
    const { worker, terminate } = spawnWorker({ baseUrl, cqlJsUrl });

    const cleanup = () => {
      worker.removeEventListener("message", onMsg);
      worker.removeEventListener("error", onErr);
      try { terminate(); } catch {}
    };

    const onMsg = (ev) => {
      const m = ev.data || {};
      if (m.type === "log" && typeof onLog === "function") onLog(String(m.line ?? ""));
      if (m.type === "status" && typeof onLog === "function") onLog("[status] " + String(m.status ?? ""));
      if (m.type === "ready") {
        cleanup();
        resolve();
      } else if (m.type === "fatal" || m.type === "error") {
        const err = new Error(String(m.error ?? "warm failed"));
        cleanup();
        reject(err);
      }
    };

    const onErr = (e) => {
      cleanup();
      reject(e);
    };

    worker.addEventListener("message", onMsg);
    worker.addEventListener("error", onErr);

    worker.postMessage({ type: "warm", baseUrl, cqlJsUrl });
  });
}

// --------------------
// Job implementation
// --------------------

/**
 * @typedef {Object} CqlJob
 * @property {string} id
 * @property {"queued"|"running"|"done"|"error"} state
 * @property {number} createdAt
 * @property {number|null} startedAt
 * @property {number|null} endedAt
 * @property {number|null} rc
 * @property {string} stdout
 * @property {string} stderr
 * @property {string} outputPgn
 * @property {string|null} error
 * @property {boolean} outputMissing
 * @property {string[]} events
 * @property {(fn: (job: CqlJob) => void) => () => void} subscribe
 * @property {() => {busy:number,total:number}} status
 * @property {() => void} cancel
 */

export function runCqlWasm(cqlBytes, pgnBytes, argvString, opts = {}) {
  if (!(cqlBytes instanceof Uint8Array)) throw new Error("cqlBytes must be Uint8Array");
  if (!(pgnBytes instanceof Uint8Array)) throw new Error("pgnBytes must be Uint8Array");
  if (typeof argvString !== "string") throw new Error("argvString must be a string");

  const job = createJob();

  const cqlJsUrl = opts.cqlJsUrl ?? new URL("./wasm/cql.js", window.location.href).href;
  const baseUrl  = opts.baseUrl  ?? new URL("./", window.location.href).href;

  const cqlPath  = opts.cqlPath ?? "/work/query.cql";
  const pgnPath  = opts.pgnPath ?? "/work/game.pgn";

  const outputCandidates = opts.outputCandidates ?? [
    "/work/query-out.pgn",
    "/query-out.pgn",
    "query-out.pgn"
  ];

  // Decrement a warm token if available (purely for accounting/logging).
  // This does NOT affect correctness; it just drives top-up behavior.
  if (_warmTokens > 0) _warmTokens--;

  const { worker, terminate } = spawnWorker({ baseUrl, cqlJsUrl });

  let _posted = false;

  job.cancel = () => {
    if (job.state === "done" || job.state === "error") return;
    job.state = "error";
    job.error = "Cancelled";
    job.endedAt = Date.now();
    job.events.push("[cancel] cancelled by user");
    notify(job);

    try { terminate(); } catch {}
    if (_busyWorkers > 0) _busyWorkers--;

    // top-up warm tokens after cancellation
    maybeTopUpWarmTokensSoon({ baseUrl, cqlJsUrl });
  };

  _busyWorkers++;
  job.state = "running";
  job.startedAt = Date.now();
  job.events.push("[state] running");
  notify(job);

  worker.onmessage = (ev) => {
    const m = ev.data || {};
    switch (m.type) {
      case "log": {
        const line = String(m.line ?? "");
        if (line.startsWith("[stderr] ")) job.stderr += line.slice(9) + "\n";
        else job.stdout += line + "\n";
        job.events.push("[log] " + line);
        if (typeof opts.onLog === "function") opts.onLog(line, job);
        notify(job);
        break;
      }
      case "output": {
        job.outputPgn = String(m.text ?? "");
        job.outputMissing = !!m.missing;
        job.events.push(job.outputMissing ? "[output] missing" : "[output] captured");
        notify(job);
        break;
      }
      case "done": {
        job.rc = (typeof m.rc === "number") ? m.rc : null;
        job.state = "done";
        job.endedAt = Date.now();
        job.events.push("[state] done rc=" + String(job.rc));
        notify(job);
        cleanup();
        break;
      }
      case "error":
      case "fatal": {
        job.state = "error";
        job.error = String(m.error ?? "unknown error");
        job.endedAt = Date.now();
        job.events.push("[" + m.type + "] " + job.error);
        notify(job);
        cleanup();
        break;
      }
      case "status": {
        job.events.push("[status] " + String(m.status ?? ""));
        notify(job);
        break;
      }
      default:
        break;
    }
  };

  worker.onerror = (e) => {
    job.state = "error";
    job.error = String(e.message || e);
    job.endedAt = Date.now();
    job.events.push("[worker.error] " + job.error);
    notify(job);
    cleanup();
  };

  // Post run
  const cqlBuf = cqlBytes.slice().buffer;
  const pgnBuf = pgnBytes.slice().buffer;

  _posted = true;
  worker.postMessage(
    {
      type: "run",
      baseUrl,
      cqlJsUrl,
      cqlBytes: cqlBuf,
      pgnBytes: pgnBuf,
      argvString,
      cqlPath,
      pgnPath,
      outputCandidates
    },
    [cqlBuf, pgnBuf]
  );

  return job;

  function cleanup() {
    try { terminate(); } catch {}

    if (_busyWorkers > 0) _busyWorkers--;
    notify(job);

    // After any run completes, top up warm tokens back to 2.
    maybeTopUpWarmTokensSoon({ baseUrl, cqlJsUrl });
  }
}

// --------------------
// Job helpers
// --------------------

function createJob() {
  const subs = new Set();
  /** @type {CqlJob} */
  const job = {
    id: randomId(),
    state: "queued",
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    rc: null,
    stdout: "",
    stderr: "",
    outputPgn: "",
    error: null,
    outputMissing: false,
    events: [],
    subscribe(fn) {
      subs.add(fn);
      try { fn(job); } catch {}
      return () => subs.delete(fn);
    },
    status() {
      return { busy: _busyWorkers, total: _totalWorkers };
    },
    cancel() {}
  };

  job._subs = subs; // internal
  return job;
}

function notify(job) {
  const subs = job._subs;
  if (!subs) return;
  for (const fn of subs) {
    try { fn(job); } catch {}
  }
}

function randomId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

// --------------------
// Worker implementation
// --------------------

function spawnWorker({ baseUrl, cqlJsUrl }) {
  const workerSrc = `
    let _ready = false;
    let _Module = null;
    let _running = false;

    function post(type, payload) {
      self.postMessage(Object.assign({ type }, payload || {}));
    }

    function describeErr(e) {
      if (e instanceof Error) return e.stack || e.message || String(e);
      if (e && typeof e === "object") {
        const parts = [];
        for (const k of ["name","message","errno","code","path","stack"]) {
          if (e[k] != null) parts.push(k + "=" + String(e[k]));
        }
        try { parts.push("json=" + JSON.stringify(e)); } catch {}
        return parts.join(" | ") || "[object Object]";
      }
      return String(e);
    }

    function fsEnsureDir(FS, path) {
      const ap = FS.analyzePath(path);
      if (!ap.exists) FS.mkdir(path);
      const st = FS.stat(path);
      if (!FS.isDir(st.mode)) throw new Error(path + " exists but is not a directory");
    }

    function splitArgv(argvString) {
      const s = (argvString || "").trim();
      if (!s) return [];
      return s.split(/\\s+/);
    }

    async function init(baseUrl, cqlJsUrl) {
      if (_ready) return;

      self.Module = {
        noInitialRun: true,
        __runtimeReady: false,
        print: (text) => post("log", { line: String(text) }),
        printErr: (text) => post("log", { line: "[stderr] " + String(text) }),
        onAbort: (what) => post("log", { line: "[abort] " + String(what) }),
        locateFile: (path) => new URL(path, baseUrl).href,
        setStatus: (s) => post("status", { status: String(s) }),
        onRuntimeInitialized: () => {
          self.Module.__runtimeReady = true;
          _ready = true;
          _Module = self.Module;
          post("status", { status: "Runtime initialized (worker)." });
        }
      };

      try {
        importScripts(cqlJsUrl);
      } catch (e) {
        post("fatal", { error: "Failed to importScripts(cql.js): " + describeErr(e) });
        throw e;
      }

      if (!_ready) {
        for (let i = 0; i < 600 && !_ready; i++) {
          await new Promise(r => setTimeout(r, 10));
        }
      }

      if (!_ready || !_Module || typeof _Module.callMain !== "function" || !_Module.FS) {
        throw new Error("Runtime not ready (Module.callMain/Module.FS missing).");
      }
    }

    async function warm(payload) {
      const { baseUrl, cqlJsUrl } = payload;
      await init(baseUrl, cqlJsUrl);
      post("ready", { ok: true });
      // Warm worker exits immediately (no reuse).
      try { self.close(); } catch {}
    }

    async function run(payload) {
      if (_running) throw new Error("Worker is already running.");
      _running = true;

      const { baseUrl, cqlJsUrl, cqlBytes, pgnBytes, argvString, cqlPath, pgnPath, outputCandidates } = payload;

      await init(baseUrl, cqlJsUrl);

      const FS = _Module.FS;
      fsEnsureDir(FS, "/work");

      post("status", { status: "Writing files into Emscripten FS…" });

      FS.writeFile(cqlPath, new Uint8Array(cqlBytes));
      FS.writeFile(pgnPath, new Uint8Array(pgnBytes));

      post("log", { line: "[FS] wrote " + cqlBytes.byteLength + " bytes to " + cqlPath });
      post("log", { line: "[FS] wrote " + pgnBytes.byteLength + " bytes to " + pgnPath });

      const argv = splitArgv(argvString);

      post("log", { line: "[argv] " + ["cql", ...argv].join(" ") });
      post("status", { status: "Running main(argv)…" });

      let rc = 0;
      try {
        rc = _Module.callMain(argv);
        post("log", { line: "[exit] return code: " + rc });
      } catch (e) {
        post("log", { line: "[callMain exception] " + describeErr(e) });
        throw e;
      }

      // Copy output
      let outText = null;
      for (const p of (outputCandidates || [])) {
        try {
          const ap = FS.analyzePath(p);
          if (ap.exists) {
            const bytes = FS.readFile(p);
            outText = new TextDecoder("utf-8").decode(bytes);
            break;
          }
        } catch {}
      }

      if (outText != null) {
        post("output", { name: "output.pgn", text: outText });
      } else {
        post("output", { name: "output.pgn", text: "", missing: true });
      }

      post("done", { rc });

      // One-shot run worker exits.
      try { self.close(); } catch {}
    }

    self.onmessage = async (ev) => {
      const msg = ev.data || {};
      if (msg.type !== "warm" && msg.type !== "run") return;

      try {
        if (msg.type === "warm") {
          await warm(msg);
          return;
        }
        await run(msg);
      } catch (e) {
        post("error", { error: describeErr(e) });
        // One-shot semantics: exit on failure too.
        try { self.close(); } catch {}
      }
    };
  `;

  const blob = new Blob([workerSrc], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // Revoke after creation; worker already has the script.
  URL.revokeObjectURL(url);

  const terminate = () => {
    try { worker.terminate(); } catch {}
  };

  return { worker, terminate };
}
