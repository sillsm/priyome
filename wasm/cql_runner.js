// cql_runner.js
//
// Public API: runCqlWasm(cqlBytes, pgnBytes, argvString, opts?)
//
//
// Design goals:
// - Single, documented public API entry point.
// - Non-blocking: returns a "job" immediately and fills it in via worker messages.
// - Ready for a future worker pool: job.status() reports engaged/total.
// - Keeps HTML dumb: HTML just calls the API and renders job updates.
//
// Notes:
// - This file currently uses "one-shot worker per job" (like your current HTML).
// - Later you can replace spawnWorker() with a pooled worker manager without changing
//   the runCqlWasm signature or the job shape.

let _totalWorkers = 1;   // pool size (future). Right now: conceptual 1
let _busyWorkers = 0;    // incremented while job running

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
 * @property {string[]} events  // simple event log, optional to render
 * @property {(fn: (job: CqlJob) => void) => () => void} subscribe
 * @property {() => {busy:number,total:number}} status
 * @property {() => void} cancel
 */

/**
 * Run the CQL wasm binary inside a Web Worker, passing bytes for:
 *  - CQL query file
 *  - PGN input file
 * and the *full argv string* you want passed to the wasm main
 * (it will be split on whitespace inside the worker).
 *
 * The function returns immediately with a mutable job object. The job fields
 * are updated as messages arrive.
 *
 * @param {Uint8Array} cqlBytes
 * @param {Uint8Array} pgnBytes
 * @param {string} argvString  e.g. "-q /work/query.cql -game /work/game.pgn"
 * @param {Object} [opts]
 * @param {string} [opts.cqlJsUrl]  default "./cql.js"
 * @param {string} [opts.baseUrl]   default "./"
 * @param {string} [opts.cqlPath]   default "/work/query.cql"
 * @param {string} [opts.pgnPath]   default "/work/game.pgn"
 * @param {string[]} [opts.outputCandidates] default ["/work/query-out.pgn","/query-out.pgn","query-out.pgn"]
 * @param {(line:string, job:CqlJob)=>void} [opts.onLog] optional streaming callback
 * @returns {CqlJob}
 */
export function runCqlWasm(cqlBytes, pgnBytes, argvString, opts = {}) {
  if (!(cqlBytes instanceof Uint8Array)) throw new Error("cqlBytes must be Uint8Array");
  if (!(pgnBytes instanceof Uint8Array)) throw new Error("pgnBytes must be Uint8Array");
  if (typeof argvString !== "string") throw new Error("argvString must be a string");

  const job = createJob();

  // Options with defaults
  const cqlJsUrl = opts.cqlJsUrl ?? new URL("./cql.js", window.location.href).href;
  const baseUrl  = opts.baseUrl  ?? new URL("./", window.location.href).href;

  const cqlPath  = opts.cqlPath ?? "/work/query.cql";
  const pgnPath  = opts.pgnPath ?? "/work/game.pgn";

  const outputCandidates = opts.outputCandidates ?? [
    "/work/query-out.pgn",
    "/query-out.pgn",
    "query-out.pgn"
  ];

  // Transfer ArrayBuffers to worker (zero-copy)
  // IMPORTANT: we copy to fresh buffers so callers can reuse their Uint8Array safely
  // without being detached by postMessage transfer.
  const cqlBuf = cqlBytes.slice().buffer;
  const pgnBuf = pgnBytes.slice().buffer;

  const { worker, terminate } = spawnWorker({
    baseUrl,
    cqlJsUrl,
    cqlPath,
    pgnPath,
    outputCandidates
  });

  job.cancel = () => {
    if (job.state === "done" || job.state === "error") return;
    job.state = "error";
    job.error = "Cancelled";
    job.endedAt = Date.now();
    job.events.push("[cancel] cancelled by user");
    notify(job);
    terminate();
    // release busy marker if needed
    if (_busyWorkers > 0) _busyWorkers--;
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
        // Stream to stdout vs stderr (worker tags stderr lines already)
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
        // optional; we keep it as an event for observability
        job.events.push("[status] " + String(m.status ?? ""));
        notify(job);
        break;
      }
      default: {
        // ignore unknown message types
        break;
      }
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

  // Kick it off
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
    terminate();
    if (_busyWorkers > 0) _busyWorkers--;
    notify(job);
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
      // immediate initial call
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

function spawnWorker({ baseUrl, cqlJsUrl, cqlPath, pgnPath, outputCandidates }) {
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
      // Simple split on whitespace. If you later need quoting rules,
      // replace this with a small shell-like tokenizer.
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
        for (let i = 0; i < 200 && !_ready; i++) {
          await new Promise(r => setTimeout(r, 10));
        }
      }

      if (!_ready || !_Module || typeof _Module.callMain !== "function" || !_Module.FS) {
        throw new Error("Runtime not ready (Module.callMain/Module.FS missing).");
      }
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

      // Copy output before teardown
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
    }

    self.onmessage = async (ev) => {
      const msg = ev.data || {};
      if (msg.type !== "run") return;

      try {
        await run(msg);
      } catch (e) {
        post("error", { error: describeErr(e) });
      } finally {
        // One-shot worker per run
        try { self.close(); } catch {}
      }
    };
  `;

  const blob = new Blob([workerSrc], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);

  const terminate = () => {
    try { worker.terminate(); } catch {}
  };

  return { worker, terminate };
      }
