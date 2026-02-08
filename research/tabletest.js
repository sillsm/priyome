// tabletest.js
// Lightweight table-driven test runner for browser (no deps).
//
// A "table" is an array of PAIRS: [setupObj, expectObj].
//
// Setup object format (flexible):
// {
//   name?: "test name",
//   calls?: [ { fn: "loadFEN", args?: [...] }, ... ]
// }
// Expect object format:
// {
//   gets?: [
//     { fn: "exportFEN", eq?: "...", contains?: "...", regex?: "..." , truthy?: true, falsy?: true },
//     { path: "state.side", eq?: "b" } // property path
//   ]
// }
//
// Parsing supports:
// - JSON array (pairs or {setup,expect} entries)
// - JSON Lines (one JSON object per line), ignoring lines starting with # or //
//
// Exports:
//   parseTableText(text)
//   runTable({ pairs, makeContext, invoke, get, normalize, onEvent })
//   defaultHarnessForInstance(factoryFn)

function isObj(x){ return x && typeof x === "object" && !Array.isArray(x); }

function deepGet(obj, path){
  const parts = String(path||"").split(".").filter(Boolean);
  let cur = obj;
  for (const p of parts){
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function normWS(s){
  return String(s)
    .replace(/\r/g,"")
    .replace(/[ \t]+/g," ")
    .replace(/\s+\n/g,"\n")
    .trim();
}

function safeRegex(src){
  try { return new RegExp(src); } catch { return null; }
}

function asString(v){
  if (typeof v === "string") return v;
  if (v == null) return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function compare(actual, spec, normalize){
  const norm = normalize || ((x)=>x);
  const a = norm(actual);

  if ("eq" in spec) {
    const e = norm(spec.eq);
    return { ok: a === e, msg: `eq | expected=${asString(e)} | actual=${asString(a)}` };
  }
  if ("contains" in spec) {
    const sub = norm(spec.contains);
    const ok = String(a).includes(String(sub));
    return { ok, msg: `contains | expected_sub=${asString(sub)} | actual=${asString(a)}` };
  }
  if ("notContains" in spec) {
    const sub = norm(spec.notContains);
    const ok = !String(a).includes(String(sub));
    return { ok, msg: `notContains | expected_not_sub=${asString(sub)} | actual=${asString(a)}` };
  }
  if ("regex" in spec) {
    const rx = safeRegex(spec.regex);
    if (!rx) return { ok:false, msg:`invalid regex: ${spec.regex}` };
    const ok = rx.test(String(a));
    return { ok, msg: `regex | expected=/${spec.regex}/ | actual=${asString(a)}` };
  }
  if (spec.truthy) return { ok: !!actual, msg:`truthy | actual=${asString(actual)}` };
  if (spec.falsy) return { ok: !actual, msg:`falsy | actual=${asString(actual)}` };
  return { ok:false, msg:`no assertion provided` };
}

export function parseTableText(text){
  const t = String(text||"").trim();
  if (!t) return [];

  // Whole-file JSON
  if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))){
    try {
      const v = JSON.parse(t);
      if (Array.isArray(v) && v.length && Array.isArray(v[0])) return v;
      if (Array.isArray(v) && v.length && isObj(v[0]) && v[0].setup && v[0].expect) {
        return v.map(x => [x.setup, x.expect]);
      }
    } catch {}
  }

  // JSONL
  const pairs = [];
  for (const raw of String(text||"").split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("//")) continue;
    try {
      const v = JSON.parse(line);
      if (Array.isArray(v) && v.length === 2) pairs.push(v);
      else if (isObj(v) && v.setup && v.expect) pairs.push([v.setup, v.expect]);
    } catch {}
  }
  return pairs;
}

export function defaultHarnessForInstance(factoryFn){
  return {
    makeContext: async (setup)=>({ instance: factoryFn(setup) }),
    invoke: async (ctx, fnName, args)=>{
      const inst = ctx.instance;
      const fn = inst?.[fnName];
      if (typeof fn !== "function") throw new Error(`Missing method: ${fnName}`);
      return await fn.apply(inst, args || []);
    },
    get: async (ctx, g)=>{
      if (g.path) return deepGet(ctx.instance, g.path);
      const fn = ctx.instance?.[g.fn];
      if (typeof fn !== "function") throw new Error(`Missing getter: ${g.fn}`);
      return await fn.apply(ctx.instance, g.args || []);
    },
    normalize: (x)=> typeof x === "string" ? normWS(x) : x,
  };
}

export async function runTable({ pairs, makeContext, invoke, get, normalize, onEvent }){
  const results = [];
  const emit = (e)=>{ try { onEvent && onEvent(e); } catch {} };

  for (let i=0; i<pairs.length; i++){
    const [setup, expect] = pairs[i];
    const name = setup?.name || `Test ${i+1}`;
    const startedAt = performance.now();
    const r = { index:i, name, ok:true, steps:[], asserts:[], ms:0 };

    try{
      const ctx = await makeContext(setup);

      const expectError = expect && expect.error ? expect.error : null;
      let caught = null;

      try {
        const calls = setup?.calls || [];
        for (let j=0; j<calls.length; j++){
          const c = calls[j];
          if (!c?.fn) continue;
          emit({ type:"call:start", test:i, call:j, fn:c.fn });
          const ret = await invoke(ctx, c.fn, c.args || []);
          r.steps.push({ fn:c.fn, ret });
          emit({ type:"call:end", test:i, call:j, fn:c.fn, ret });
        }

        const gets = expect?.gets || [];
        for (let k=0; k<gets.length; k++){
          const g = gets[k];
          emit({ type:"assert:start", test:i, assert:k, getter:g.fn||g.path });
          const actual = await get(ctx, g);
          const cmp = compare(actual, g, normalize);
          r.asserts.push({ getter:g.fn||g.path, actual, ok:cmp.ok, msg:cmp.msg });
          if (!cmp.ok) r.ok = false;
          emit({ type:"assert:end", test:i, assert:k, ok:cmp.ok, msg:cmp.msg });
        }
      } catch (err){
        caught = err;
      }

      if (expectError) {
        const msg = (caught && (caught.stack || caught.message)) ? (caught.stack || caught.message) : (caught ? String(caught) : "");
        if (!caught) {
          r.ok = false;
          r.error = `Expected error but none thrown`;
        } else {
          const cmp = compare(msg, expectError, normalize);
          r.asserts.push({ getter:"<error>", actual:msg, ok:cmp.ok, msg:cmp.msg });
          if (!cmp.ok) {
            r.ok = false;
            r.error = `Error did not match expectation: ${cmp.msg}\nActual error:\n${msg}`;
          }
        }
      } else if (caught) {
        r.ok = false;
        r.error = (caught && caught.stack) ? caught.stack : String(caught);
      }
    } catch (err){
      r.ok = false;
      r.error = (err && err.stack) ? err.stack : String(err);
    }

    r.ms = Math.round((performance.now() - startedAt) * 10) / 10;
    results.push(r);
    emit({ type:"test:end", test:i, ok:r.ok, ms:r.ms });
  }

  return results;
}
